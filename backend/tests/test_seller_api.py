import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import app.models  # ensure models are registered
from app.main import app
from app.database import Base, get_db
from app.seed.seed_rbac import seed_rbac_data
from app.models.user import User
from app.models.role import Role
from app.models.category import Category
from app.models.product import Product
from app.models.order import Order, OrderItem
from app.services.auth_service import get_password_hash

TEST_DATABASE_URL = "sqlite:///:memory:"
test_engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

@pytest.fixture(scope="module")
def seller_test_client():
    Base.metadata.create_all(bind=test_engine)
    db = TestingSessionLocal()
    seed_rbac_data(db)

    # Ensure Category 6 and others exist
    cat_names = [
        "Grocery & Staples",
        "Beverages & Dairy",
        "Household & Cleaning",
        "Personal Care",
        "Baby Care",
        "Electronics & Appliances",
        "Mobile Accessories",
        "Home & Kitchen",
        "Faisalabad Textiles & Fashion",
        "Health & Wellness",
    ]
    for idx, name in enumerate(cat_names, start=1):
        existing_cat = db.query(Category).filter(Category.id == idx).first()
        if not existing_cat:
            cat = Category(
                id=idx,
                name=name,
                slug=name.lower().replace(" & ", "-").replace(" ", "-"),
                icon_name="ShoppingBag",
                display_order=idx
            )
            db.add(cat)
    db.commit()

    # Create a second seller account for multi-vendor isolation tests
    seller_role = db.query(Role).filter(Role.name == "seller").first()
    seller2 = db.query(User).filter(User.email == "seller2@lyallpurbazaar.pk").first()
    if not seller2:
        seller2 = User(
            email="seller2@lyallpurbazaar.pk",
            phone_number="03009998877",
            full_name="Chenab Crafts Merchant",
            hashed_password=get_password_hash("Seller2@123"),
            is_admin=False,
            is_active=True,
            business_name="Chenab Crafts"
        )
        db.add(seller2)
        db.flush()
        if seller_role:
            seller2.roles.append(seller_role)
        db.commit()

    db.close()

    def override_get_db():
        session = TestingSessionLocal()
        try:
            yield session
        finally:
            session.close()

    prev_overrides = dict(app.dependency_overrides)
    app.dependency_overrides[get_db] = override_get_db
    client = TestClient(app)

    yield client

    app.dependency_overrides.clear()
    app.dependency_overrides.update(prev_overrides)
    Base.metadata.drop_all(bind=test_engine)

def get_auth_token(client: TestClient, email: str, password: str) -> str:
    res = client.post("/api/auth/login", json={"phone_or_email": email, "password": password})
    assert res.status_code == 200
    return res.json()["access_token"]

def test_seller_isolation(seller_test_client):
    client = seller_test_client
    # Login as seller
    res = client.post("/api/auth/login", json={"phone_or_email": "seller@lyallpurbazaar.pk", "password": "Seller@123"})
    assert res.status_code == 200
    token = res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # 1. Fetch dashboard
    dash_res = client.get("/api/seller/dashboard", headers=headers)
    assert dash_res.status_code == 200
    assert "total_products" in dash_res.json()
    
    # 2. Create product owned by this seller
    new_prod = {
        "name": "Kohinoor Premium Lawn Suit",
        "slug": "kohinoor-premium-lawn-suit",
        "category_id": 6,
        "brand_name": "Kohinoor",
        "regular_price": 4500,
        "sale_price": 3800,
        "stock_quantity": 25,
        "unit": "3 Piece",
        "short_description": "Finest cotton lawn textile from Faisalabad."
    }
    create_res = client.post("/api/seller/products", json=new_prod, headers=headers)
    assert create_res.status_code == 200
    prod_data = create_res.json()
    assert prod_data["seller_id"] is not None
    assert prod_data["name"] == "Kohinoor Premium Lawn Suit"
    assert prod_data["price"] == 3800
    assert prod_data["original_price"] == 4500

def test_seller_catalog_isolation_between_vendors(seller_test_client):
    client = seller_test_client
    seller1_token = get_auth_token(client, "seller@lyallpurbazaar.pk", "Seller@123")
    seller2_token = get_auth_token(client, "seller2@lyallpurbazaar.pk", "Seller2@123")
    headers1 = {"Authorization": f"Bearer {seller1_token}"}
    headers2 = {"Authorization": f"Bearer {seller2_token}"}

    # Seller 2 creates their own product
    seller2_prod = {
        "name": "Chenab Handwoven Bed Sheet Set",
        "slug": "chenab-handwoven-bed-sheet-set",
        "category_id": 6,
        "brand_name": "Chenab",
        "regular_price": 3200,
        "sale_price": 2800,
        "stock_quantity": 15,
        "unit": "King Size",
        "short_description": "Pure cotton handwoven sheet from Chenab artisans."
    }
    res2 = client.post("/api/seller/products", json=seller2_prod, headers=headers2)
    assert res2.status_code == 200
    prod2 = res2.json()

    # Seller 1 lists products -> should see Kohinoor suit, should NOT see Chenab bed sheet
    s1_list_res = client.get("/api/seller/products", headers=headers1)
    assert s1_list_res.status_code == 200
    s1_products = s1_list_res.json()
    s1_names = [p["name"] for p in s1_products]
    assert "Kohinoor Premium Lawn Suit" in s1_names
    assert "Chenab Handwoven Bed Sheet Set" not in s1_names

    # Seller 2 lists products -> should see Chenab bed sheet, should NOT see Kohinoor suit
    s2_list_res = client.get("/api/seller/products", headers=headers2)
    assert s2_list_res.status_code == 200
    s2_products = s2_list_res.json()
    s2_names = [p["name"] for p in s2_products]
    assert "Chenab Handwoven Bed Sheet Set" in s2_names
    assert "Kohinoor Premium Lawn Suit" not in s2_names

def test_seller_cannot_modify_or_delete_other_seller_product(seller_test_client):
    client = seller_test_client
    seller1_token = get_auth_token(client, "seller@lyallpurbazaar.pk", "Seller@123")
    seller2_token = get_auth_token(client, "seller2@lyallpurbazaar.pk", "Seller2@123")
    headers1 = {"Authorization": f"Bearer {seller1_token}"}
    headers2 = {"Authorization": f"Bearer {seller2_token}"}

    # Fetch Seller 1's product
    s1_products = client.get("/api/seller/products", headers=headers1).json()
    prod1 = next(p for p in s1_products if p["name"] == "Kohinoor Premium Lawn Suit")

    # Seller 2 attempts to mutate Seller 1's product -> 403 Forbidden
    hack_res = client.put(
        f"/api/seller/products/{prod1['id']}",
        json={"sale_price": 100, "name": "Hacked Lawn Suit"},
        headers=headers2
    )
    assert hack_res.status_code == 403
    assert "ownership" in hack_res.json()["detail"].lower()

    # Seller 2 attempts to view Seller 1's product via seller portal -> 403 Forbidden
    view_res = client.get(f"/api/seller/products/{prod1['id']}", headers=headers2)
    assert view_res.status_code == 403

    # Seller 2 attempts to deactivate/delete Seller 1's product -> 403 Forbidden
    del_res = client.delete(f"/api/seller/products/{prod1['id']}", headers=headers2)
    assert del_res.status_code == 403

def test_admin_can_modify_and_delete_any_seller_product(seller_test_client):
    client = seller_test_client
    admin_token = get_auth_token(client, "admin@lyallpurbazaar.pk", "Admin@123")
    seller2_token = get_auth_token(client, "seller2@lyallpurbazaar.pk", "Seller2@123")
    headers_admin = {"Authorization": f"Bearer {admin_token}"}
    headers_seller2 = {"Authorization": f"Bearer {seller2_token}"}

    # Fetch Seller 2's product
    s2_products = client.get("/api/seller/products", headers=headers_seller2).json()
    prod2 = next(p for p in s2_products if p["name"] == "Chenab Handwoven Bed Sheet Set")

    # Admin updates Seller 2's product via seller endpoint -> 200 OK
    admin_update_res = client.put(
        f"/api/seller/products/{prod2['id']}",
        json={"sale_price": 2750, "stock_quantity": 4},
        headers=headers_admin
    )
    assert admin_update_res.status_code == 200
    updated_data = admin_update_res.json()
    assert updated_data["price"] == 2750
    assert updated_data["stock_quantity"] == 4
    assert updated_data["availability_status"] == "Low Stock"

    # Admin soft-deletes Seller 2's product -> 200 OK
    admin_del_res = client.delete(
        f"/api/seller/products/{prod2['id']}",
        headers=headers_admin
    )
    assert admin_del_res.status_code == 200
    assert admin_del_res.json()["is_active"] is False

def test_seller_orders_isolation(seller_test_client):
    client = seller_test_client
    seller1_token = get_auth_token(client, "seller@lyallpurbazaar.pk", "Seller@123")
    seller2_token = get_auth_token(client, "seller2@lyallpurbazaar.pk", "Seller2@123")
    headers1 = {"Authorization": f"Bearer {seller1_token}"}
    headers2 = {"Authorization": f"Bearer {seller2_token}"}

    # Insert an order with items from both Seller 1 and Seller 2 directly into db
    db = TestingSessionLocal()
    seller1 = db.query(User).filter(User.email == "seller@lyallpurbazaar.pk").first()
    seller2 = db.query(User).filter(User.email == "seller2@lyallpurbazaar.pk").first()
    prod1 = db.query(Product).filter(Product.seller_id == seller1.id).first()
    prod2 = db.query(Product).filter(Product.seller_id == seller2.id).first()

    multi_order = Order(
        order_number="FSD-2026-MULTI01",
        customer_name="Faisalabad Resident",
        customer_phone="03005554433",
        locality="Peoples Colony No. 1",
        full_address="House 10, Street 2, Peoples Colony",
        subtotal_pkr=prod1.price + prod2.price,
        delivery_fee_pkr=120.0,
        total_amount_pkr=prod1.price + prod2.price + 120.0,
        order_status="Confirmed",
    )
    db.add(multi_order)
    db.flush()

    item1 = OrderItem(
        order_id=multi_order.id,
        product_id=prod1.id,
        product_name=prod1.name,
        product_sku=prod1.sku,
        unit_price_pkr=prod1.price,
        quantity=1,
        subtotal_pkr=prod1.price
    )
    item2 = OrderItem(
        order_id=multi_order.id,
        product_id=prod2.id,
        product_name=prod2.name,
        product_sku=prod2.sku,
        unit_price_pkr=prod2.price,
        quantity=1,
        subtotal_pkr=prod2.price
    )
    db.add(item1)
    db.add(item2)
    prod1_name = prod1.name
    prod2_name = prod2.name
    db.commit()
    db.close()

    # Seller 1 fetches orders -> should ONLY see item1 (Kohinoor), NOT item2 (Chenab)
    s1_orders_res = client.get("/api/seller/orders", headers=headers1)
    assert s1_orders_res.status_code == 200
    s1_items = s1_orders_res.json()
    assert any(it["product_name"] == prod1_name for it in s1_items)
    assert not any(it["product_name"] == prod2_name for it in s1_items)

    # Seller 2 fetches orders -> should ONLY see item2 (Chenab), NOT item1 (Kohinoor)
    s2_orders_res = client.get("/api/seller/orders", headers=headers2)
    assert s2_orders_res.status_code == 200
    s2_items = s2_orders_res.json()
    assert any(it["product_name"] == prod2_name for it in s2_items)
    assert not any(it["product_name"] == prod1_name for it in s2_items)

def test_seller_dashboard_metrics(seller_test_client):
    client = seller_test_client
    seller1_token = get_auth_token(client, "seller@lyallpurbazaar.pk", "Seller@123")
    headers1 = {"Authorization": f"Bearer {seller1_token}"}

    dash_res = client.get("/api/seller/dashboard", headers=headers1)
    assert dash_res.status_code == 200
    data = dash_res.json()
    assert data["total_products"] >= 1
    assert "low_stock_count" in data
    assert data["total_revenue_pkr"] > 0
    assert data["total_orders_count"] >= 1

def test_customer_and_rider_forbidden_from_seller_portal(seller_test_client):
    client = seller_test_client
    customer_token = get_auth_token(client, "customer@lyallpurbazaar.pk", "Customer@123")
    rider_token = get_auth_token(client, "rider@lyallpurbazaar.pk", "Rider@123")

    # Customer forbidden
    res = client.get("/api/seller/dashboard", headers={"Authorization": f"Bearer {customer_token}"})
    assert res.status_code == 403

    # Rider forbidden
    res2 = client.get("/api/seller/products", headers={"Authorization": f"Bearer {rider_token}"})
    assert res2.status_code == 403

def test_unauthenticated_forbidden(seller_test_client):
    client = seller_test_client
    res = client.get("/api/seller/dashboard")
    assert res.status_code == 401

def test_seller_product_not_found(seller_test_client):
    client = seller_test_client
    seller1_token = get_auth_token(client, "seller@lyallpurbazaar.pk", "Seller@123")
    headers = {"Authorization": f"Bearer {seller1_token}"}

    # 404 on non-existent product update
    res = client.put("/api/seller/products/999999", json={"sale_price": 500}, headers=headers)
    assert res.status_code == 404

    # 404 on non-existent product delete
    res_del = client.delete("/api/seller/products/999999", headers=headers)
    assert res_del.status_code == 404
