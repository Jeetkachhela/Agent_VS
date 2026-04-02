from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from .db.session import db
from .schemas import UserRole
from .core.security import get_password_hash
from .api.endpoints import auth, agents, surveys, locations, metrics, chatbot, notifications
from fastapi.staticfiles import StaticFiles
import os
import logging

# Configure Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger("kanan_ops")

# No tables to create in MongoDB

app = FastAPI(title="Kanan Agent Visit Survey System", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize a default super admin if none exists
@app.on_event("startup")
def create_initial_super_admin():
    import datetime
    try:
        admin = db.users.find_one({"role": UserRole.SUPER_ADMIN.value})
        if not admin:
            new_admin = {
                "name": "Super Admin",
                "email": "admin@kanan.com",
                "hashed_password": get_password_hash("admin123"),
                "role": UserRole.SUPER_ADMIN.value,
                "is_active": True,
                "created_at": datetime.datetime.utcnow()
            }
            db.users.insert_one(new_admin)
            print("Initial super admin created: admin@kanan.com / admin123")
    except Exception as e:
        logger.error(f"Failed to create initial super admin during startup: {e}")

# Create uploads directory safely for serverless environments (like Vercel)
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
    # dev sync
