"""User repository for database operations."""

from datetime import datetime
from typing import Optional, List
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from auth_service.models.user import User
from auth_service.config import settings


class UserRepository:
    """Repository for user database operations."""

    def __init__(self, db: AsyncIOMotorDatabase):
        """
        Initialize user repository.

        Args:
            db: MongoDB database instance
        """
        self.db = db
        self.collection = db[settings.mongo_collection_users]

    async def create_indexes(self):
        """Create database indexes for optimal performance."""
        # Unique index on email (case-insensitive)
        await self.collection.create_index("email", unique=True)

        # Optional unique index on username if used
        # Drop existing username index if it exists (in case it was created incorrectly)
        try:
            await self.collection.drop_index("username_1")
        except Exception:
            pass  # Index doesn't exist, that's fine

        # Create partial unique index on username (only indexes non-null, non-empty values)
        # This allows multiple documents with null username but ensures uniqueness for non-null values
        await self.collection.create_index(
            "username",
            unique=True,
            partialFilterExpression={
                "username": {"$exists": True, "$type": "string"}
            }  # Only index when username exists and is a string (not null)
        )

    async def create_user(self, user: User) -> User:
        """
        Create a new user in the database.

        Args:
            user: User model instance

        Returns:
            Created user with assigned ID
        """
        user_dict = user.to_dict()
        user_dict.pop("_id", None)  # Remove _id if present, let MongoDB generate it

        result = await self.collection.insert_one(user_dict)
        user.id = result.inserted_id

        return user

    async def get_user_by_id(self, user_id: str) -> Optional[User]:
        """
        Retrieve a user by ID.

        Args:
            user_id: User's unique identifier

        Returns:
            User model or None if not found
        """
        try:
            user_data = await self.collection.find_one({"_id": ObjectId(user_id)})
            if user_data:
                return User(**user_data)
            return None
        except Exception:
            return None

    async def get_user_by_email(self, email: str) -> Optional[User]:
        """
        Retrieve a user by email (case-insensitive).

        Args:
            email: User's email address

        Returns:
            User model or None if not found
        """
        # Convert email to lowercase for case-insensitive search
        user_data = await self.collection.find_one({"email": email.lower()})
        if user_data:
            return User(**user_data)
        return None

    async def get_user_by_username(self, username: str) -> Optional[User]:
        """
        Retrieve a user by username.

        Args:
            username: User's username

        Returns:
            User model or None if not found
        """
        user_data = await self.collection.find_one({"username": username})
        if user_data:
            return User(**user_data)
        return None

    async def update_user(self, user_id: str, update_data: dict) -> Optional[User]:
        """
        Update a user's information.

        Args:
            user_id: User's unique identifier
            update_data: Dictionary of fields to update

        Returns:
            Updated user model or None if not found
        """
        # Add updated_at timestamp
        update_data["updated_at"] = datetime.utcnow()

        try:
            result = await self.collection.find_one_and_update(
                {"_id": ObjectId(user_id)},
                {"$set": update_data},
                return_document=True
            )
            if result:
                return User(**result)
            return None
        except Exception:
            return None

    async def update_last_login(self, user_id: str) -> bool:
        """
        Update user's last login timestamp.

        Args:
            user_id: User's unique identifier

        Returns:
            True if successful, False otherwise
        """
        try:
            result = await self.collection.update_one(
                {"_id": ObjectId(user_id)},
                {"$set": {"last_login": datetime.utcnow()}}
            )
            return result.modified_count > 0
        except Exception:
            return False

    async def delete_user(self, user_id: str) -> bool:
        """
        Delete a user from the database.

        Args:
            user_id: User's unique identifier

        Returns:
            True if deleted, False otherwise
        """
        try:
            result = await self.collection.delete_one({"_id": ObjectId(user_id)})
            return result.deleted_count > 0
        except Exception:
            return False

    async def list_users(
        self,
        skip: int = 0,
        limit: int = 100,
        filters: Optional[dict] = None
    ) -> List[User]:
        """
        List users with pagination and optional filters.

        Args:
            skip: Number of users to skip
            limit: Maximum number of users to return
            filters: Optional filter conditions

        Returns:
            List of user models
        """
        query = filters or {}
        cursor = self.collection.find(query).skip(skip).limit(limit)
        users = []

        async for user_data in cursor:
            users.append(User(**user_data))

        return users

    async def count_users(self, filters: Optional[dict] = None) -> int:
        """
        Count users matching filters.

        Args:
            filters: Optional filter conditions

        Returns:
            Number of matching users
        """
        query = filters or {}
        return await self.collection.count_documents(query)

    async def email_exists(self, email: str) -> bool:
        """
        Check if an email already exists.

        Args:
            email: Email address to check

        Returns:
            True if email exists, False otherwise
        """
        count = await self.collection.count_documents({"email": email.lower()})
        return count > 0

    async def username_exists(self, username: str) -> bool:
        """
        Check if a username already exists.

        Args:
            username: Username to check

        Returns:
            True if username exists, False otherwise
        """
        count = await self.collection.count_documents({"username": username})
        return count > 0
