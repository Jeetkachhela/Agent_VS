from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from .db.session import engine, get_db, SessionLocal
from .models import Base, User, UserRole
from .core.security import get_password_hash
from sqlalchemy.orm import Session
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

# Create tables
Base.metadata.create_all(bind=engine)

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
    db = SessionLocal()
    try:
        admin = db.query(User).filter(User.role == UserRole.SUPER_ADMIN).first()
        if not admin:
            new_admin = User(
                name="Super Admin",
                email="admin@kanan.com",
                hashed_password=get_password_hash("admin123"),
                role=UserRole.SUPER_ADMIN,
                is_active=True
            )
            db.add(new_admin)
            db.commit()
            print("Initial super admin created: admin@kanan.com / admin123")
    finally:
        db.close()

# Create uploads directory if not exists
if not os.path.exists("app/uploads"):
    os.makedirs("app/uploads")

app.mount("/static", StaticFiles(directory="app/uploads"), name="static")

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
