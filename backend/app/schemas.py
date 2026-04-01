from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from .models import UserRole
from datetime import datetime

class UserBase(BaseModel):
    email: EmailStr
    name: str = Field(..., min_length=2, max_length=100)
    role: UserRole
    is_active: Optional[bool] = True

class UserCreate(UserBase):
    password: str = Field(..., min_length=6, max_length=128)

class UserUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    email: Optional[EmailStr] = None
    password: Optional[str] = Field(None, min_length=6, max_length=128)
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None

class UserOut(UserBase):
    id: int
    created_at: datetime
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenPayload(BaseModel):
    sub: Optional[int] = None

class SurveyQuestionBase(BaseModel):
    text: str = Field(..., min_length=3, max_length=500)
    type: str = Field(..., pattern=r"^(text|textarea|select|image)$")
    phase: str = Field(..., pattern=r"^(pre_meeting|post_meeting)$")
    options: Optional[List[str]] = None

class SurveyQuestionOut(SurveyQuestionBase):
    id: int
    class Config:
        from_attributes = True
