from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.category import Category
from app.models.brand import Brand
from app.models.product import Product
from app.schemas.category import CategoryOut, CategoryTreeOut, BrandOut
from app.schemas.product import ProductOut
from app.services.product_service import format_product_out

router = APIRouter(tags=["Categories & Brands"])

@router.get("/categories", response_model=List[CategoryOut])
def get_categories(db: Session = Depends(get_db)):
    categories = db.query(Category).filter(Category.is_active == True).order_by(Category.display_order.asc()).all()
    res = []
    for c in categories:
        cnt = db.query(Product).filter(Product.category_id == c.id, Product.is_active == True).count()
        c_out = CategoryOut.model_validate(c)
        c_out.product_count = cnt
        res.append(c_out)
    return res

@router.get("/categories/{slug}/products", response_model=List[ProductOut])
def get_category_products(slug: str, db: Session = Depends(get_db)):
    cat = db.query(Category).filter(Category.slug == slug, Category.is_active == True).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    products = db.query(Product).filter(Product.category_id == cat.id, Product.is_active == True).all()
    return [format_product_out(p) for p in products]

@router.get("/brands", response_model=List[BrandOut])
def get_brands(db: Session = Depends(get_db)):
    return db.query(Brand).filter(Brand.is_active == True).all()
