"""Configuration settings for the authentication service."""

from typing import List
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"
    )

    # Server Settings
    auth_service_host: str = Field(default="0.0.0.0", description="Host to bind the service")
    auth_service_port: int = Field(default=8001, description="Port to bind the service")

    # JWT Settings
    jwt_secret_key: str = Field(
        default="your-secret-key-min-32-characters-change-this-in-production",
        description="Secret key for JWT token signing"
    )
    jwt_algorithm: str = Field(default="HS256", description="JWT signing algorithm")
    access_token_expire_minutes: int = Field(
        default=30,
        description="Access token expiration time in minutes"
    )
    refresh_token_expire_days: int = Field(
        default=7,
        description="Refresh token expiration time in days"
    )

    # Database Settings
    mongo_uri: str = Field(
        default="mongodb://localhost:27017",
        description="MongoDB connection URI"
    )
    mongo_database: str = Field(default="auth_db", description="MongoDB database name")
    mongo_collection_users: str = Field(default="users", description="Users collection name")

    # Security Settings
    password_min_length: int = Field(default=8, description="Minimum password length")
    require_email_verification: bool = Field(
        default=False,
        description="Require email verification for new accounts"
    )

    # CORS Settings
    cors_origins: str = Field(
        default="http://localhost:3000,http://localhost:3001",
        description="Comma-separated list of allowed CORS origins"
    )

    @property
    def cors_origins_list(self) -> List[str]:
        """Parse CORS origins from comma-separated string."""
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


# Global settings instance
settings = Settings()
