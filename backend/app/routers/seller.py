import re
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from app.database import get_db
from app.models.user import User
from app.models.product import Product, ProductImage, ProductSpecification
from app.models.brand import Brand
from app.models.order import Order, OrderItem
from app.schemas.product import ProductOut
from app.schemas.seller import (
    SellerDashboardMetrics,
    SellerOrderLineItem,
    SellerProductCreate,
    SellerProductUpdate,
)
from app.services.auth_service import require_roles
from app.services.product_service import format_product_out, verify_product_ownership

seller_guard = require_roles("seller", "admin")
router = APIRouter(prefix="/seller", tags=["Seller Hub"], dependencies=[Depends(seller_guard)])

@router.get("/dashboard", response_model=SellerDashboardMetrics)
def get_seller_dashboard(
    current_user: User = Depends(seller_guard),
    db: Session = Depends(get_db)
):
    """
    Returns aggregated metrics for the authenticated seller:
    total products, low stock count, total revenue, and total order count.
    """
    # 1. Total products owned by seller
    total_products = (
        db.query(Product)
        .filter(Product.seller_id == current_user.id)
        .count()
    )

    # 2. Low stock count (< 5 and active)
    low_stock_count = (
        db.query(Product)
        .filter(
            Product.seller_id == current_user.id,
            Product.stock_quantity < 5,
            Product.is_active == True
        )
        .count()
    )

    # 3. Total revenue from non-cancelled orders containing this seller's products
    revenue_res = (
        db.query(func.sum(OrderItem.subtotal_pkr))
        .join(Product, OrderItem.product_id == Product.id)
        .join(Order, OrderItem.order_id == Order.id)
        .filter(Product.seller_id == current_user.id, Order.order_status != "Cancelled")
        .scalar()
    )
    total_revenue_pkr = round(float(revenue_res or 0.0), 2)

    # 4. Total distinct orders containing this seller's products
    orders_count_res = (
        db.query(func.count(func.distinct(OrderItem.order_id)))
        .join(Product, OrderItem.product_id == Product.id)
        .join(Order, OrderItem.order_id == Order.id)
        .filter(Product.seller_id == current_user.id, Order.order_status != "Cancelled")
        .scalar()
    )
    total_orders_count = int(orders_count_res or 0)

    return SellerDashboardMetrics(
        total_products=total_products,
        low_stock_count=low_stock_count,
        total_revenue_pkr=total_revenue_pkr,
        total_orders_count=total_orders_count
    )

@router.get("/products", response_model=List[ProductOut])
def get_seller_products(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    is_active: Optional[bool] = None,
    category_id: Optional[int] = None,
    search: Optional[str] = None,
    current_user: User = Depends(seller_guard),
    db: Session = Depends(get_db)
):
    """
    Returns products strictly filtered to the authenticated seller.
    """
    query = db.query(Product).filter(Product.seller_id == current_user.id)

    if is_active is not None:
        query = query.filter(Product.is_active == is_active)
    if category_id is not None:
        query = query.filter(Product.category_id == category_id)
    if search:
        query = query.filter(Product.name.ilike(f"%{search}%"))

    offset = (page - 1) * limit
    products = query.order_by(desc(Product.id)).offset(offset).limit(limit).all()
    return [format_product_out(p) for p in products]

@router.get("/products/{product_id}", response_model=ProductOut)
def get_seller_product_by_id(
    product_id: int,
    current_user: User = Depends(seller_guard),
    db: Session = Depends(get_db)
):
    """
    Fetches a single product owned by the authenticated seller.
    Enforces catalog ownership isolation.
    """
    product = verify_product_ownership(product_id, current_user, db)
    return format_product_out(product)

@router.post("/products", response_model=ProductOut)
def create_seller_product(
    data: SellerProductCreate,
    current_user: User = Depends(seller_guard),
    db: Session = Depends(get_db)
):
    """
    Creates a new product owned by the authenticated seller (data.seller_id = current_user.id).
    Supports flexible regular/sale pricing, brand name resolution, and auto-generated SKUs/slugs.
    """
    # 1. Price resolution
    price = 0.0
    if data.sale_price is not None:
        price = float(data.sale_price)
    elif data.price is not None:
        price = float(data.price)
    elif data.regular_price is not None:
        price = float(data.regular_price)

    # 2. Original price resolution
    original_price = price
    if data.regular_price is not None:
        original_price = float(data.regular_price)
    elif data.original_price is not None:
        original_price = float(data.original_price)

    # 3. Discount calculation
    if data.discount_percent is not None:
        discount_percent = data.discount_percent
    elif original_price and price and original_price > price:
        discount_percent = int(round(((original_price - price) / original_price) * 100))
    else:
        discount_percent = 0

    description = data.description or data.short_description

    # 4. Slug resolution
    if data.slug:
        base_slug = re.sub(r'[^a-zA-Z0-9]+', '-', data.slug.strip().lower()).strip('-')
    else:
        base_slug = re.sub(r'[^a-zA-Z0-9]+', '-', data.name.strip().lower()).strip('-')
    if not base_slug:
        base_slug = f"prod-{uuid.uuid4().hex[:6]}"

    slug = base_slug
    existing_prod = db.query(Product).filter(Product.slug == slug).first()
    if existing_prod:
        slug = f"{base_slug}-{uuid.uuid4().hex[:6]}"

    # 5. SKU resolution
    if data.sku:
        sku = data.sku.strip()
    else:
        clean_slug = base_slug.replace("-", "").upper()[:8]
        sku = f"SLR-{current_user.id}-{clean_slug}-{uuid.uuid4().hex[:4].upper()}"

    # 6. Brand lookup or auto-creation
    brand_id = data.brand_id
    if not brand_id and data.brand_name:
        brand_name_str = data.brand_name.strip()
        brand = db.query(Brand).filter(func.lower(Brand.name) == brand_name_str.lower()).first()
        if not brand:
            b_slug = re.sub(r'[^a-zA-Z0-9]+', '-', brand_name_str.lower()).strip('-') or f"brand-{uuid.uuid4().hex[:4]}"
            brand = Brand(name=brand_name_str, slug=b_slug, description=f"{brand_name_str} brand")
            db.add(brand)
            db.flush()
        brand_id = brand.id

    # 7. Stock availability
    availability_status = data.availability_status
    if not availability_status:
        if data.stock_quantity == 0:
            availability_status = "Out of Stock"
        elif data.stock_quantity < 5:
            availability_status = "Low Stock"
        else:
            availability_status = "In Stock"

    # 8. Create product
    product = Product(
        seller_id=current_user.id,
        name=data.name.strip(),
        slug=slug,
        sku=sku,
        description=description,
        category_id=data.category_id,
        brand_id=brand_id,
        price=price,
        original_price=original_price,
        discount_percent=discount_percent,
        stock_quantity=data.stock_quantity,
        availability_status=availability_status,
        pack_size=data.pack_size,
        unit=data.unit,
        search_keywords=data.search_keywords,
        is_active=data.is_active,
        is_featured=data.is_featured,
        is_best_deal=data.is_best_deal,
        estimated_delivery_days=data.estimated_delivery_days,
    )
    db.add(product)
    db.flush()

    for idx, img_in in enumerate(data.images):
        img = ProductImage(
            product_id=product.id,
            image_url=img_in.image_url,
            alt_text=img_in.alt_text or product.name,
            is_primary=img_in.is_primary if idx > 0 else True,
            display_order=img_in.display_order or idx,
        )
        db.add(img)

    for idx, spec_in in enumerate(data.specifications):
        spec = ProductSpecification(
            product_id=product.id,
            spec_key=spec_in.spec_key,
            spec_value=spec_in.spec_value,
            display_order=spec_in.display_order or idx,
        )
        db.add(spec)

    db.commit()
    db.refresh(product)
    return format_product_out(product)

@router.put("/products/{product_id}", response_model=ProductOut)
def update_seller_product(
    product_id: int,
    data: SellerProductUpdate,
    current_user: User = Depends(seller_guard),
    db: Session = Depends(get_db)
):
    """
    Mutates a product after verifying ownership (product.seller_id == current_user.id or user is admin).
    """
    product = verify_product_ownership(product_id, current_user, db)

    update_dict = data.model_dump(exclude_unset=True)
    if "name" in update_dict and data.name is not None:
        product.name = data.name.strip()
    if "slug" in update_dict and data.slug is not None:
        product.slug = data.slug.strip()
    if "sku" in update_dict and data.sku is not None:
        product.sku = data.sku.strip()
    if "description" in update_dict and data.description is not None:
        product.description = data.description
    elif "short_description" in update_dict and data.short_description is not None:
        product.description = data.short_description
    if "category_id" in update_dict and data.category_id is not None:
        product.category_id = data.category_id

    if "brand_id" in update_dict and data.brand_id is not None:
        product.brand_id = data.brand_id
    elif "brand_name" in update_dict and data.brand_name:
        brand_name_str = data.brand_name.strip()
        brand = db.query(Brand).filter(func.lower(Brand.name) == brand_name_str.lower()).first()
        if not brand:
            b_slug = re.sub(r'[^a-zA-Z0-9]+', '-', brand_name_str.lower()).strip('-') or f"brand-{uuid.uuid4().hex[:4]}"
            brand = Brand(name=brand_name_str, slug=b_slug, description=f"{brand_name_str} brand")
            db.add(brand)
            db.flush()
        product.brand_id = brand.id

    if "sale_price" in update_dict and data.sale_price is not None:
        product.price = float(data.sale_price)
    elif "price" in update_dict and data.price is not None:
        product.price = float(data.price)

    if "regular_price" in update_dict and data.regular_price is not None:
        product.original_price = float(data.regular_price)
    elif "original_price" in update_dict and data.original_price is not None:
        product.original_price = float(data.original_price)

    if "discount_percent" in update_dict and data.discount_percent is not None:
        product.discount_percent = data.discount_percent
    elif any(k in update_dict for k in ("sale_price", "price", "regular_price", "original_price")):
        if product.original_price and product.price and product.original_price > product.price:
            product.discount_percent = int(round(((product.original_price - product.price) / product.original_price) * 100))
        else:
            product.discount_percent = 0

    if "stock_quantity" in update_dict and data.stock_quantity is not None:
        product.stock_quantity = data.stock_quantity
        if product.stock_quantity == 0:
            product.availability_status = "Out of Stock"
        elif product.stock_quantity < 5:
            product.availability_status = "Low Stock"
        else:
            product.availability_status = "In Stock"

    if "availability_status" in update_dict and data.availability_status is not None:
        product.availability_status = data.availability_status
    if "pack_size" in update_dict and data.pack_size is not None:
        product.pack_size = data.pack_size
    if "unit" in update_dict and data.unit is not None:
        product.unit = data.unit
    if "search_keywords" in update_dict and data.search_keywords is not None:
        product.search_keywords = data.search_keywords
    if "is_active" in update_dict and data.is_active is not None:
        product.is_active = data.is_active
    if "is_featured" in update_dict and data.is_featured is not None:
        product.is_featured = data.is_featured
    if "is_best_deal" in update_dict and data.is_best_deal is not None:
        product.is_best_deal = data.is_best_deal
    if "estimated_delivery_days" in update_dict and data.estimated_delivery_days is not None:
        product.estimated_delivery_days = data.estimated_delivery_days

    db.commit()
    db.refresh(product)
    return format_product_out(product)

@router.delete("/products/{product_id}")
def delete_seller_product(
    product_id: int,
    current_user: User = Depends(seller_guard),
    db: Session = Depends(get_db)
):
    """
    Deactivates (soft-deletes) a product after verifying ownership.
    """
    product = verify_product_ownership(product_id, current_user, db)
    product.is_active = False
    db.commit()
    return {
        "message": f"Product '{product.name}' deactivated successfully.",
        "product_id": product.id,
        "is_active": False
    }

@router.get("/orders", response_model=List[SellerOrderLineItem])
def get_seller_orders(
    status: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(seller_guard),
    db: Session = Depends(get_db)
):
    """
    Returns order line items strictly for products owned by this seller.
    Multi-vendor order line isolation.
    """
    query = (
        db.query(OrderItem, Order)
        .join(Order, OrderItem.order_id == Order.id)
        .join(Product, OrderItem.product_id == Product.id)
        .filter(Product.seller_id == current_user.id)
    )

    if status:
        query = query.filter(Order.order_status == status)

    query = query.order_by(desc(Order.created_at), desc(OrderItem.id))
    offset = (page - 1) * limit
    results = query.offset(offset).limit(limit).all()

    line_items = []
    for item, order in results:
        line_items.append(
            SellerOrderLineItem(
                order_number=order.order_number,
                product_name=item.product_name,
                quantity=item.quantity,
                unit_price=float(item.unit_price_pkr),
                total_pkr=float(item.subtotal_pkr),
                status=order.order_status,
                created_at=order.created_at.isoformat() if order.created_at else "",
            )
        )
    return line_items
