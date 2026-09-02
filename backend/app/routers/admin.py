from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.database import get_db
from app.models.user import User
from app.models.role import Role
from app.models.product import Product, ProductImage, ProductSpecification
from app.models.category import Category
from app.models.order import Order
from app.models.delivery_zone import DeliveryZone
from app.schemas.auth import UserOut
from app.schemas.order import DashboardMetricsOut, OrderOut, OrderStatusUpdate
from app.schemas.product import ProductCreate, ProductUpdate, ProductOut, ProductDetailOut
from app.schemas.category import CategoryCreate, CategoryUpdate, CategoryOut
from app.schemas.delivery import DeliveryZoneCreate, DeliveryZoneUpdate, DeliveryZoneOut
from app.schemas.rbac import RiderAssignRequest
from app.services.auth_service import get_current_admin, require_permissions
from app.services.product_service import format_product_out, create_product, get_product_by_id_or_slug
from app.services.order_service import get_dashboard_metrics

router = APIRouter(prefix="/admin", tags=["Admin Portal"])

@router.get("/dashboard", response_model=DashboardMetricsOut)
def admin_dashboard(admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    return get_dashboard_metrics(db)

# --- Product Management ---
@router.get("/products", response_model=List[ProductOut])
def admin_list_products(
    page: int = 1,
    limit: int = 50,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    offset = (page - 1) * limit
    products = db.query(Product).order_by(desc(Product.id)).offset(offset).limit(limit).all()
    return [format_product_out(p) for p in products]

@router.post("/products", response_model=ProductOut)
def admin_create_product(
    data: ProductCreate,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    prod = create_product(db, data)
    return format_product_out(prod)

@router.put("/products/{product_id}", response_model=ProductOut)
def admin_update_product(
    product_id: int,
    data: ProductUpdate,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    update_dict = data.model_dump(exclude_unset=True)
    for k, v in update_dict.items():
        setattr(product, k, v)

    # Auto update availability if stock is updated
    if "stock_quantity" in update_dict:
        if product.stock_quantity == 0:
            product.availability_status = "Out of Stock"
        elif product.stock_quantity < 5:
            product.availability_status = "Low Stock"
        else:
            product.availability_status = "In Stock"

    db.commit()
    db.refresh(product)
    return format_product_out(product)

@router.delete("/products/{product_id}")
def admin_delete_product(
    product_id: int,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    product.is_active = False
    db.commit()
    return {"message": f"Product '{product.name}' deactivated successfully."}

# --- Order Management ---
@router.get("/orders", response_model=List[OrderOut])
def admin_list_orders(
    status: Optional[str] = None,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    query = db.query(Order)
    if status:
        query = query.filter(Order.order_status == status)
    orders = query.order_by(desc(Order.created_at)).all()
    return orders

@router.put("/orders/{order_id}/status", response_model=OrderOut)
def admin_update_order_status(
    order_id: int,
    data: OrderStatusUpdate,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if data.order_status:
        order.order_status = data.order_status
    if data.payment_status:
        order.payment_status = data.payment_status
    if data.delivery_notes:
        order.delivery_notes = data.delivery_notes

    db.commit()
    db.refresh(order)
    return order

# --- Category Management ---
@router.post("/categories", response_model=CategoryOut)
def admin_create_category(
    data: CategoryCreate,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    cat = Category(**data.model_dump())
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat

@router.put("/categories/{category_id}", response_model=CategoryOut)
def admin_update_category(
    category_id: int,
    data: CategoryUpdate,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    cat = db.query(Category).filter(Category.id == category_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(cat, k, v)
    db.commit()
    db.refresh(cat)
    return cat

# --- Delivery Zone Management ---
@router.get("/zones", response_model=List[DeliveryZoneOut])
def admin_list_zones(admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    return db.query(DeliveryZone).all()

@router.post("/zones", response_model=DeliveryZoneOut)
def admin_create_zone(
    data: DeliveryZoneCreate,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    zone = DeliveryZone(**data.model_dump())
    db.add(zone)
    db.commit()
    db.refresh(zone)
    return zone

@router.put("/zones/{zone_id}", response_model=DeliveryZoneOut)
def admin_update_zone(
    zone_id: int,
    data: DeliveryZoneUpdate,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    zone = db.query(DeliveryZone).filter(DeliveryZone.id == zone_id).first()
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(zone, k, v)
    db.commit()
    db.refresh(zone)
    return zone

# --- Rider Dispatch & Logistics ---
@router.get("/riders", response_model=List[UserOut])
def admin_list_riders(
    current_user: User = Depends(require_permissions("order:assign_rider")),
    db: Session = Depends(get_db)
):
    """
    Query all active users who possess the rider role.
    """
    riders = (
        db.query(User)
        .join(User.roles)
        .filter(Role.name == "rider", User.is_active == True)
        .distinct()
        .all()
    )
    return riders

@router.put("/orders/{order_id}/assign-rider", response_model=OrderOut)
def admin_assign_rider(
    order_id: int,
    data: RiderAssignRequest,
    current_user: User = Depends(require_permissions("order:assign_rider")),
    db: Session = Depends(get_db)
):
    """
    Assign a rider to an order, record assignment timestamp, and advance order status to Packed.
    """
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if order.order_status in ["Delivered", "Cancelled"]:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot assign rider to an order with status '{order.order_status}'"
        )

    rider = (
        db.query(User)
        .join(User.roles)
        .filter(User.id == data.rider_id, Role.name == "rider", User.is_active == True)
        .first()
    )
    if not rider:
        raise HTTPException(status_code=404, detail="Active delivery rider not found")

    order.rider_id = rider.id
    order.assigned_at = datetime.utcnow()
    if order.order_status in ["Pending", "Confirmed", "Processing", None]:
        order.order_status = "Packed"

    db.commit()
    db.refresh(order)
    return order

