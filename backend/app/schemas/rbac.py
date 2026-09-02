from typing import Optional, List
from pydantic import BaseModel, ConfigDict, model_validator
from app.schemas.auth import UserOut

class PermissionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    code: str
    category: str
    description: Optional[str] = None

class RoleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: Optional[str] = None
    is_system_role: bool = False
    permissions: List[PermissionOut] = []
    user_count: int = 0

    @model_validator(mode="before")
    @classmethod
    def compute_user_count(cls, data):
        if not isinstance(data, dict):
            if hasattr(data, "users") and getattr(data, "user_count", None) is None:
                try:
                    data.user_count = len(data.users)
                except Exception:
                    pass
        return data

class RoleCreate(BaseModel):
    name: str
    description: Optional[str] = None
    permission_codes: List[str] = []

class RolePermissionsUpdate(BaseModel):
    permission_codes: List[str]

class UserRoleUpdate(BaseModel):
    role_names: List[str]

class RiderAssignRequest(BaseModel):
    rider_id: int
