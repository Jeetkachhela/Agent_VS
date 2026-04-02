import enum
from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime

class UserRole(str, enum.Enum):
    SUPER_ADMIN = "SUPER_ADMIN"
    ADMIN_B2C = "ADMIN_B2C"
    AGENT = "AGENT"

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
    id: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenPayload(BaseModel):
    sub: Optional[str] = None

class SurveyQuestionBase(BaseModel):
    text: str = Field(..., min_length=3, max_length=500)
    type: str = Field(..., pattern=r"^(text|textarea|select|image)$")
    phase: str = Field(..., pattern=r"^(pre_meeting|post_meeting)$")
    options: Optional[List[str]] = None

class SurveyQuestionOut(SurveyQuestionBase):
    id: str
    model_config = ConfigDict(from_attributes=True)

class SurveySubmissionOut(BaseModel):
    id: str
    agent_id: str
    client_name: str
    client_contact: str
    responses: Dict[str, Any]
    image_paths: List[str]
    timestamp: datetime
    model_config = ConfigDict(from_attributes=True)
