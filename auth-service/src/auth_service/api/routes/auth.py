"""Authentication API routes."""

from fastapi import APIRouter, Depends, HTTPException, status, Header
from typing import Optional

from auth_service.schemas.auth import (
    LoginRequest,
    LoginResponse,
    RegisterRequest,
    RegisterResponse,
    TokenRefreshResponse,
    TokenVerifyRequest,
    TokenVerifyResponse,
    MessageResponse
)
from auth_service.schemas.user import UserResponse
from auth_service.services.auth_service import AuthService
from auth_service.services.jwt_service import jwt_service


router = APIRouter(prefix="/api/v1/auth", tags=["Authentication"])


def get_auth_service() -> AuthService:
    """
    Dependency to get auth service instance.
    This will be properly initialized in main.py with database connection.
    """
    # This is a placeholder - actual implementation will be in main.py
    # where we have access to the database connection
    raise NotImplementedError("Auth service dependency not configured")


async def get_current_user_from_header(
    authorization: Optional[str] = Header(None)
) -> dict:
    """
    Dependency to get current user from Authorization header.

    Args:
        authorization: Authorization header (Bearer token)

    Returns:
        Token payload

    Raises:
        HTTPException: If token is missing or invalid
    """
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authorization header",
            headers={"WWW-Authenticate": "Bearer"},
        )

    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication scheme",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Verify token
    payload = jwt_service.verify_token(token, token_type="access")
    return payload


@router.post("/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
async def register(
    request: RegisterRequest,
    auth_service: AuthService = Depends(get_auth_service)
):
    """
    Register a new user.

    Args:
        request: Registration request with email, password, and optional fields
        auth_service: Auth service dependency

    Returns:
        RegisterResponse with tokens and user info
    """
    user, access_token, refresh_token = await auth_service.register_user(
        email=request.email,
        password=request.password,
        full_name=request.full_name,
        username=request.username
    )

    user_response = auth_service.user_to_response(user)

    return RegisterResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=user_response
    )


@router.post("/login", response_model=LoginResponse)
async def login(
    request: LoginRequest,
    auth_service: AuthService = Depends(get_auth_service)
):
    """
    Login with email and password.

    Args:
        request: Login request with email and password
        auth_service: Auth service dependency

    Returns:
        LoginResponse with tokens and user info
    """
    user, access_token, refresh_token = await auth_service.authenticate_user(
        email=request.email,
        password=request.password
    )

    user_response = auth_service.user_to_response(user)

    return LoginResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=user_response
    )


@router.post("/refresh", response_model=TokenRefreshResponse)
async def refresh_token(
    authorization: Optional[str] = Header(None),
    auth_service: AuthService = Depends(get_auth_service)
):
    """
    Refresh access token using refresh token.

    Args:
        authorization: Authorization header with refresh token
        auth_service: Auth service dependency

    Returns:
        TokenRefreshResponse with new access token
    """
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authorization header",
            headers={"WWW-Authenticate": "Bearer"},
        )

    scheme, _, refresh_token = authorization.partition(" ")
    if scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication scheme",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing refresh token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = await auth_service.refresh_access_token(refresh_token)

    return TokenRefreshResponse(access_token=access_token)


@router.get("/me", response_model=UserResponse)
async def get_current_user(
    current_user: dict = Depends(get_current_user_from_header),
    auth_service: AuthService = Depends(get_auth_service)
):
    """
    Get current user information.

    Args:
        current_user: Current user from token
        auth_service: Auth service dependency

    Returns:
        UserResponse with current user info
    """
    user_id = current_user.get("sub")
    user = await auth_service.user_repository.get_user_by_id(user_id)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    return auth_service.user_to_response(user)


@router.post("/logout", response_model=MessageResponse)
async def logout(
    current_user: dict = Depends(get_current_user_from_header)
):
    """
    Logout current user.

    Note: Since we're using stateless JWT tokens, logout is handled client-side
    by removing the tokens. This endpoint mainly validates the token and can be
    used for logging/auditing purposes.

    In a production system, you might want to implement token blacklisting.

    Args:
        current_user: Current user from token

    Returns:
        MessageResponse confirming logout
    """
    # In a production system, you might want to:
    # 1. Add the token to a blacklist (Redis cache)
    # 2. Log the logout event
    # 3. Invalidate refresh tokens

    return MessageResponse(message="Successfully logged out")


@router.post("/verify", response_model=TokenVerifyResponse)
async def verify_token(request: TokenVerifyRequest):
    """
    Verify if a token is valid.

    This endpoint is useful for other services to verify tokens.

    Args:
        request: Token verification request

    Returns:
        TokenVerifyResponse with validity status and user info
    """
    try:
        payload = jwt_service.verify_token(request.token, token_type="access")

        return TokenVerifyResponse(
            valid=True,
            user_id=payload.get("sub"),
            email=payload.get("email"),
            roles=payload.get("roles")
        )
    except HTTPException as e:
        return TokenVerifyResponse(
            valid=False,
            message=e.detail
        )
    except Exception as e:
        return TokenVerifyResponse(
            valid=False,
            message="Invalid token"
        )


@router.get("/health")
async def health_check():
    """
    Health check endpoint.

    Returns:
        Simple health status
    """
    return {"status": "healthy", "service": "auth-service"}
