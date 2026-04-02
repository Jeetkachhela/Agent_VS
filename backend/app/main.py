from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from .db.session import db
from .schemas import UserRole
from .core.security import get_password_hash
from .api.endpoints import auth, agents, surveys, locations, metrics, chatbot, notifications
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import os
import logging
from datetime import datetime, timezone

# Configure Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger("kanan_ops")


def create_initial_super_admin():
    """Only create a seed admin if SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD are set."""
    seed_email = os.getenv("SEED_ADMIN_EMAIL")
    seed_password = os.getenv("SEED_ADMIN_PASSWORD")

    if not seed_email or not seed_password:
        logger.info("No SEED_ADMIN_EMAIL/SEED_ADMIN_PASSWORD set. Skipping seed admin creation.")
        return

    try:
        admin = db.users.find_one({"email": seed_email})
        if not admin:
            new_admin = {
                "name": "Super Admin",
                "email": seed_email,
                "hashed_password": get_password_hash(seed_password),
                "role": UserRole.SUPER_ADMIN.value,
                "is_active": True,
                "created_at": datetime.now(timezone.utc)
            }
            db.users.insert_one(new_admin)
            logger.info(f"Initial super admin created: {seed_email}")
        else:
            logger.info(f"Seed admin already exists: {seed_email}")
    except Exception as e:
        logger.error(f"Failed to create initial super admin during startup: {e}")


def load_kanan_data():
    """Load Excel data into MongoDB for chatbot RAG if not already loaded."""
    try:
        count = db.kanan_accounts.count_documents({})
        if count > 0:
            logger.info(f"Kanan accounts data already loaded ({count} records). Skipping.")
            return

        import pandas as pd
        # Try multiple possible paths for the data file
        possible_paths = [
            "K Apply - Accounts Dump - 18.03.2026 (1).xlsx",
            "../K Apply - Accounts Dump - 18.03.2026 (1).xlsx",
            os.path.join(os.path.dirname(__file__), "..", "..", "K Apply - Accounts Dump - 18.03.2026 (1).xlsx"),
        ]

        df = None
        for path in possible_paths:
            if os.path.exists(path):
                df = pd.read_excel(path)
                logger.info(f"Found data file at: {path}")
                break

        if df is None:
            logger.warning("Kanan accounts Excel file not found. Chatbot will work without RAG data.")
            return

        # Clean NaTs (which cause MongoDB/Timezone errors)
        for col in df.select_dtypes(include=['datetime64']).columns:
            df[col] = df[col].astype(object).where(df[col].notna(), None)

        # Clean and insert
        records = df.fillna("").to_dict("records")
        if records:
            db.kanan_accounts.insert_many(records)
            # Create text index for search
            db.kanan_accounts.create_index([
                ("K-Apply Account Name", "text"),
                ("City", "text"),
                ("State", "text"),
                ("RM Name", "text"),
                ("BDM", "text"),
                ("Zone", "text"),
                ("Region", "text"),
                ("Team", "text"),
            ])
            logger.info(f"Loaded {len(records)} Kanan accounts into MongoDB for chatbot RAG.")
    except Exception as e:
        logger.warning(f"Could not load Kanan data: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    create_initial_super_admin()
    load_kanan_data()
    yield
    # Shutdown (nothing needed)


app = FastAPI(title="Kanan Agent Visit Survey System", version="1.0.0", lifespan=lifespan)

# CORS: Use env var or restrictive defaults
cors_origins_str = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000")
cors_origins = [origin.strip() for origin in cors_origins_str.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create uploads directory safely for serverless environments
UPLOAD_DIR = "app/uploads"
try:
    if not os.path.exists(UPLOAD_DIR):
        os.makedirs(UPLOAD_DIR)
    app.mount("/static", StaticFiles(directory=UPLOAD_DIR), name="static")
except OSError:
    logger.warning("Running in a read-only filesystem. Local uploads will not be persisted.")

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(agents.router, prefix="/api/agents", tags=["agents"])
app.include_router(surveys.router, prefix="/api/surveys", tags=["surveys"])
app.include_router(locations.router, prefix="/api/locations", tags=["locations"])
app.include_router(metrics.router, prefix="/api/metrics", tags=["metrics"])
app.include_router(chatbot.router, prefix="/api/chatbot", tags=["chatbot"])
app.include_router(notifications.router, prefix="/api/notifications", tags=["notifications"])

@app.get("/")
def read_root():
    return {"status": "ok", "message": "Kanan Agent Visit API is running"}
