from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Enum, JSON, Float
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

class UserRole(str, enum.Enum):
    SUPER_ADMIN = "SUPER_ADMIN"
    ADMIN_B2C = "ADMIN_B2C"
    AGENT = "AGENT"

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    role = Column(Enum(UserRole), default=UserRole.AGENT)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class SurveyQuestion(Base):
    __tablename__ = "survey_questions"
    id = Column(Integer, primary_key=True, index=True)
    text = Column(String)
    type = Column(String) # text, select, image
    phase = Column(String) # pre_meeting, post_meeting
    options = Column(JSON, nullable=True) # For select type
    created_at = Column(DateTime, default=datetime.utcnow)

class SurveySubmission(Base):
    __tablename__ = "survey_submissions"
    id = Column(Integer, primary_key=True, index=True)
    agent_id = Column(Integer, ForeignKey("users.id"))
    client_name = Column(String)
    client_contact = Column(String)
    responses = Column(JSON)
    image_paths = Column(JSON) # List of image filenames
    timestamp = Column(DateTime, default=datetime.utcnow)

class AgentLocation(Base):
    __tablename__ = "agent_locations"
    id = Column(Integer, primary_key=True, index=True)
    agent_id = Column(Integer, ForeignKey("users.id"))
    lat = Column(Float)
    lng = Column(Float)
    timestamp = Column(DateTime, default=datetime.utcnow)

class Notification(Base):
    __tablename__ = "notifications"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True) # Null for broadcast to all admins
    message = Column(String)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class PasswordResetOTP(Base):
    __tablename__ = "password_reset_otps"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, index=True)
    otp = Column(String)
    expires_at = Column(DateTime)
