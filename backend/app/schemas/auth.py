from pydantic import BaseModel, ConfigDict, field_validator, model_validator
from typing import Optional, List
from datetime import datetime

class Token(BaseModel):
    access_token: str
    token_type: str
    user: "UserOut"
    roles: List[str] = []
    permissions: List[str] = []

class TokenData(BaseModel):
    user_id: Optional[int] = None
    phone_number: Optional[str] = None
    is_admin: bool = False
    roles: List[str] = []
    permissions: List[str] = []

class UserCreate(BaseModel):
    full_name: str
    phone_number: str
    email: Optional[str] = None
    password: str

class UserLogin(BaseModel):
    phone_or_email: str
    password: str

class AddressBase(BaseModel):
    title: str = "Home"
    recipient_name: str
    phone_number: str
    city: str = "Faisalabad"
    locality: str
    full_address: str
    nearby_landmark: Optional[str] = None
    is_default: bool = False

class AddressCreate(AddressBase):
    pass

class AddressOut(AddressBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: Optional[int] = None
    created_at: datetime

class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    full_name: str
    email: Optional[str] = None
    phone_number: str
    is_admin: bool
    is_active: bool
    roles: List[str] = []
    permissions: List[str] = []
    business_name: Optional[str] = None
    vehicle_type: Optional[str] = None
    vehicle_number: Optional[str] = None
    created_at: datetime
    addresses: List[AddressOut] = []

    @field_validator("roles", mode="before")
    @classmethod
    def extract_roles(cls, v):
        if isinstance(v, list):
            extracted = []
            for item in v:
                if hasattr(item, "name"):
                    extracted.append(item.name)
                elif isinstance(item, str):
                    extracted.append(item)
                else:
                    extracted.append(str(item))
            return extracted
        return v

    @field_validator("permissions", mode="before")
    @classmethod
    def extract_permissions(cls, v):
        if isinstance(v, list):
            extracted = []
            for item in v:
                if hasattr(item, "code"):
                    extracted.append(item.code)
                elif isinstance(item, str):
                    extracted.append(item)
                else:
                    extracted.append(str(item))
            return extracted
        return v

    @model_validator(mode="before")
    @classmethod
    def extract_orm_permissions(cls, data):
        if not isinstance(data, dict) and hasattr(data, "roles"):
            if not hasattr(data, "permissions") or getattr(data, "permissions") is None:
                perms = set()
                for r in (getattr(data, "roles") or []):
                    if hasattr(r, "permissions") and r.permissions:
                        for p in r.permissions:
                            if hasattr(p, "code"):
                                perms.add(p.code)
                            elif isinstance(p, str):
                                perms.add(p)
                try:
                    data.permissions = sorted(list(perms))
                except Exception:
                    pass
        return data

    @model_validator(mode="after")
    def ensure_admin_role(self):
        if self.is_admin and "admin" not in self.roles:
            self.roles.append("admin")
        return self

Token.model_rebuild()

