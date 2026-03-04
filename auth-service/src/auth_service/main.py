"""Main FastAPI application for authentication service."""

import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from auth_service.config import settings
from auth_service.api.routes import auth
from auth_service.db.repositories.user_repository import UserRepository
from auth_service.services.auth_service import AuthService


# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


# Global variables for database connection
mongo_client: AsyncIOMotorClient = None
database: AsyncIOMotorDatabase = None
user_repository: UserRepository = None


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator:
    """
    Lifespan context manager for startup and shutdown events.

    Args:
        app: FastAPI application instance

    Yields:
        None
    """
    # Startup
    logger.info("Starting authentication service...")

    global mongo_client, database, user_repository

    try:
        # Connect to MongoDB
        logger.info(f"Connecting to MongoDB at {settings.mongo_uri}")
        mongo_client = AsyncIOMotorClient(settings.mongo_uri)
        database = mongo_client[settings.mongo_database]

        # Initialize repository
        user_repository = UserRepository(database)

        # Create indexes
        logger.info("Creating database indexes...")
        await user_repository.create_indexes()

        # Ping database to verify connection
        await database.command("ping")
        logger.info("Successfully connected to MongoDB")

        logger.info(f"Auth service is running on {settings.auth_service_host}:{settings.auth_service_port}")

    except Exception as e:
        logger.error(f"Failed to connect to MongoDB: {e}")
        raise

    yield

    # Shutdown
    logger.info("Shutting down authentication service...")
    if mongo_client:
        mongo_client.close()
        logger.info("MongoDB connection closed")


# Create FastAPI application
app = FastAPI(
    title="Authentication Service",
    description="Microservice for user authentication and JWT token management",
    version="1.0.0",
    lifespan=lifespan
)


# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Dependency to get auth service with repository
def get_auth_service() -> AuthService:
    """
    Dependency to provide auth service instance.

    Returns:
        AuthService instance with user repository

    Raises:
        RuntimeError: If database is not initialized
    """
    if user_repository is None:
        raise RuntimeError("Database not initialized")

    return AuthService(user_repository)


# Override the dependency in auth routes
app.dependency_overrides[auth.get_auth_service] = get_auth_service


# Include routers
app.include_router(auth.router)


# Root endpoint
@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "service": "Authentication Service",
        "version": "1.0.0",
        "status": "running"
    }


@app.get("/health")
async def health():
    """Health check endpoint."""
    try:
        # Check database connection
        if database is not None:
            await database.command("ping")
            db_status = "connected"
        else:
            db_status = "disconnected"
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        db_status = "error"

    return {
        "status": "healthy" if db_status == "connected" else "unhealthy",
        "service": "auth-service",
        "database": db_status
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host=settings.auth_service_host,
        port=settings.auth_service_port,
        reload=True,
        log_level="info"
    )
