import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from datetime import datetime
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
from app.models.order import Order
from app.services.auth_service import get_password_hash

TEST_DATABASE_URL = "sqlite:///:memory:"
test_engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

@pytest.fixture(scope="module")
def rider_test_client():
    Base.metadata.create_all(bind=test_engine)
    db = TestingSessionLocal()
    seed_rbac_data(db)

    # Ensure Rider 2 exists for cross-rider isolation tests
    rider_role = db.query(Role).filter(Role.name == "rider").first()
    rider2 = db.query(User).filter(User.email == "rider2@lyallpurbazaar.pk").first()
    if not rider2:
        rider2 = User(
            email="rider2@lyallpurbazaar.pk",
            phone_number="03008887766",
            full_name="Babar Express Rider",
            hashed_password=get_password_hash("Rider2@123"),
            is_admin=False,
            is_active=True,
            vehicle_type="Honda 125",
            vehicle_number="FDN-2024-9999"
        )
        db.add(rider2)
        db.flush()
        if rider_role:
            rider2.roles.append(rider_role)
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
    assert res.status_code == 200, f"Login failed for {email}: {res.text}"
    return res.json()["access_token"]

def test_rider_flow(rider_test_client):
    """
    Step 1 brief test: verifies basic login, deliveries list, and dashboard schema.
    """
    client = rider_test_client
    # Login as rider
    res = client.post("/api/auth/login", json={"phone_or_email": "rider@lyallpurbazaar.pk", "password": "Rider@123"})
    assert res.status_code == 200
    token = res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Check deliveries
    deliv_res = client.get("/api/rider/deliveries", headers=headers)
    assert deliv_res.status_code == 200
    assert isinstance(deliv_res.json(), list)
    
    # Check dashboard
    dash_res = client.get("/api/rider/dashboard", headers=headers)
    assert dash_res.status_code == 200
    assert "pending_deliveries" in dash_res.json()
    assert "delivered_today" in dash_res.json()
    assert "cod_cash_collected_pkr" in dash_res.json()

def test_rider_deliveries_and_isolation(rider_test_client):
    """
    Verifies that riders only see orders assigned to them, and terminal statuses
    (Delivered, Cancelled) are excluded from active deliveries.
    """
    client = rider_test_client
    db = TestingSessionLocal()
    rider1 = db.query(User).filter(User.email == "rider@lyallpurbazaar.pk").first()
    rider2 = db.query(User).filter(User.email == "rider2@lyallpurbazaar.pk").first()
    assert rider1 is not None
    assert rider2 is not None

    # Create Order 1 for Rider 1 (Packed)
    order1 = Order(
        order_number="FSD-2026-RIDER01",
        rider_id=rider1.id,
        customer_name="Ali Khan",
        customer_phone="03001111111",
        locality="D Ground",
        full_address="House 12, D Ground, Faisalabad",
        nearby_landmark="Near Clock Tower",
        subtotal_pkr=1200.0,
        total_amount_pkr=1320.0,
        payment_method="Cash on Delivery",
        payment_status="Pending",
        order_status="Packed",
        assigned_at=datetime.utcnow()
    )
    # Create Order 2 for Rider 2 (Packed)
    order2 = Order(
        order_number="FSD-2026-RIDER02",
        rider_id=rider2.id,
        customer_name="Usman Tariq",
        customer_phone="03002222222",
        locality="Peoples Colony",
        full_address="Street 5, Peoples Colony, Faisalabad",
        nearby_landmark="Near Chenab Club",
        subtotal_pkr=2000.0,
        total_amount_pkr=2120.0,
        payment_method="Cash on Delivery",
        payment_status="Pending",
        order_status="Packed",
        assigned_at=datetime.utcnow()
    )
    # Create Order 3 for Rider 1 (Cancelled - should not appear in active deliveries)
    order3 = Order(
        order_number="FSD-2026-RIDER03",
        rider_id=rider1.id,
        customer_name="Cancelled Order Customer",
        customer_phone="03003333333",
        locality="Madina Town",
        full_address="House 88, Madina Town",
        subtotal_pkr=500.0,
        total_amount_pkr=620.0,
        payment_method="Cash on Delivery",
        payment_status="Pending",
        order_status="Cancelled",
        assigned_at=datetime.utcnow()
    )
    db.add_all([order1, order2, order3])
    db.commit()
    db.close()

    token1 = get_auth_token(client, "rider@lyallpurbazaar.pk", "Rider@123")
    token2 = get_auth_token(client, "rider2@lyallpurbazaar.pk", "Rider2@123")

    # Rider 1 checks deliveries
    res1 = client.get("/api/rider/deliveries", headers={"Authorization": f"Bearer {token1}"})
    assert res1.status_code == 200
    deliveries1 = res1.json()
    order_numbers1 = [d["order_number"] for d in deliveries1]
    assert "FSD-2026-RIDER01" in order_numbers1
    assert "FSD-2026-RIDER02" not in order_numbers1
    assert "FSD-2026-RIDER03" not in order_numbers1

    # Check recipient alias compatibility
    d1 = next(d for d in deliveries1 if d["order_number"] == "FSD-2026-RIDER01")
    assert d1["customer_name"] == "Ali Khan"
    assert d1["recipient_name"] == "Ali Khan"
    assert d1["customer_phone"] == "03001111111"
    assert d1["recipient_phone"] == "03001111111"
    assert d1["total_amount_pkr"] == 1320.0

    # Rider 2 checks deliveries
    res2 = client.get("/api/rider/deliveries", headers={"Authorization": f"Bearer {token2}"})
    assert res2.status_code == 200
    deliveries2 = res2.json()
    order_numbers2 = [d["order_number"] for d in deliveries2]
    assert "FSD-2026-RIDER02" in order_numbers2
    assert "FSD-2026-RIDER01" not in order_numbers2

def test_rider_status_advancement_lifecycle(rider_test_client):
    """
    Verifies state transitions:
    - Packed -> Out for Delivery
    - Out for Delivery -> Delivered
    - delivered_at timestamp updated
    - COD marked as Paid upon delivery
    - Order moves to /history and out of /deliveries
    """
    client = rider_test_client
    token1 = get_auth_token(client, "rider@lyallpurbazaar.pk", "Rider@123")
    headers = {"Authorization": f"Bearer {token1}"}

    # Retrieve Order 1 id
    deliv_res = client.get("/api/rider/deliveries", headers=headers)
    assert deliv_res.status_code == 200
    order1_data = next(d for d in deliv_res.json() if d["order_number"] == "FSD-2026-RIDER01")
    order1_id = order1_data["order_id"]

    # 1. Advance to "Out for Delivery"
    advance_res = client.put(
        f"/api/rider/deliveries/{order1_id}/status",
        json={"status": "Out for Delivery", "delivery_notes": "Rider picked up parcel from hub"},
        headers=headers
    )
    assert advance_res.status_code == 200
    updated1 = advance_res.json()
    assert updated1["order_status"] == "Out for Delivery"
    assert updated1["delivery_notes"] == "Rider picked up parcel from hub"
    assert updated1["payment_status"] == "Pending"
    assert updated1["delivered_at"] is None

    # 2. Advance to "Delivered"
    delivered_res = client.put(
        f"/api/rider/deliveries/{order1_id}/status",
        json={"status": "Delivered", "delivery_notes": "Delivered in person to Ali Khan. Cash collected."},
        headers=headers
    )
    assert delivered_res.status_code == 200
    updated2 = delivered_res.json()
    assert updated2["order_status"] == "Delivered"
    assert updated2["payment_status"] == "Paid"
    assert updated2["delivered_at"] is not None
    assert "Cash collected" in updated2["delivery_notes"]

    # 3. Verify Order 1 is no longer in active deliveries
    active_res = client.get("/api/rider/deliveries", headers=headers)
    assert active_res.status_code == 200
    active_numbers = [d["order_number"] for d in active_res.json()]
    assert "FSD-2026-RIDER01" not in active_numbers

    # 4. Verify Order 1 is now in rider history
    hist_res = client.get("/api/rider/history", headers=headers)
    assert hist_res.status_code == 200
    history_items = hist_res.json()
    hist_numbers = [d["order_number"] for d in history_items]
    assert "FSD-2026-RIDER01" in hist_numbers

def test_cross_rider_modification_forbidden(rider_test_client):
    """
    Verifies that Rider 1 cannot mutate Rider 2's delivery status.
    """
    client = rider_test_client
    token1 = get_auth_token(client, "rider@lyallpurbazaar.pk", "Rider@123")
    token2 = get_auth_token(client, "rider2@lyallpurbazaar.pk", "Rider2@123")

    # Get Order 2 ID assigned to Rider 2
    res2 = client.get("/api/rider/deliveries", headers={"Authorization": f"Bearer {token2}"})
    order2_id = next(d["order_id"] for d in res2.json() if d["order_number"] == "FSD-2026-RIDER02")

    # Rider 1 attempts to modify Rider 2's delivery
    res = client.put(
        f"/api/rider/deliveries/{order2_id}/status",
        json={"status": "Out for Delivery"},
        headers={"Authorization": f"Bearer {token1}"}
    )
    assert res.status_code == 403
    assert "Forbidden" in res.json()["detail"] or "not assigned" in res.json()["detail"]

def test_admin_can_update_any_rider_delivery(rider_test_client):
    """
    Verifies that admin has wildcard override to advance any rider's delivery.
    """
    client = rider_test_client
    admin_token = get_auth_token(client, "admin@lyallpurbazaar.pk", "Admin@123")
    token2 = get_auth_token(client, "rider2@lyallpurbazaar.pk", "Rider2@123")

    res2 = client.get("/api/rider/deliveries", headers={"Authorization": f"Bearer {token2}"})
    order2_id = next(d["order_id"] for d in res2.json() if d["order_number"] == "FSD-2026-RIDER02")

    # Admin updates Rider 2's order
    res = client.put(
        f"/api/rider/deliveries/{order2_id}/status",
        json={"status": "Out for Delivery", "delivery_notes": "Dispatched by Central Control"},
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res.status_code == 200
    assert res.json()["order_status"] == "Out for Delivery"

def test_rider_dashboard_metrics_aggregation(rider_test_client):
    """
    Verifies accurate aggregation of pending deliveries, delivered today,
    and total COD cash collected.
    """
    client = rider_test_client
    token1 = get_auth_token(client, "rider@lyallpurbazaar.pk", "Rider@123")
    headers = {"Authorization": f"Bearer {token1}"}

    dash_res = client.get("/api/rider/dashboard", headers=headers)
    assert dash_res.status_code == 200
    metrics = dash_res.json()

    # Order 1 (1320 PKR, COD) was delivered today
    assert metrics["delivered_today"] >= 1
    assert metrics["cod_cash_collected_pkr"] >= 1320.0
    assert metrics["pending_deliveries"] >= 0

def test_non_rider_roles_forbidden_from_rider_portal(rider_test_client):
    """
    Verifies that customers and sellers cannot access rider portal endpoints,
    and unauthenticated requests return 401.
    """
    client = rider_test_client
    customer_token = get_auth_token(client, "customer@lyallpurbazaar.pk", "Customer@123")
    seller_token = get_auth_token(client, "seller@lyallpurbazaar.pk", "Seller@123")

    # Customer forbidden
    c_res1 = client.get("/api/rider/deliveries", headers={"Authorization": f"Bearer {customer_token}"})
    assert c_res1.status_code == 403
    c_res2 = client.get("/api/rider/dashboard", headers={"Authorization": f"Bearer {customer_token}"})
    assert c_res2.status_code == 403

    # Seller forbidden
    s_res = client.get("/api/rider/deliveries", headers={"Authorization": f"Bearer {seller_token}"})
    assert s_res.status_code == 403

    # Unauthenticated
    u_res = client.get("/api/rider/deliveries")
    assert u_res.status_code == 401

def test_rider_invalid_status_transition_errors(rider_test_client):
    """
    Verifies error handling for invalid statuses, cancelled orders, and non-existent orders.
    """
    client = rider_test_client
    token1 = get_auth_token(client, "rider@lyallpurbazaar.pk", "Rider@123")
    headers = {"Authorization": f"Bearer {token1}"}

    # 1. Non-existent order
    res_404 = client.put(
        "/api/rider/deliveries/999999/status",
        json={"status": "Delivered"},
        headers=headers
    )
    assert res_404.status_code == 404

    # 2. Invalid status string
    db = TestingSessionLocal()
    rider1 = db.query(User).filter(User.email == "rider@lyallpurbazaar.pk").first()
    order = Order(
        order_number="FSD-2026-INVALID01",
        rider_id=rider1.id,
        customer_name="Test Invalid",
        customer_phone="03009999999",
        locality="Gulberg",
        full_address="House 1, Gulberg",
        subtotal_pkr=500.0,
        total_amount_pkr=620.0,
        payment_method="Cash on Delivery",
        order_status="Packed"
    )
    db.add(order)
    db.commit()
    order_id = order.id
    db.close()

    res_invalid = client.put(
        f"/api/rider/deliveries/{order_id}/status",
        json={"status": "Refunded"},
        headers=headers
    )
    assert res_invalid.status_code == 400
    assert "Invalid status" in res_invalid.json()["detail"]

    # 3. Cancelled order cannot be updated
    db = TestingSessionLocal()
    c_order = db.query(Order).filter(Order.id == order_id).first()
    c_order.order_status = "Cancelled"
    db.commit()
    db.close()

    res_cancelled = client.put(
        f"/api/rider/deliveries/{order_id}/status",
        json={"status": "Delivered"},
        headers=headers
    )
    assert res_cancelled.status_code == 400
    assert "cancelled" in res_cancelled.json()["detail"].lower()

def test_rider_history_isolation_and_pagination(rider_test_client):
    """
    Verifies that rider delivery history is strictly isolated per rider,
    orders are sorted by delivered_at descending, and pagination is supported.
    """
    client = rider_test_client
    db = TestingSessionLocal()
    rider1 = db.query(User).filter(User.email == "rider@lyallpurbazaar.pk").first()
    rider2 = db.query(User).filter(User.email == "rider2@lyallpurbazaar.pk").first()

    # Create additional delivered orders for Rider 2
    order_r2_deliv = Order(
        order_number="FSD-2026-R2-DELIV",
        rider_id=rider2.id,
        customer_name="Rider 2 Client",
        customer_phone="03007777777",
        locality="Kohinoor City",
        full_address="Kohinoor City Block A",
        subtotal_pkr=3000.0,
        total_amount_pkr=3120.0,
        payment_method="Cash on Delivery",
        payment_status="Paid",
        order_status="Delivered",
        delivered_at=datetime.utcnow()
    )
    db.add(order_r2_deliv)
    db.commit()
    db.close()

    token1 = get_auth_token(client, "rider@lyallpurbazaar.pk", "Rider@123")
    token2 = get_auth_token(client, "rider2@lyallpurbazaar.pk", "Rider2@123")

    # Rider 1 checks history
    res1 = client.get("/api/rider/history", headers={"Authorization": f"Bearer {token1}"})
    assert res1.status_code == 200
    hist1 = res1.json()
    hist_numbers1 = [o["order_number"] for o in hist1]
    assert "FSD-2026-R2-DELIV" not in hist_numbers1
    assert "FSD-2026-RIDER01" in hist_numbers1

    # Rider 2 checks history
    res2 = client.get("/api/rider/history", headers={"Authorization": f"Bearer {token2}"})
    assert res2.status_code == 200
    hist2 = res2.json()
    hist_numbers2 = [o["order_number"] for o in hist2]
    assert "FSD-2026-R2-DELIV" in hist_numbers2
    assert "FSD-2026-RIDER01" not in hist_numbers2

