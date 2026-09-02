from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from datetime import datetime

class OrderItemCreate(BaseModel):
    product_id: int
    quantity: int = 1

class OrderCreate(BaseModel):
    customer_name: str
    customer_phone: str
    customer_email: Optional[str] = None
    city: str = "Faisalabad"
    locality: str
    full_address: str
    nearby_landmark: Optional[str] = None
    delivery_speed: str = "Standard Delivery"
    payment_method: str = "Cash on Delivery"
    delivery_notes: Optional[str] = None
    cart_session_token: Optional[str] = None
    items: Optional[List[OrderItemCreate]] = None

class OrderItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    product_id: Optional[int] = None
    product_name: str
    product_sku: Optional[str] = None
    product_image: Optional[str] = None
    unit_price_pkr: float
    quantity: int
    subtotal_pkr: float

class OrderOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    order_number: str
    user_id: Optional[int] = None
    customer_name: str
    customer_phone: str
    customer_email: Optional[str] = None
    city: str
    locality: str
    full_address: str
    nearby_landmark: Optional[str] = None
    delivery_speed: str
    subtotal_pkr: float
    delivery_fee_pkr: float
    discount_pkr: float
    total_amount_pkr: float
    payment_method: str
    payment_status: str
    order_status: str
    estimated_delivery_date: Optional[str] = None
    delivery_notes: Optional[str] = None
    rider_id: Optional[int] = None
    assigned_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    created_at: datetime
    items: List[OrderItemOut] = []

class OrderStatusUpdate(BaseModel):
    order_status: Optional[str] = None
    payment_status: Optional[str] = None
    delivery_notes: Optional[str] = None

class DashboardMetricsOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    total_orders: int
    total_sales_pkr: float
    pending_orders: int
    total_products: int
    low_stock_products: int
    recent_orders: List[OrderOut] = []
