from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime

class Token(BaseModel):
    access_token: str
    token_type: str
    user: "UserOut"

class TokenData(BaseModel):
    user_id: Optional[int] = None
    phone_number: Optional[str] = None
    is_admin: bool = False

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
    created_at: datetime
    addresses: List[AddressOut] = []

Token.model_rebuild()
