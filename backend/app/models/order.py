from sqlalchemy import Column, Integer, String, Float, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    order_number = Column(String(50), unique=True, index=True, nullable=False) # e.g. FSD-2026-1001
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    
    # Customer Details
    customer_name = Column(String(100), nullable=False)
    customer_phone = Column(String(20), nullable=False)
    customer_email = Column(String(120), nullable=True)
    
    # Faisalabad Delivery Details
    city = Column(String(50), default="Faisalabad")
    locality = Column(String(100), nullable=False) # e.g. D Ground, Peoples Colony, Madina Town
    full_address = Column(Text, nullable=False)
    nearby_landmark = Column(String(150), nullable=True)
    delivery_speed = Column(String(50), default="Standard Delivery") # "Standard Delivery" or "Same-Day Express"
    
    # Financials (All in PKR)
    subtotal_pkr = Column(Float, nullable=False)
    delivery_fee_pkr = Column(Float, default=120.0)
    discount_pkr = Column(Float, default=0.0)
    total_amount_pkr = Column(Float, nullable=False)
    
    # Payment & Status
    payment_method = Column(String(50), default="Cash on Delivery") # Cash on Delivery, JazzCash, Easypaisa
    payment_status = Column(String(30), default="Pending") # Pending, Paid, Refunded
    order_status = Column(String(30), default="Pending", index=True) 
    # Statuses: Pending, Confirmed, Processing, Packed, Out for Delivery, Delivered, Cancelled
    
    estimated_delivery_date = Column(String(100), nullable=True)
    delivery_notes = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="orders")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")

class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=True)
    
    product_name = Column(String(200), nullable=False)
    product_sku = Column(String(50), nullable=True)
    product_image = Column(String(500), nullable=True)
    unit_price_pkr = Column(Float, nullable=False)
    quantity = Column(Integer, nullable=False, default=1)
    subtotal_pkr = Column(Float, nullable=False)

    order = relationship("Order", back_populates="items")
    product = relationship("Product", back_populates="order_items")
