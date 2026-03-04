"""Authentication schemas for request/response validation."""

from typing import Optional
from pydantic import BaseModel, EmailStr, Field

from auth_service.schemas.user import UserResponse


class LoginRequest(BaseModel):
    """Schema for login request."""

    email: EmailStr
    password: str = Field(..., min_length=1, description="User password")


class LoginResponse(BaseModel):
    """Schema for login response."""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse


class RegisterRequest(BaseModel):
    """Schema for registration request."""

    email: EmailStr
    password: str = Field(..., min_length=8, description="User password (min 8 characters)")
    full_name: Optional[str] = None
    username: Optional[str] = None


class RegisterResponse(BaseModel):
    """Schema for registration response."""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse
    message: str = "User registered successfully"


class TokenRefreshRequest(BaseModel):
    """Schema for token refresh request (if using body instead of header)."""

    refresh_token: str


class TokenRefreshResponse(BaseModel):
    """Schema for token refresh response."""

    access_token: str
    token_type: str = "bearer"


class TokenVerifyRequest(BaseModel):
    """Schema for token verification request."""

    token: str


class TokenVerifyResponse(BaseModel):
    """Schema for token verification response."""

    valid: bool
    user_id: Optional[str] = None
    email: Optional[str] = None
    roles: Optional[list] = None
    message: Optional[str] = None


class MessageResponse(BaseModel):
    """Generic message response."""

    message: str
