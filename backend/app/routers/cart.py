from typing import Optional
from fastapi import APIRouter, Depends, Header, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.schemas.cart import CartOut, CartItemCreate, CartItemUpdate
from app.services.cart_service import get_or_create_cart, add_to_cart, update_cart_item, remove_from_cart, format_cart_response
from app.services.auth_service import get_current_user_optional

router = APIRouter(prefix="/cart", tags=["Cart"])

@router.get("", response_model=CartOut)
def get_cart(
    session_token: Optional[str] = Query(None),
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    user_id = current_user.id if current_user else None
    cart = get_or_create_cart(db, session_token=session_token, user_id=user_id)
    return format_cart_response(db, cart)

@router.post("/items", response_model=CartOut)
def add_item(
    item: CartItemCreate,
    session_token: Optional[str] = Query(None),
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    user_id = current_user.id if current_user else None
    return add_to_cart(db, session_token=session_token, product_id=item.product_id, quantity=item.quantity, user_id=user_id)

@router.put("/items/{item_id}", response_model=CartOut)
def update_item(
    item_id: int,
    item: CartItemUpdate,
    db: Session = Depends(get_db)
):
    return update_cart_item(db, item_id=item_id, quantity=item.quantity)

@router.delete("/items/{item_id}", response_model=CartOut)
def delete_item(
    item_id: int,
    db: Session = Depends(get_db)
):
    return remove_from_cart(db, item_id=item_id)
