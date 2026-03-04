"""User schemas for request/response validation."""

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, EmailStr, Field


class UserBase(BaseModel):
    """Base user schema with common fields."""

    email: EmailStr
    username: Optional[str] = None
    full_name: Optional[str] = None


class UserCreate(UserBase):
    """Schema for user creation."""

    password: str = Field(..., min_length=8, description="User password (min 8 characters)")


class UserUpdate(BaseModel):
    """Schema for user updates."""

    email: Optional[EmailStr] = None
    username: Optional[str] = None
    full_name: Optional[str] = None
    is_active: Optional[bool] = None


class UserInDB(UserBase):
    """Schema for user in database (includes all fields)."""

    id: str = Field(..., alias="_id")
    is_active: bool
    is_verified: bool
    created_at: datetime
    updated_at: datetime
    last_login: Optional[datetime] = None
    roles: List[str]

    class Config:
        """Pydantic config."""

        populate_by_name = True
        from_attributes = True


class UserResponse(BaseModel):
    """Schema for user response (safe for client)."""

    id: str
    email: EmailStr
    username: Optional[str] = None
    full_name: Optional[str] = None
    is_active: bool
    is_verified: bool
    created_at: datetime
    roles: List[str]

    class Config:
        """Pydantic config."""

        from_attributes = True
