from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Any
from datetime import datetime

class ProductImageBase(BaseModel):
    image_url: str
    alt_text: Optional[str] = None
    is_primary: bool = False
    display_order: int = 0

class ProductImageCreate(ProductImageBase):
    pass

class ProductImageOut(ProductImageBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    product_id: int

class ProductSpecBase(BaseModel):
    spec_key: str
    spec_value: str
    display_order: int = 0

class ProductSpecCreate(ProductSpecBase):
    pass

class ProductSpecOut(ProductSpecBase):
    model_config = ConfigDict(from_attributes=True)
    id: int

class ProductBase(BaseModel):
    name: str
    slug: str
    sku: str
    description: Optional[str] = None
    category_id: int
    brand_id: Optional[int] = None
    price: float
    original_price: Optional[float] = None
    discount_percent: int = 0
    stock_quantity: int = 10
    availability_status: str = "In Stock"
    pack_size: Optional[str] = None
    unit: Optional[str] = None
    search_keywords: Optional[str] = None
    is_active: bool = True
    is_featured: bool = False
    is_best_deal: bool = False
    rating: float = 4.5
    review_count: int = 12
    estimated_delivery_days: int = 1

class ProductCreate(ProductBase):
    images: List[ProductImageCreate] = []
    specifications: List[ProductSpecCreate] = []

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    sku: Optional[str] = None
    description: Optional[str] = None
    category_id: Optional[int] = None
    brand_id: Optional[int] = None
    price: Optional[float] = None
    original_price: Optional[float] = None
    discount_percent: Optional[int] = None
    stock_quantity: Optional[int] = None
    availability_status: Optional[str] = None
    pack_size: Optional[str] = None
    unit: Optional[str] = None
    search_keywords: Optional[str] = None
    is_active: Optional[bool] = None
    is_featured: Optional[bool] = None
    is_best_deal: Optional[bool] = None
    rating: Optional[float] = None
    estimated_delivery_days: Optional[int] = None

class ProductOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    seller_id: Optional[int] = None
    name: str
    slug: str
    sku: str
    description: Optional[str] = None
    category_id: int
    category_name: Optional[str] = None
    category_slug: Optional[str] = None
    brand_id: Optional[int] = None
    brand_name: Optional[str] = None
    price: float
    original_price: Optional[float] = None
    discount_percent: int = 0
    stock_quantity: int
    availability_status: str
    pack_size: Optional[str] = None
    unit: Optional[str] = None
    primary_image: Optional[str] = None
    is_active: bool
    is_featured: bool
    is_best_deal: bool
    rating: float
    review_count: int
    estimated_delivery_days: int
    created_at: datetime

class ProductDetailOut(ProductOut):
    model_config = ConfigDict(from_attributes=True)
    images: List[ProductImageOut] = []
    specifications: List[ProductSpecOut] = []
    similar_products: List[ProductOut] = []
    alternative_products: List[ProductOut] = []

class FilterFacet(BaseModel):
    id: int
    name: str
    slug: str
    count: int

class PaginatedProducts(BaseModel):
    items: List[ProductOut]
    total: int
    page: int
    limit: int
    total_pages: int
    min_price: float = 0
    max_price: float = 0
    is_exact_match: bool = True
    alternative_suggestions: List[ProductOut] = []
    categories: List[FilterFacet] = []
    brands: List[FilterFacet] = []

class SearchSuggestionOut(BaseModel):
    id: Optional[int] = None
    title: str
    type: str # 'product', 'brand', 'category'
    slug: Optional[str] = None
    category_name: Optional[str] = None
    price: Optional[float] = None
    image_url: Optional[str] = None
