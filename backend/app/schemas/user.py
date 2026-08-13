from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from uuid import UUID
from datetime import datetime

class UserBase(BaseModel):
    """Base user schema."""
    username: str = Field(..., min_length=3, max_length=150)
    full_name: Optional[str] = Field(None, max_length=256)
    email: Optional[EmailStr] = None

class UserCreate(UserBase):
    """User creation schema."""
    password: str = Field(..., min_length=8, max_length=128)

class UserUpdate(BaseModel):
    """User update schema."""
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = Field(None, min_length=8, max_length=128)

class UserResponse(UserBase):
    """User response schema."""
    id: UUID
    disabled: bool = False
    created_at: datetime

    class Config:
        from_attributes = True

class UserInDB(UserResponse):
    """User in database schema."""
    hashed_password: str

class TokenResponse(BaseModel):
    """Token response schema."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class TokenPayload(BaseModel):
    """Token payload schema."""
    sub: str
    exp: int
