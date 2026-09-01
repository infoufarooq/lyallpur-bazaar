import math
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc
from app.database import get_db
from app.models.product import Product
from app.models.category import Category
from app.models.brand import Brand
from app.schemas.product import ProductOut, ProductDetailOut, PaginatedProducts
from app.services.product_service import format_product_out, get_product_by_id_or_slug, get_facets
from app.services.search_service import find_alternative_products, find_similar_products

router = APIRouter(prefix="/products", tags=["Products"])

@router.get("", response_model=PaginatedProducts)
def list_products(
    category: Optional[str] = None,
    brand: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    in_stock: Optional[bool] = None,
    same_day: Optional[bool] = None,
    featured: Optional[bool] = None,
    best_deals: Optional[bool] = None,
    sort_by: str = Query("relevance", pattern="^(relevance|price_asc|price_desc|newest|discount)$"),
    page: int = Query(1, ge=1),
    limit: int = Query(12, ge=1, le=100),
    db: Session = Depends(get_db)
):
    query = db.query(Product).filter(Product.is_active == True)

    if category:
        cat = db.query(Category).filter((Category.slug == category) | (Category.name == category)).first()
        if cat:
            query = query.filter(Product.category_id == cat.id)
    
    if brand:
        b = db.query(Brand).filter((Brand.slug == brand) | (Brand.name == brand)).first()
        if b:
            query = query.filter(Product.brand_id == b.id)

    if min_price is not None:
        query = query.filter(Product.price >= min_price)
    if max_price is not None:
        query = query.filter(Product.price <= max_price)
    if in_stock:
        query = query.filter(Product.stock_quantity > 0)
    if same_day:
        query = query.filter(Product.estimated_delivery_days == 0)
    if featured:
        query = query.filter(Product.is_featured == True)
    if best_deals:
        query = query.filter(Product.is_best_deal == True)

    # Compute facets from unfiltered matching collection
    all_matched = query.all()
    facets = get_facets(db, all_matched)

    # Sorting
    if sort_by == "price_asc":
        query = query.order_by(asc(Product.price))
    elif sort_by == "price_desc":
        query = query.order_by(desc(Product.price))
    elif sort_by == "newest":
        query = query.order_by(desc(Product.created_at))
    elif sort_by == "discount":
        query = query.order_by(desc(Product.discount_percent))
    else:
        # Default / relevance: featured first, then stock, then id
        query = query.order_by(desc(Product.is_featured), desc(Product.stock_quantity), desc(Product.id))

    total = query.count()
    total_pages = math.ceil(total / limit) if total > 0 else 1
    offset = (page - 1) * limit
    products = query.offset(offset).limit(limit).all()

    return PaginatedProducts(
        items=[format_product_out(p) for p in products],
        total=total,
        page=page,
        limit=limit,
        total_pages=total_pages,
        min_price=facets["min_price"],
        max_price=facets["max_price"],
        is_exact_match=True,
        alternative_suggestions=[],
        categories=facets["categories"],
        brands=facets["brands"]
    )

@router.get("/featured", response_model=List[ProductOut])
def get_featured_products(limit: int = 8, db: Session = Depends(get_db)):
    products = db.query(Product).filter(
        Product.is_active == True,
        Product.is_featured == True
    ).limit(limit).all()
    return [format_product_out(p) for p in products]

@router.get("/best-deals", response_model=List[ProductOut])
def get_best_deals(limit: int = 8, db: Session = Depends(get_db)):
    products = db.query(Product).filter(
        Product.is_active == True,
        Product.is_best_deal == True
    ).order_by(desc(Product.discount_percent)).limit(limit).all()
    return [format_product_out(p) for p in products]

@router.get("/recommended", response_model=List[ProductOut])
def get_recommended_products(category_id: Optional[int] = None, limit: int = 8, db: Session = Depends(get_db)):
    query = db.query(Product).filter(Product.is_active == True)
    if category_id:
        query = query.filter(Product.category_id == category_id)
    products = query.order_by(desc(Product.rating), desc(Product.review_count)).limit(limit).all()
    return [format_product_out(p) for p in products]

@router.get("/{identifier}", response_model=ProductDetailOut)
def get_product_detail(identifier: str, db: Session = Depends(get_db)):
    product = get_product_by_id_or_slug(db, identifier)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product

@router.get("/{product_id}/similar", response_model=List[ProductOut])
def get_similar(product_id: int, limit: int = 6, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    similars = find_similar_products(db, product, limit=limit)
    return [format_product_out(p) for p in similars]

@router.get("/{product_id}/alternatives", response_model=List[ProductOut])
def get_alternatives(product_id: int, limit: int = 6, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    alts = find_alternative_products(db, product, limit=limit)
    return [format_product_out(p) for p in alts]
