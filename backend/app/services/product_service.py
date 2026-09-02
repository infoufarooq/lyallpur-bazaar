from typing import List, Optional, Tuple, Dict, Any
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from app.models.product import Product, ProductImage, ProductSpecification
from app.models.category import Category
from app.models.brand import Brand
from app.models.user import User
from app.schemas.product import ProductCreate, ProductUpdate, ProductOut, ProductDetailOut, FilterFacet
from app.services.search_service import find_alternative_products, find_similar_products
from app.services.auth_service import get_user_roles_and_permissions

def format_product_out(product: Product) -> ProductOut:
    primary_img = None
    if product.images:
        for img in product.images:
            if img.is_primary:
                primary_img = img.image_url
                break
        if not primary_img and len(product.images) > 0:
            primary_img = product.images[0].image_url

    return ProductOut(
        id=product.id,
        seller_id=product.seller_id,
        name=product.name,
        slug=product.slug,
        sku=product.sku,
        description=product.description,
        category_id=product.category_id,
        category_name=product.category.name if product.category else None,
        category_slug=product.category.slug if product.category else None,
        brand_id=product.brand_id,
        brand_name=product.brand.name if product.brand else None,
        price=product.price,
        original_price=product.original_price,
        discount_percent=product.discount_percent,
        stock_quantity=product.stock_quantity,
        availability_status=product.availability_status,
        pack_size=product.pack_size,
        unit=product.unit,
        primary_image=primary_img,
        is_active=product.is_active,
        is_featured=product.is_featured,
        is_best_deal=product.is_best_deal,
        rating=product.rating,
        review_count=product.review_count,
        estimated_delivery_days=product.estimated_delivery_days,
        created_at=product.created_at
    )

def get_product_by_id_or_slug(db: Session, identifier: str) -> Optional[ProductDetailOut]:
    query = db.query(Product)
    if identifier.isdigit():
        product = query.filter(Product.id == int(identifier)).first()
    else:
        product = query.filter(Product.slug == identifier).first()

    if not product:
        return None

    similar_raw = find_similar_products(db, product, limit=6)
    alts_raw = find_alternative_products(db, product, limit=6)

    out = format_product_out(product)
    
    return ProductDetailOut(
        **out.model_dump(),
        images=product.images,
        specifications=product.specifications,
        similar_products=[format_product_out(p) for p in similar_raw],
        alternative_products=[format_product_out(p) for p in alts_raw]
    )

def get_facets(db: Session, current_products: List[Product]) -> Dict[str, Any]:
    if not current_products:
        return {"min_price": 0, "max_price": 0, "categories": [], "brands": []}

    prices = [p.price for p in current_products]
    min_p = min(prices) if prices else 0
    max_p = max(prices) if prices else 0

    cat_counts: Dict[int, int] = {}
    brand_counts: Dict[int, int] = {}

    for p in current_products:
        cat_counts[p.category_id] = cat_counts.get(p.category_id, 0) + 1
        if p.brand_id:
            brand_counts[p.brand_id] = brand_counts.get(p.brand_id, 0) + 1

    category_facets = []
    for cat_id, count in cat_counts.items():
        cat = db.query(Category).filter(Category.id == cat_id).first()
        if cat:
            category_facets.append(FilterFacet(id=cat.id, name=cat.name, slug=cat.slug, count=count))

    brand_facets = []
    for b_id, count in brand_counts.items():
        brand = db.query(Brand).filter(Brand.id == b_id).first()
        if brand:
            brand_facets.append(FilterFacet(id=brand.id, name=brand.name, slug=brand.slug, count=count))

    return {
        "min_price": min_p,
        "max_price": max_p,
        "categories": category_facets,
        "brands": brand_facets
    }

def create_product(db: Session, data: ProductCreate, seller_id: Optional[int] = None) -> Product:
    prod_data = data.model_dump(exclude={"images", "specifications"})
    if seller_id is not None:
        prod_data["seller_id"] = seller_id
    product = Product(**prod_data)
    db.add(product)
    db.flush()

    for idx, img_in in enumerate(data.images):
        img = ProductImage(
            product_id=product.id,
            image_url=img_in.image_url,
            alt_text=img_in.alt_text or product.name,
            is_primary=img_in.is_primary if idx > 0 else True,
            display_order=img_in.display_order or idx
        )
        db.add(img)

    for idx, spec_in in enumerate(data.specifications):
        spec = ProductSpecification(
            product_id=product.id,
            spec_key=spec_in.spec_key,
            spec_value=spec_in.spec_value,
            display_order=spec_in.display_order or idx
        )
        db.add(spec)

    db.commit()
    db.refresh(product)
    return product

def verify_product_ownership(product_id: int, user: User, db: Session) -> Product:
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product with id {product_id} not found"
        )

    user_roles, _ = get_user_roles_and_permissions(user)
    is_admin = getattr(user, "is_admin", False) or "admin" in user_roles

    if not is_admin and product.seller_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: you do not have ownership of this product"
        )
    return product

