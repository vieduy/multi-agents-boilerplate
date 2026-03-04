"""User model for MongoDB."""

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, EmailStr, Field
from bson import ObjectId


class PyObjectId(ObjectId):
    """Custom ObjectId type for Pydantic."""

    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v, _info=None):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid ObjectId")
        return ObjectId(v)

    @classmethod
    def __get_pydantic_json_schema__(cls, _core_schema, handler):
        return {"type": "string"}


class User(BaseModel):
    """User model matching MongoDB schema."""

    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    email: EmailStr
    username: Optional[str] = None
    hashed_password: str
    full_name: Optional[str] = None
    is_active: bool = True
    is_verified: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    last_login: Optional[datetime] = None
    roles: List[str] = Field(default_factory=lambda: ["user"])

    class Config:
        """Pydantic config."""

        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {
            ObjectId: str,
            datetime: lambda v: v.isoformat()
        }

    def dict(self, **kwargs):
        """Override dict to handle ObjectId serialization."""
        d = super().model_dump(**kwargs)
        if self.id:
            d["_id"] = str(self.id)
        return d

    def to_dict(self) -> dict:
        """Convert model to dictionary for MongoDB insertion."""
        user_dict = self.model_dump(by_alias=True, exclude={"id"})
        if self.id:
            user_dict["_id"] = self.id
        return user_dict
