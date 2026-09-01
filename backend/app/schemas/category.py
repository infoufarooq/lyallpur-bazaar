from pydantic import BaseModel, ConfigDict
from typing import Optional, List

class CategoryBase(BaseModel):
    name: str
    slug: str
    description: Optional[str] = None
    icon_name: Optional[str] = None
    image_url: Optional[str] = None
    parent_id: Optional[int] = None
    is_active: bool = True
    display_order: int = 0

class CategoryCreate(CategoryBase):
    pass

class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    description: Optional[str] = None
    icon_name: Optional[str] = None
    image_url: Optional[str] = None
    parent_id: Optional[int] = None
    is_active: Optional[bool] = None
    display_order: Optional[int] = None

class CategoryOut(CategoryBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    product_count: Optional[int] = 0

class CategoryTreeOut(CategoryOut):
    model_config = ConfigDict(from_attributes=True)
    subcategories: List["CategoryTreeOut"] = []

CategoryTreeOut.model_rebuild()

class BrandBase(BaseModel):
    name: str
    slug: str
    description: Optional[str] = None
    logo_url: Optional[str] = None
    is_active: bool = True

class BrandCreate(BrandBase):
    pass

class BrandOut(BrandBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
