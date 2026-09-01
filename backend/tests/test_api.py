import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
import app.models # ensure all models are registered
from app.main import app
from app.database import Base, get_db
from app.seed.seed_data import seed_database

# Create in-memory SQLite database with StaticPool so all connections share the same memory database
TEST_DATABASE_URL = "sqlite:///:memory:"
test_engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=test_engine)
    db = TestingSessionLocal()
    seed_database(db)
    db.close()
    yield
    Base.metadata.drop_all(bind=test_engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)

def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["city"] == "Faisalabad, Pakistan"
    assert data["marketplace"] == "Lyallpur Bazaar"

def test_categories_endpoint():
    response = client.get("/api/categories")
    assert response.status_code == 200
    cats = response.json()
    assert len(cats) >= 5
    slugs = [c["slug"] for c in cats]
    assert "grocery-staples" in slugs
    assert "household-cleaning" in slugs

def test_products_list_and_facets():
    response = client.get("/api/products?limit=10")
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert len(data["items"]) > 0
    assert data["total"] >= 15
    assert len(data["categories"]) > 0

def test_exact_and_fuzzy_search():
    # Test searching for "Surf Excel"
    response = client.get("/api/search?q=Surf")
    assert response.status_code == 200
    data = response.json()
    assert data["is_exact_match"] is True
    assert len(data["items"]) > 0
    assert any("Surf" in p["name"] for p in data["items"])

def test_search_unavailable_item_returns_alternatives():
    # Searching for something not present will trigger smart alternatives
    response = client.get("/api/search?q=NonExistentSuperSoap123")
    assert response.status_code == 200
    data = response.json()
    assert data["is_exact_match"] is False
    assert len(data["alternative_suggestions"]) > 0

def test_search_suggestions():
    response = client.get("/api/search/suggestions?q=dalda")
    assert response.status_code == 200
    suggs = response.json()
    assert len(suggs) > 0
    assert any("Dalda" in s["title"] for s in suggs)

def test_product_detail_and_alternatives():
    # Get a product
    response = client.get("/api/products/dalda-fortified-cooking-oil-1l-x5")
    assert response.status_code == 200
    prod = response.json()
    assert prod["name"] == "Dalda Fortified Cooking Oil Pouch 1 Litre x 5"
    assert len(prod["specifications"]) > 0
    assert "similar_products" in prod
    assert "alternative_products" in prod

def test_cart_operations():
    # 1. Add item to cart
    session_token = "test-session-fsd-101"
    response = client.post(f"/api/cart/items?session_token={session_token}", json={"product_id": 1, "quantity": 2})
    assert response.status_code == 200
    cart = response.json()
    assert cart["total_items"] == 2
    assert cart["subtotal_pkr"] > 0
    item_id = cart["items"][0]["id"]

    # 2. Update quantity
    response = client.put(f"/api/cart/items/{item_id}", json={"quantity": 3})
    assert response.status_code == 200
    updated_cart = response.json()
    assert updated_cart["total_items"] == 3

    # 3. Delete item
    response = client.delete(f"/api/cart/items/{item_id}")
    assert response.status_code == 200
    empty_cart = response.json()
    assert empty_cart["total_items"] == 0

def test_faisalabad_delivery_estimate():
    response = client.post("/api/delivery/estimate", json={
        "locality": "D Ground & Peoples Colony No. 1",
        "subtotal_pkr": 1500.0,
        "delivery_speed": "Standard Delivery"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["is_valid_zone"] is True
    assert data["base_fee_pkr"] > 0
    assert "Same-Day Delivery" in data["cutoff_time_notice"]

    # Free delivery threshold test (>= 2500 PKR)
    response_free = client.post("/api/delivery/estimate", json={
        "locality": "Madina Town & Susan Road",
        "subtotal_pkr": 3000.0,
        "delivery_speed": "Standard Delivery"
    })
    assert response_free.json()["free_delivery_applied"] is True
    assert response_free.json()["final_fee_pkr"] == 0.0

def test_auth_and_order_flow():
    # 1. Register a new user
    user_payload = {
        "full_name": "Ali Raza",
        "phone_number": "03009988776",
        "email": "aliraza@example.com",
        "password": "SecretPassword123"
    }
    reg_resp = client.post("/api/auth/register", json=user_payload)
    assert reg_resp.status_code == 200
    token = reg_resp.json()["access_token"]
    assert token is not None

    # 2. Place an order in Faisalabad
    order_payload = {
        "customer_name": "Ali Raza",
        "customer_phone": "03009988776",
        "customer_email": "aliraza@example.com",
        "city": "Faisalabad",
        "locality": "Kohinoor City & Jaranwala Road",
        "full_address": "Flat 302, Kohinoor Executive Tower, Faisalabad",
        "nearby_landmark": "Near Kohinoor Plaza",
        "delivery_speed": "Standard Delivery",
        "payment_method": "Cash on Delivery",
        "items": [{"product_id": 1, "quantity": 1}]
    }
    order_resp = client.post("/api/orders", json=order_payload, headers={"Authorization": f"Bearer {token}"})
    assert order_resp.status_code == 200
    order_data = order_resp.json()
    assert order_data["order_number"].startswith("FSD-")
    assert order_data["total_amount_pkr"] > 0
    assert order_data["order_status"] == "Pending"

    # 3. Track order publicly
    track_resp = client.get(f"/api/orders/track/{order_data['order_number']}")
    assert track_resp.status_code == 200
    assert track_resp.json()["order_number"] == order_data["order_number"]

def test_admin_dashboard():
    # Login as seeded admin
    admin_login = client.post("/api/auth/login", json={
        "phone_or_email": "admin@lyallpurbazaar.pk",
        "password": "Admin@123"
    })
    assert admin_login.status_code == 200
    admin_token = admin_login.json()["access_token"]

    dashboard_resp = client.get("/api/admin/dashboard", headers={"Authorization": f"Bearer {admin_token}"})
    assert dashboard_resp.status_code == 200
    metrics = dashboard_resp.json()
    assert metrics["total_products"] > 0
    assert "total_sales_pkr" in metrics
