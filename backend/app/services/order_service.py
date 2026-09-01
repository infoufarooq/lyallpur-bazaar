import random
from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.order import Order, OrderItem
from app.models.cart import Cart, CartItem
from app.models.product import Product
from app.schemas.order import OrderCreate, OrderOut, DashboardMetricsOut
from app.services.delivery_service import calculate_delivery_estimate
from app.config import settings

def generate_order_number() -> str:
    year = datetime.now().year
    rand_suffix = random.randint(1000, 9999)
    return f"FSD-{year}-{rand_suffix}"

def create_order(db: Session, data: OrderCreate, user_id: Optional[int] = None) -> Order:
    # 1. Determine items
    order_items_data = []
    cart_to_clear = None

    if data.cart_session_token:
        cart = db.query(Cart).filter(Cart.session_token == data.cart_session_token).first()
        if not cart or not cart.items:
            raise HTTPException(status_code=400, detail="Cart is empty or not found.")
        cart_to_clear = cart
        for ci in cart.items:
            if ci.product and ci.product.is_active:
                order_items_data.append((ci.product, ci.quantity))
    elif data.items:
        for item_in in data.items:
            prod = db.query(Product).filter(Product.id == item_in.product_id, Product.is_active == True).first()
            if not prod:
                raise HTTPException(status_code=404, detail=f"Product {item_in.product_id} not found")
            order_items_data.append((prod, item_in.quantity))
    else:
        raise HTTPException(status_code=400, detail="No products provided for the order.")

    if not order_items_data:
        raise HTTPException(status_code=400, detail="Order contains no valid products.")

    # 2. Compute totals & verify stock
    subtotal = 0.0
    for prod, qty in order_items_data:
        if prod.stock_quantity < qty:
            raise HTTPException(
                status_code=400, 
                detail=f"Insufficient stock for '{prod.name}'. Only {prod.stock_quantity} available."
            )
        subtotal += prod.price * qty

    # 3. Calculate delivery estimate & fee
    est_delivery = calculate_delivery_estimate(
        db=db,
        locality=data.locality,
        subtotal_pkr=subtotal,
        delivery_speed=data.delivery_speed
    )
    delivery_fee = est_delivery.final_fee_pkr
    total_amount = subtotal + delivery_fee

    # 4. Create Order Record
    order_number = generate_order_number()
    order = Order(
        order_number=order_number,
        user_id=user_id,
        customer_name=data.customer_name,
        customer_phone=data.customer_phone,
        customer_email=data.customer_email,
        city="Faisalabad",
        locality=data.locality,
        full_address=data.full_address,
        nearby_landmark=data.nearby_landmark,
        delivery_speed=data.delivery_speed,
        subtotal_pkr=subtotal,
        delivery_fee_pkr=delivery_fee,
        discount_pkr=0.0,
        total_amount_pkr=total_amount,
        payment_method=data.payment_method,
        payment_status="Pending" if data.payment_method == "Cash on Delivery" else "Paid",
        order_status="Pending",
        estimated_delivery_date=est_delivery.estimated_arrival,
        delivery_notes=data.delivery_notes
    )
    db.add(order)
    db.flush()

    # 5. Create Order Items & deduct stock
    for prod, qty in order_items_data:
        primary_img = next((img.image_url for img in prod.images if img.is_primary), None)
        if not primary_img and prod.images:
            primary_img = prod.images[0].image_url

        item_rec = OrderItem(
            order_id=order.id,
            product_id=prod.id,
            product_name=prod.name,
            product_sku=prod.sku,
            product_image=primary_img,
            unit_price_pkr=prod.price,
            quantity=qty,
            subtotal_pkr=prod.price * qty
        )
        db.add(item_rec)
        
        # Deduct stock
        prod.stock_quantity = max(0, prod.stock_quantity - qty)
        if prod.stock_quantity == 0:
            prod.availability_status = "Out of Stock"
        elif prod.stock_quantity < 5:
            prod.availability_status = "Low Stock"

    # 6. Clear cart if ordered from cart
    if cart_to_clear:
        for ci in cart_to_clear.items:
            db.delete(ci)

    db.commit()
    db.refresh(order)
    return order

def get_dashboard_metrics(db: Session) -> DashboardMetricsOut:
    total_orders = db.query(Order).count()
    total_sales = db.query(func.sum(Order.total_amount_pkr)).filter(Order.order_status != "Cancelled").scalar() or 0.0
    pending_orders = db.query(Order).filter(Order.order_status.in_(["Pending", "Confirmed", "Processing"])).count()
    total_products = db.query(Product).filter(Product.is_active == True).count()
    low_stock = db.query(Product).filter(Product.is_active == True, Product.stock_quantity < 5).count()
    recent = db.query(Order).order_by(Order.created_at.desc()).limit(10).all()

    return DashboardMetricsOut(
        total_orders=total_orders,
        total_sales_pkr=round(float(total_sales), 2),
        pending_orders=pending_orders,
        total_products=total_products,
        low_stock_products=low_stock,
        recent_orders=recent
    )
