from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(100), nullable=False)
    email = Column(String(120), unique=True, index=True, nullable=True)
    phone_number = Column(String(20), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    is_admin = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    business_name = Column(String(150), nullable=True)
    vehicle_type = Column(String(100), nullable=True)
    vehicle_number = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    addresses = relationship("Address", back_populates="user", cascade="all, delete-orphan")
    orders = relationship("Order", foreign_keys="[Order.user_id]", back_populates="user")
    cart = relationship("Cart", back_populates="user", uselist=False)
    roles = relationship("Role", secondary="user_roles", back_populates="users")
    seller_products = relationship("Product", back_populates="seller")
    assigned_deliveries = relationship("Order", foreign_keys="[Order.rider_id]", back_populates="rider")

class Address(Base):
    __tablename__ = "addresses"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    title = Column(String(50), default="Home") # Home, Office, Other
    recipient_name = Column(String(100), nullable=False)
    phone_number = Column(String(20), nullable=False)
    city = Column(String(50), default="Faisalabad")
    locality = Column(String(100), nullable=False) # e.g. Peoples Colony, D Ground, Madina Town
    full_address = Column(Text, nullable=False)
    nearby_landmark = Column(String(150), nullable=True)
    is_default = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="addresses")
