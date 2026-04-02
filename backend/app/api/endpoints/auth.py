from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from pymongo.database import Database
from datetime import timedelta
from ...db.session import get_db
from ...core.security import verify_password, create_access_token
from ...schemas import Token, UserOut, UserRole

router = APIRouter()

@router.post("/login", response_model=Token)
def login_access_token(
    db: Database = Depends(get_db), form_data: OAuth2PasswordRequestForm = Depends()
) -> Token:
    user = db.users.find_one({"email": form_data.username})
    if not user or not verify_password(form_data.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    elif not user.get("is_active", True):
        raise HTTPException(status_code=400, detail="Inactive user")
    
    access_token_expires = timedelta(minutes=480)
    return {
        "access_token": create_access_token(str(user["_id"]), expires_delta=access_token_expires),
        "token_type": "bearer",
    }

# Importing from api.deps instead of models/Base
from ..deps import get_current_active_user

@router.get("/me", response_model=UserOut)
def read_current_user(current_user: UserOut = Depends(get_current_active_user)):
    return current_user

from ...schemas import UserCreate
from ...core.security import get_password_hash

@router.post("/register", response_model=UserOut)
def register(
    user_in: UserCreate,
    db: Database = Depends(get_db)
) -> UserOut:
    user = db.users.find_one({"email": user_in.email})
    if user:
        raise HTTPException(status_code=400, detail="User with this email already exists")
    
    # Use the role selected by the user during registration
    try:
        user_role = UserRole(user_in.role)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid role selected")
    
    from datetime import datetime
    new_user = {
        "email": user_in.email,
        "name": user_in.name,
        "hashed_password": get_password_hash(user_in.password),
        "role": user_role.value,
        "is_active": True,
        "created_at": datetime.utcnow()
    }
    result = db.users.insert_one(new_user)
    new_user["id"] = str(result.inserted_id)
    return UserOut(**new_user)

from pydantic import BaseModel
import random
from datetime import datetime, timedelta

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    email: str
    otp: str
    new_password: str

@router.post("/forgot-password")
def forgot_password(
    data: ForgotPasswordRequest,
    db: Database = Depends(get_db)
):
    user = db.users.find_one({"email": data.email})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    otp = str(random.randint(100000, 999999))
    expires_at = datetime.utcnow() + timedelta(minutes=15)
    
    reset_entry = {
        "email": data.email, 
        "otp": otp, 
        "expires_at": expires_at
    }
    db.password_reset_otps.insert_one(reset_entry)
    
    print(f"\n{'='*40}\n[EMAIL SIMULATION] To: {data.email}\nYour Kanan Password Reset OTP is: {otp}\nIt expires in 15 minutes.\n{'='*40}\n")
    
    return {"status": "success", "message": "OTP sent to email"}

@router.post("/reset-password")
def reset_password(
    data: ResetPasswordRequest,
    db: Database = Depends(get_db)
):
    # Verify OTP
    otp_record = db.password_reset_otps.find_one(
        {"email": data.email, "otp": data.otp},
        sort=[("_id", -1)]
    )
        
    if not otp_record:
        raise HTTPException(status_code=400, detail="Invalid OTP")
        
    if otp_record["expires_at"] < datetime.utcnow():
        raise HTTPException(status_code=400, detail="OTP has expired")
        
    if len(data.new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters")
        
    user = db.users.find_one({"email": data.email})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    db.users.update_one(
        {"_id": user["_id"]}, 
        {"$set": {"hashed_password": get_password_hash(data.new_password)}}
    )
    # Invalidate OTP by deleting it
    db.password_reset_otps.delete_one({"_id": otp_record["_id"]})
    
    return {"status": "success", "message": "Password updated successfully. You can now login."}
