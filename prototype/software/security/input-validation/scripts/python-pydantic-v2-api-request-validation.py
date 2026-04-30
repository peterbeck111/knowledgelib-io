# Input:  Raw JSON request body from HTTP POST
# Output: Validated, typed Python object or ValidationError

from pydantic import BaseModel, Field, EmailStr, field_validator
from pydantic import ConfigDict
from enum import Enum

class UserRole(str, Enum):
    admin = "admin"
    user = "user"
    viewer = "viewer"

class CreateUserRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    email: EmailStr
    name: str = Field(min_length=1, max_length=100)
    age: int = Field(ge=13, le=150)
    role: UserRole = UserRole.user
    bio: str | None = Field(default=None, max_length=500)

    @field_validator('name')
    @classmethod
    def no_special_chars(cls, v: str) -> str:
        if not v.replace(' ', '').replace('-', '').replace("'", '').isalpha():
            raise ValueError('name contains invalid characters')
        return v
