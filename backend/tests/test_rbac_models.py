import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base
from app.models.role import Role, Permission
from app.models.user import User
from app.models.category import Category
from app.models.product import Product
from app.models.order import Order
from app.seed.seed_rbac import seed_rbac_data

# Use SQLite in-memory for testing isolation
TEST_DATABASE_URL = "sqlite:///:memory:"
test_engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

@pytest.fixture(scope="function")
def db_session():
    Base.metadata.create_all(bind=test_engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=test_engine)

def test_rbac_models_and_seed(db_session):
    seed_rbac_data(db_session)
    
    # Verify roles
    roles = {r.name: r for r in db_session.query(Role).all()}
    assert "admin" in roles
    assert "seller" in roles
    assert "rider" in roles
    assert "customer" in roles
    
    # Verify permissions count (15 standard permissions)
    permissions = db_session.query(Permission).all()
    assert len(permissions) == 15
    perm_codes = {p.code for p in permissions}
    assert "profile:read_write" in perm_codes
    assert "order:create" in perm_codes
    assert "order:assign_rider" in perm_codes
    assert "admin:rbac_manage" in perm_codes

    # Verify permissions on admin (all 15 permissions)
    admin_role = roles["admin"]
    assert len(admin_role.permissions) == 15

    # Verify permissions on seller
    seller_role = roles["seller"]
    seller_perm_codes = {p.code for p in seller_role.permissions}
    assert "product:create" in seller_perm_codes
    assert "product:view_own" in seller_perm_codes
    assert "product:update_own" in seller_perm_codes
    assert "product:delete_own" in seller_perm_codes
    assert "order:view_seller_items" in seller_perm_codes
    assert "profile:read_write" in seller_perm_codes
    
    # Verify permissions on rider
    rider_role = roles["rider"]
    rider_perm_codes = {p.code for p in rider_role.permissions}
    assert "profile:read_write" in rider_perm_codes
    assert "delivery:view_assigned" in rider_perm_codes
    assert "delivery:update_status" in rider_perm_codes

    # Verify permissions on customer
    customer_role = roles["customer"]
    customer_perm_codes = {p.code for p in customer_role.permissions}
    assert "profile:read_write" in customer_perm_codes
    assert "order:create" in customer_perm_codes
    assert "order:view_own" in customer_perm_codes

    # Verify demo accounts
    admin_user = db_session.query(User).filter(User.email == "admin@lyallpurbazaar.pk").first()
    assert admin_user is not None
    assert any(r.name == "admin" for r in admin_user.roles)
    assert admin_user.is_admin is True

    seller_user = db_session.query(User).filter(User.email == "seller@lyallpurbazaar.pk").first()
    assert seller_user is not None
    assert seller_user.business_name == "Kohinoor Mart"
    assert any(r.name == "seller" for r in seller_user.roles)

    rider_user = db_session.query(User).filter(User.email == "rider@lyallpurbazaar.pk").first()
    assert rider_user is not None
    assert rider_user.vehicle_type == "Honda CD 70"
    assert rider_user.vehicle_number == "FDN-2024-8841"
    assert any(r.name == "rider" for r in rider_user.roles)

    customer_user = db_session.query(User).filter(User.email == "customer@lyallpurbazaar.pk").first()
    assert customer_user is not None
    assert any(r.name == "customer" for r in customer_user.roles)

def test_rbac_relationships_and_extensions(db_session):
    seed_rbac_data(db_session)
    seller_user = db_session.query(User).filter(User.email == "seller@lyallpurbazaar.pk").first()
    rider_user = db_session.query(User).filter(User.email == "rider@lyallpurbazaar.pk").first()

    # Create a test Category since Product.category_id is non-nullable
    category = Category(name="Test Category", slug="test-category")
    db_session.add(category)
    db_session.flush()

    # Test Product.seller relationship
    product = Product(
        name="Test Seller Product",
        slug="test-seller-product",
        sku="TEST-SKU-001",
        category_id=category.id,
        price=100.0,
        seller_id=seller_user.id
    )
    db_session.add(product)
    db_session.flush()

    assert product.seller is not None
    assert product.seller.email == "seller@lyallpurbazaar.pk"
    assert product in seller_user.seller_products

    # Test Order.rider relationship
    order = Order(
        order_number="FSD-TEST-001",
        customer_name="Test Customer",
        customer_phone="03001234567",
        locality="D Ground",
        full_address="123 Test St",
        subtotal_pkr=100.0,
        total_amount_pkr=220.0,
        rider_id=rider_user.id,
        delivery_notes="Leave at gate"
    )
    db_session.add(order)
    db_session.flush()

    assert order.rider is not None
    assert order.rider.email == "rider@lyallpurbazaar.pk"
    assert order in rider_user.assigned_deliveries

def test_seed_rbac_idempotency(db_session):
    seed_rbac_data(db_session)
    # Running a second time should not crash or duplicate
    seed_rbac_data(db_session)
    assert db_session.query(Role).count() == 4
    assert db_session.query(Permission).count() == 15
