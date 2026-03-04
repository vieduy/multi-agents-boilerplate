"""Authentication service with business logic."""

from datetime import datetime
from typing import Tuple, Optional

from passlib.context import CryptContext
from fastapi import HTTPException, status

from auth_service.models.user import User
from auth_service.db.repositories.user_repository import UserRepository
from auth_service.services.jwt_service import jwt_service
from auth_service.schemas.user import UserCreate, UserResponse
from auth_service.config import settings


class AuthService:
    """Service for authentication operations."""

    def __init__(self, user_repository: UserRepository):
        """
        Initialize auth service.

        Args:
            user_repository: User repository instance
        """
        self.user_repository = user_repository
        # Configure bcrypt with explicit rounds to avoid initialization issues
        self.pwd_context = CryptContext(
            schemes=["bcrypt"],
            deprecated="auto",
            bcrypt__default_rounds=12
        )

    def hash_password(self, password: str) -> str:
        """
        Hash a password using bcrypt.

        Args:
            password: Plain text password

        Returns:
            Hashed password
        """
        return self.pwd_context.hash(password)

    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """
        Verify a password against its hash.

        Args:
            plain_password: Plain text password
            hashed_password: Hashed password to compare against

        Returns:
            True if password matches, False otherwise
        """
        return self.pwd_context.verify(plain_password, hashed_password)

    def validate_password(self, password: str) -> None:
        """
        Validate password meets requirements.

        Args:
            password: Password to validate

        Raises:
            HTTPException: If password doesn't meet requirements
        """
        if len(password) < settings.password_min_length:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Password must be at least {settings.password_min_length} characters long"
            )

        # Add more validation rules as needed
        # Example: require uppercase, lowercase, digits, special characters

    async def register_user(
        self,
        email: str,
        password: str,
        full_name: Optional[str] = None,
        username: Optional[str] = None
    ) -> Tuple[User, str, str]:
        """
        Register a new user.

        Args:
            email: User's email address
            password: User's password
            full_name: User's full name (optional)
            username: User's username (optional)

        Returns:
            Tuple of (User, access_token, refresh_token)

        Raises:
            HTTPException: If email already exists or validation fails
        """
        # Normalize email to lowercase
        email = email.lower()

        # Check if email already exists
        if await self.user_repository.email_exists(email):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )

        # Check if username already exists (if provided)
        if username and await self.user_repository.username_exists(username):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already taken"
            )

        # Validate password
        self.validate_password(password)

        # Create user
        hashed_password = self.hash_password(password)
        user = User(
            email=email,
            username=username,
            hashed_password=hashed_password,
            full_name=full_name,
            is_active=True,
            is_verified=not settings.require_email_verification,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            roles=["user"]
        )

        # Save to database
        created_user = await self.user_repository.create_user(user)

        # Generate tokens
        access_token = jwt_service.create_access_token(
            user_id=str(created_user.id),
            email=created_user.email,
            roles=created_user.roles
        )
        refresh_token = jwt_service.create_refresh_token(user_id=str(created_user.id))

        return created_user, access_token, refresh_token

    async def authenticate_user(self, email: str, password: str) -> Tuple[User, str, str]:
        """
        Authenticate a user and generate tokens.

        Args:
            email: User's email address
            password: User's password

        Returns:
            Tuple of (User, access_token, refresh_token)

        Raises:
            HTTPException: If authentication fails
        """
        # Normalize email to lowercase
        email = email.lower()

        # Get user by email
        user = await self.user_repository.get_user_by_email(email)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Verify password
        if not self.verify_password(password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Check if user is active
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is inactive"
            )

        # Update last login
        await self.user_repository.update_last_login(str(user.id))

        # Generate tokens
        access_token = jwt_service.create_access_token(
            user_id=str(user.id),
            email=user.email,
            roles=user.roles
        )
        refresh_token = jwt_service.create_refresh_token(user_id=str(user.id))

        return user, access_token, refresh_token

    async def refresh_access_token(self, refresh_token: str) -> str:
        """
        Generate a new access token using a refresh token.

        Args:
            refresh_token: Valid refresh token

        Returns:
            New access token

        Raises:
            HTTPException: If refresh token is invalid
        """
        # Verify refresh token
        payload = jwt_service.verify_token(refresh_token, token_type="refresh")

        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload"
            )

        # Get user from database
        user = await self.user_repository.get_user_by_id(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found"
            )

        # Check if user is active
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is inactive"
            )

        # Generate new access token
        access_token = jwt_service.create_access_token(
            user_id=str(user.id),
            email=user.email,
            roles=user.roles
        )

        return access_token

    async def get_current_user(self, token: str) -> User:
        """
        Get current user from access token.

        Args:
            token: Valid access token

        Returns:
            User model

        Raises:
            HTTPException: If token is invalid or user not found
        """
        # Verify access token
        payload = jwt_service.verify_token(token, token_type="access")

        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload"
            )

        # Get user from database
        user = await self.user_repository.get_user_by_id(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found"
            )

        # Check if user is active
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is inactive"
            )

        return user

    def user_to_response(self, user: User) -> UserResponse:
        """
        Convert User model to UserResponse schema.

        Args:
            user: User model

        Returns:
            UserResponse schema
        """
        return UserResponse(
            id=str(user.id),
            email=user.email,
            username=user.username,
            full_name=user.full_name,
            is_active=user.is_active,
            is_verified=user.is_verified,
            created_at=user.created_at,
            roles=user.roles
        )
