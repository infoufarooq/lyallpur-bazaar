from sqlalchemy import Column, Integer, String, Float, Boolean, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    seller_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    name = Column(String(200), index=True, nullable=False)
    slug = Column(String(250), unique=True, index=True, nullable=False)
    sku = Column(String(50), unique=True, index=True, nullable=False)
    description = Column(Text, nullable=True)
    
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=False, index=True)
    brand_id = Column(Integer, ForeignKey("brands.id"), nullable=True, index=True)
    
    price = Column(Float, nullable=False, index=True) # Selling price in PKR
    original_price = Column(Float, nullable=True) # Retail/Market price in PKR
    discount_percent = Column(Integer, default=0) # Calculated or explicit discount %
    
    stock_quantity = Column(Integer, default=10, index=True)
    availability_status = Column(String(30), default="In Stock") # In Stock, Low Stock, Out of Stock
    
    pack_size = Column(String(50), nullable=True) # e.g. 1kg, 500g, Pack of 3, 1.5L
    unit = Column(String(30), nullable=True) # kg, g, L, piece, pack
    
    search_keywords = Column(Text, nullable=True) # space/comma-separated search tokens for relevance
    
    is_active = Column(Boolean, default=True, index=True)
    is_featured = Column(Boolean, default=False)
    is_best_deal = Column(Boolean, default=False)
    
    rating = Column(Float, default=4.5)
    review_count = Column(Integer, default=12)
    
    estimated_delivery_days = Column(Integer, default=1) # 0 = Same Day, 1 = 1-2 Days
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    category = relationship("Category", back_populates="products")
    brand = relationship("Brand", back_populates="products")
    seller = relationship("User", back_populates="seller_products")
    images = relationship("ProductImage", back_populates="product", cascade="all, delete-orphan", order_by="ProductImage.display_order")
    specifications = relationship("ProductSpecification", back_populates="product", cascade="all, delete-orphan", order_by="ProductSpecification.display_order")
    cart_items = relationship("CartItem", back_populates="product")
    order_items = relationship("OrderItem", back_populates="product")

class ProductImage(Base):
    __tablename__ = "product_images"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False, index=True)
    image_url = Column(String(500), nullable=False)
    alt_text = Column(String(200), nullable=True)
    is_primary = Column(Boolean, default=False)
    display_order = Column(Integer, default=0)

    product = relationship("Product", back_populates="images")

class ProductSpecification(Base):
    __tablename__ = "product_specifications"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False, index=True)
    spec_key = Column(String(100), nullable=False) # e.g. "Weight", "Origin", "Expiry", "Flavor"
    spec_value = Column(String(255), nullable=False) # e.g. "1 Kilogram", "Pakistan", "12 Months"
    display_order = Column(Integer, default=0)

    product = relationship("Product", back_populates="specifications")
