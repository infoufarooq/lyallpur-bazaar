from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc, func, or_, and_

from app.database import get_db
from app.models.user import User
from app.models.order import Order
from app.schemas.rider import (
    RiderDeliveryOut,
    RiderStatusUpdate,
    RiderDashboardMetrics,
)
from app.services.auth_service import require_roles, get_user_roles_and_permissions

rider_guard = require_roles("rider", "admin")
router = APIRouter(prefix="/rider", tags=["Rider Portal"], dependencies=[Depends(rider_guard)])

def format_rider_delivery(order: Order) -> RiderDeliveryOut:
    return RiderDeliveryOut(
        order_id=order.id,
        order_number=order.order_number,
        customer_name=order.customer_name,
        customer_phone=order.customer_phone,
        locality=order.locality,
        full_address=order.full_address,
        nearby_landmark=order.nearby_landmark,
        total_amount_pkr=float(order.total_amount_pkr),
        order_status=order.order_status,
        payment_method=order.payment_method,
        payment_status=order.payment_status,
        delivery_notes=order.delivery_notes,
        assigned_at=order.assigned_at,
        delivered_at=order.delivered_at,
        recipient_name=order.customer_name,
        recipient_phone=order.customer_phone,
    )

@router.get("/dashboard", response_model=RiderDashboardMetrics)
def get_rider_dashboard(
    current_user: User = Depends(rider_guard),
    db: Session = Depends(get_db)
):
    """
    Returns aggregated delivery metrics for the authenticated rider:
    pending deliveries, delivered today count, and COD cash collected.
    """
    # 1. Pending deliveries (assigned and not terminal: not Delivered and not Cancelled)
    pending_deliveries = (
        db.query(Order)
        .filter(
            Order.rider_id == current_user.id,
            Order.order_status.notin_(["Delivered", "Cancelled"])
        )
        .count()
    )

    # 2. Delivered today
    now = datetime.utcnow()
    start_of_today = datetime(now.year, now.month, now.day)
    delivered_today = (
        db.query(Order)
        .filter(
            Order.rider_id == current_user.id,
            Order.order_status == "Delivered",
            or_(
                Order.delivered_at >= start_of_today,
                and_(Order.delivered_at == None, Order.created_at >= start_of_today)
            )
        )
        .count()
    )

    # 3. COD cash collected (all delivered orders with Cash on Delivery assigned to this rider)
    cod_res = (
        db.query(func.sum(Order.total_amount_pkr))
        .filter(
            Order.rider_id == current_user.id,
            Order.order_status == "Delivered",
            Order.payment_method == "Cash on Delivery"
        )
        .scalar()
    )
    cod_cash_collected_pkr = round(float(cod_res or 0.0), 2)

    return RiderDashboardMetrics(
        pending_deliveries=pending_deliveries,
        delivered_today=delivered_today,
        cod_cash_collected_pkr=cod_cash_collected_pkr
    )

@router.get("/deliveries", response_model=List[RiderDeliveryOut])
def get_rider_deliveries(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(rider_guard),
    db: Session = Depends(get_db)
):
    """
    Returns active orders assigned to the authenticated rider (status not in Delivered, Cancelled).
    """
    offset = (page - 1) * limit
    orders = (
        db.query(Order)
        .filter(
            Order.rider_id == current_user.id,
            Order.order_status.notin_(["Delivered", "Cancelled"])
        )
        .order_by(Order.id.asc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    return [format_rider_delivery(o) for o in orders]

@router.put("/deliveries/{order_id}/status", response_model=RiderDeliveryOut)
def update_delivery_status(
    order_id: int,
    data: RiderStatusUpdate,
    current_user: User = Depends(rider_guard),
    db: Session = Depends(get_db)
):
    """
    Advances delivery status to 'Out for Delivery' or 'Delivered'.
    Verifies order is assigned to current rider (or user is admin).
    If Delivered, updates delivered_at timestamp, optional delivery notes,
    and sets payment_status = 'Paid' if payment_method is 'Cash on Delivery'.
    """
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Order {order_id} not found"
        )

    user_roles, _ = get_user_roles_and_permissions(current_user)
    is_admin = "admin" in user_roles or getattr(current_user, "is_admin", False)

    if not is_admin and order.rider_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: You are not assigned to this delivery"
        )

    # Validate transition
    raw_status = (data.status or "").strip()
    valid_statuses = {
        "out for delivery": "Out for Delivery",
        "delivered": "Delivered"
    }
    normalized_status = valid_statuses.get(raw_status.lower())
    if not normalized_status:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status '{data.status}'. Status must be 'Out for Delivery' or 'Delivered'"
        )

    if order.order_status == "Cancelled":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot update status of a cancelled order"
        )

    order.order_status = normalized_status
    if data.delivery_notes is not None:
        order.delivery_notes = data.delivery_notes

    if normalized_status == "Delivered":
        order.delivered_at = datetime.utcnow()
        if order.payment_method == "Cash on Delivery":
            order.payment_status = "Paid"

    db.commit()
    db.refresh(order)
    return format_rider_delivery(order)

@router.get("/history", response_model=List[RiderDeliveryOut])
def get_rider_history(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(rider_guard),
    db: Session = Depends(get_db)
):
    """
    Returns delivered orders history for the authenticated rider.
    """
    offset = (page - 1) * limit
    orders = (
        db.query(Order)
        .filter(
            Order.rider_id == current_user.id,
            Order.order_status == "Delivered"
        )
        .order_by(desc(Order.delivered_at), desc(Order.id))
        .offset(offset)
        .limit(limit)
        .all()
    )
    return [format_rider_delivery(o) for o in orders]
