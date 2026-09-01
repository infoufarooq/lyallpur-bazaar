from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from app.schemas.product import ProductOut

class CartItemCreate(BaseModel):
    product_id: int
    quantity: int = 1

class CartItemUpdate(BaseModel):
    quantity: int

class CartItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    product_id: int
    product: ProductOut
    quantity: int
    unit_price: float
    item_total: float

class CartOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    session_token: str
    items: List[CartItemOut] = []
    total_items: int = 0
    subtotal_pkr: float = 0.0
    delivery_fee_pkr: float = 120.0
    free_delivery_threshold_pkr: float = 2500.0
    free_delivery_remaining_pkr: float = 2500.0
    estimated_total_pkr: float = 0.0
