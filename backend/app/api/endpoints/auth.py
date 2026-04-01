from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta
from ...db.session import get_db
from ...models import User, UserRole
from ...core.security import verify_password, create_access_token
from ...schemas import Token, UserOut

router = APIRouter()

@router.post("/login", response_model=Token)
def login_access_token(
    db: Session = Depends(get_db), form_data: OAuth2PasswordRequestForm = Depends()
) -> Token:
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    elif not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    
    access_token_expires = timedelta(minutes=480)
    return {
        "access_token": create_access_token(user.id, expires_delta=access_token_expires),
        "token_type": "bearer",
    }

# Importing from api.deps instead of models/Base
from ..deps import get_current_active_user

@router.get("/me", response_model=UserOut)
def read_current_user(current_user: User = Depends(get_current_active_user)):
    return current_user

from ...schemas import UserCreate
from ...core.security import get_password_hash

@router.post("/register", response_model=UserOut)
def register(
    user_in: UserCreate,
    db: Session = Depends(get_db)
) -> UserOut:
    user = db.query(User).filter(User.email == user_in.email).first()
    if user:
        raise HTTPException(status_code=400, detail="User with this email already exists")
    
    # Use the role selected by the user during registration
    try:
        user_role = UserRole(user_in.role)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid role selected")
    
    new_user = User(
        email=user_in.email,
        name=user_in.name,
        hashed_password=get_password_hash(user_in.password),
        role=user_role,
        is_active=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

from pydantic import BaseModel
import random
from datetime import datetime, timedelta
from ...models import PasswordResetOTP

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    email: str
    otp: str
    new_password: str

@router.post("/forgot-password")
def forgot_password(
    data: ForgotPasswordRequest,
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.email == data.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    otp = str(random.randint(100000, 999999))
    expires_at = datetime.utcnow() + timedelta(minutes=15)
    
    reset_entry = PasswordResetOTP(email=data.email, otp=otp, expires_at=expires_at)
    db.add(reset_entry)
    db.commit()
    
    print(f"\n{'='*40}\n[EMAIL SIMULATION] To: {data.email}\nYour Kanan Password Reset OTP is: {otp}\nIt expires in 15 minutes.\n{'='*40}\n")
    
    return {"status": "success", "message": "OTP sent to email"}

@router.post("/reset-password")
def reset_password(
    data: ResetPasswordRequest,
    db: Session = Depends(get_db)
):
    # Verify OTP
    otp_record = db.query(PasswordResetOTP)\
        .filter(PasswordResetOTP.email == data.email, PasswordResetOTP.otp == data.otp)\
        .order_by(PasswordResetOTP.id.desc()).first()
        
    if not otp_record:
        raise HTTPException(status_code=400, detail="Invalid OTP")
        
    if otp_record.expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="OTP has expired")
        
    if len(data.new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters")
        
    user = db.query(User).filter(User.email == data.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    user.hashed_password = get_password_hash(data.new_password)
    # Invalidate OTP by deleting it
    db.delete(otp_record)
    db.commit()
    
    return {"status": "success", "message": "Password updated successfully. You can now login."}
