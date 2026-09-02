from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from app.schemas.product import ProductOut, ProductImageCreate, ProductSpecCreate

class SellerDashboardMetrics(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    total_products: int
    low_stock_count: int
    total_revenue_pkr: float
    total_orders_count: int

class SellerOrderLineItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    order_number: str
    product_name: str
    quantity: int
    unit_price: float
    total_pkr: float
    status: str
    created_at: str

class SellerProductCreate(BaseModel):
    model_config = ConfigDict(extra="ignore")
    name: str
    slug: Optional[str] = None
    sku: Optional[str] = None
    category_id: int
    brand_id: Optional[int] = None
    brand_name: Optional[str] = None
    regular_price: Optional[float] = None
    sale_price: Optional[float] = None
    price: Optional[float] = None
    original_price: Optional[float] = None
    discount_percent: Optional[int] = None
    stock_quantity: int = 10
    availability_status: Optional[str] = None
    pack_size: Optional[str] = None
    unit: Optional[str] = None
    short_description: Optional[str] = None
    description: Optional[str] = None
    search_keywords: Optional[str] = None
    is_active: bool = True
    is_featured: bool = False
    is_best_deal: bool = False
    estimated_delivery_days: int = 1
    images: List[ProductImageCreate] = []
    specifications: List[ProductSpecCreate] = []

class SellerProductUpdate(BaseModel):
    model_config = ConfigDict(extra="ignore")
    name: Optional[str] = None
    slug: Optional[str] = None
    sku: Optional[str] = None
    category_id: Optional[int] = None
    brand_id: Optional[int] = None
    brand_name: Optional[str] = None
    regular_price: Optional[float] = None
    sale_price: Optional[float] = None
    price: Optional[float] = None
    original_price: Optional[float] = None
    discount_percent: Optional[int] = None
    stock_quantity: Optional[int] = None
    availability_status: Optional[str] = None
    unit: Optional[str] = None
    pack_size: Optional[str] = None
    short_description: Optional[str] = None
    description: Optional[str] = None
    search_keywords: Optional[str] = None
    is_active: Optional[bool] = None
    is_featured: Optional[bool] = None
    is_best_deal: Optional[bool] = None
    estimated_delivery_days: Optional[int] = None

class SellerProductOut(ProductOut):
    pass
