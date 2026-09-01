import uuid
from typing import Optional
from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.models.cart import Cart, CartItem
from app.models.product import Product
from app.schemas.cart import CartOut, CartItemOut
from app.services.product_service import format_product_out
from app.config import settings

def get_or_create_cart(db: Session, session_token: Optional[str] = None, user_id: Optional[int] = None) -> Cart:
    cart = None
    if user_id:
        cart = db.query(Cart).filter(Cart.user_id == user_id).first()

    if not cart and session_token:
        cart = db.query(Cart).filter(Cart.session_token == session_token).first()

    if not cart:
        token = session_token or str(uuid.uuid4())
        cart = Cart(session_token=token, user_id=user_id)
        db.add(cart)
        db.commit()
        db.refresh(cart)
    elif user_id and not cart.user_id:
        # Associate anonymous cart with logged in user
        cart.user_id = user_id
        db.commit()
        db.refresh(cart)

    return cart

def format_cart_response(db: Session, cart: Cart) -> CartOut:
    items_out = []
    total_items = 0
    subtotal = 0.0

    for item in cart.items:
        if not item.product or not item.product.is_active:
            continue
        p_out = format_product_out(item.product)
        item_tot = item.quantity * item.product.price
        subtotal += item_tot
        total_items += item.quantity
        items_out.append(CartItemOut(
            id=item.id,
            product_id=item.product_id,
            product=p_out,
            quantity=item.quantity,
            unit_price=item.product.price,
            item_total=item_tot
        ))

    delivery_fee = 0.0 if subtotal >= settings.FREE_DELIVERY_THRESHOLD_PKR or total_items == 0 else settings.DEFAULT_DELIVERY_FEE_PKR
    free_delivery_rem = max(0.0, settings.FREE_DELIVERY_THRESHOLD_PKR - subtotal)
    est_total = subtotal + delivery_fee if total_items > 0 else 0.0

    return CartOut(
        id=cart.id,
        session_token=cart.session_token,
        items=items_out,
        total_items=total_items,
        subtotal_pkr=subtotal,
        delivery_fee_pkr=delivery_fee,
        free_delivery_threshold_pkr=settings.FREE_DELIVERY_THRESHOLD_PKR,
        free_delivery_remaining_pkr=free_delivery_rem,
        estimated_total_pkr=est_total
    )

def add_to_cart(db: Session, session_token: str, product_id: int, quantity: int = 1, user_id: Optional[int] = None) -> CartOut:
    cart = get_or_create_cart(db, session_token, user_id)
    product = db.query(Product).filter(Product.id == product_id, Product.is_active == True).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    existing_item = db.query(CartItem).filter(CartItem.cart_id == cart.id, CartItem.product_id == product_id).first()
    if existing_item:
        existing_item.quantity = min(existing_item.quantity + quantity, product.stock_quantity)
    else:
        new_qty = min(quantity, product.stock_quantity) if product.stock_quantity > 0 else 1
        item = CartItem(cart_id=cart.id, product_id=product_id, quantity=new_qty)
        db.add(item)

    db.commit()
    db.refresh(cart)
    return format_cart_response(db, cart)

def update_cart_item(db: Session, item_id: int, quantity: int) -> CartOut:
    item = db.query(CartItem).filter(CartItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Cart item not found")

    if quantity <= 0:
        cart_id = item.cart_id
        db.delete(item)
        db.commit()
        cart = db.query(Cart).filter(Cart.id == cart_id).first()
        return format_cart_response(db, cart)

    # Check stock
    if item.product and quantity > item.product.stock_quantity:
        quantity = item.product.stock_quantity

    item.quantity = quantity
    db.commit()
    db.refresh(item.cart)
    return format_cart_response(db, item.cart)

def remove_from_cart(db: Session, item_id: int) -> CartOut:
    item = db.query(CartItem).filter(CartItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Cart item not found")

    cart = item.cart
    db.delete(item)
    db.commit()
    db.refresh(cart)
    return format_cart_response(db, cart)
