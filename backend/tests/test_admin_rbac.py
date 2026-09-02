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
from app.models.order import Order

TEST_DATABASE_URL = "sqlite:///:memory:"
test_engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

@pytest.fixture(scope="module")
def rbac_test_client():
    Base.metadata.create_all(bind=test_engine)
    db = TestingSessionLocal()
    seed_rbac_data(db)

    # Create a test order for rider dispatch tests
    order = Order(
        order_number="FSD-2026-TEST01",
        customer_name="Test Customer",
        customer_phone="03001112233",
        locality="D Ground",
        full_address="House 123, D Ground",
        subtotal_pkr=1000.0,
        total_amount_pkr=1120.0,
        order_status="Pending",
    )
    db.add(order)
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

def test_admin_rbac_endpoints(rbac_test_client):
    client = rbac_test_client
    admin_token = get_auth_token(client, "admin@lyallpurbazaar.pk", "Admin@123")
    headers = {"Authorization": f"Bearer {admin_token}"}

    # 1. List roles
    roles_res = client.get("/api/admin/rbac/roles", headers=headers)
    assert roles_res.status_code == 200
    roles = roles_res.json()
    assert any(r["name"] == "seller" for r in roles)
    assert any(r["name"] == "admin" for r in roles)
    assert any(r["name"] == "rider" for r in roles)
    assert any(r["name"] == "customer" for r in roles)
    # Check user count field is present
    for r in roles:
        assert "user_count" in r
        assert "permissions" in r

    # 2. List permissions
    perms_res = client.get("/api/admin/rbac/permissions", headers=headers)
    assert perms_res.status_code == 200
    perms = perms_res.json()
    assert len(perms) >= 10
    perm_codes = [p["code"] for p in perms]
    assert "admin:rbac_manage" in perm_codes
    assert "order:assign_rider" in perm_codes

    # 3. List riders
    riders_res = client.get("/api/admin/riders", headers=headers)
    assert riders_res.status_code == 200
    riders = riders_res.json()
    assert len(riders) >= 1
    assert any(r["email"] == "rider@lyallpurbazaar.pk" for r in riders)

def test_admin_rbac_unauthorized_and_forbidden(rbac_test_client):
    client = rbac_test_client
    # Unauthenticated
    res = client.get("/api/admin/rbac/roles")
    assert res.status_code == 401

    res_riders = client.get("/api/admin/riders")
    assert res_riders.status_code == 401

    # Customer lacks admin:rbac_manage
    cust_token = get_auth_token(client, "customer@lyallpurbazaar.pk", "Customer@123")
    cust_headers = {"Authorization": f"Bearer {cust_token}"}

    res_forbidden = client.get("/api/admin/rbac/roles", headers=cust_headers)
    assert res_forbidden.status_code == 403

    res_riders_forbidden = client.get("/api/admin/riders", headers=cust_headers)
    assert res_riders_forbidden.status_code == 403

def test_admin_create_and_update_role(rbac_test_client):
    client = rbac_test_client
    admin_token = get_auth_token(client, "admin@lyallpurbazaar.pk", "Admin@123")
    headers = {"Authorization": f"Bearer {admin_token}"}

    # Create new custom role
    create_payload = {
        "name": "dispatcher",
        "description": "Logistics and rider dispatch manager",
        "permission_codes": ["order:assign_rider", "delivery:view_assigned"]
    }
    create_res = client.post("/api/admin/rbac/roles", json=create_payload, headers=headers)
    assert create_res.status_code == 201
    created_role = create_res.json()
    assert created_role["name"] == "dispatcher"
    assert created_role["is_system_role"] is False
    assert len(created_role["permissions"]) == 2
    role_id = created_role["id"]

    # Duplicate role name returns 400
    dup_res = client.post("/api/admin/rbac/roles", json=create_payload, headers=headers)
    assert dup_res.status_code == 400

    # Role with invalid permission code returns 400
    invalid_perm_payload = {
        "name": "invalid_perm_role",
        "description": "Invalid",
        "permission_codes": ["non_existent:permission"]
    }
    inv_res = client.post("/api/admin/rbac/roles", json=invalid_perm_payload, headers=headers)
    assert inv_res.status_code == 400

    # Update role permissions
    update_payload = {
        "permission_codes": ["order:assign_rider", "delivery:view_assigned", "order:view_own"]
    }
    update_res = client.put(f"/api/admin/rbac/roles/{role_id}/permissions", json=update_payload, headers=headers)
    assert update_res.status_code == 200
    updated_role = update_res.json()
    assert len(updated_role["permissions"]) == 3

    # Update non-existent role returns 404
    bad_role_res = client.put("/api/admin/rbac/roles/99999/permissions", json=update_payload, headers=headers)
    assert bad_role_res.status_code == 404

def test_admin_rbac_users_list_and_role_assignment(rbac_test_client):
    client = rbac_test_client
    admin_token = get_auth_token(client, "admin@lyallpurbazaar.pk", "Admin@123")
    headers = {"Authorization": f"Bearer {admin_token}"}

    # List users
    users_res = client.get("/api/admin/rbac/users", headers=headers)
    assert users_res.status_code == 200
    users = users_res.json()
    assert len(users) >= 4
    rider_user = next(u for u in users if u["email"] == "rider@lyallpurbazaar.pk")
    assert "rider" in rider_user["roles"]

    # Assign roles to user
    assign_payload = {
        "role_names": ["customer", "rider"]
    }
    assign_res = client.put(f"/api/admin/rbac/users/{rider_user['id']}/roles", json=assign_payload, headers=headers)
    assert assign_res.status_code == 200
    updated_user = assign_res.json()
    assert "customer" in updated_user["roles"]
    assert "rider" in updated_user["roles"]

    # Assign invalid role name returns 400
    bad_role_assign = client.put(
        f"/api/admin/rbac/users/{rider_user['id']}/roles",
        json={"role_names": ["non_existent_role_xyz"]},
        headers=headers
    )
    assert bad_role_assign.status_code == 400

    # Assign to non-existent user returns 404
    bad_user_assign = client.put(
        "/api/admin/rbac/users/99999/roles",
        json={"role_names": ["customer"]},
        headers=headers
    )
    assert bad_user_assign.status_code == 404

def test_admin_rider_assignment_to_order(rbac_test_client):
    client = rbac_test_client
    admin_token = get_auth_token(client, "admin@lyallpurbazaar.pk", "Admin@123")
    headers = {"Authorization": f"Bearer {admin_token}"}

    # Get rider user
    riders_res = client.get("/api/admin/riders", headers=headers)
    assert riders_res.status_code == 200
    riders = riders_res.json()
    rider = next(r for r in riders if r["email"] == "rider@lyallpurbazaar.pk")

    # Get order
    orders_res = client.get("/api/admin/orders", headers=headers)
    assert orders_res.status_code == 200
    orders = orders_res.json()
    test_order = next(o for o in orders if o["order_number"] == "FSD-2026-TEST01")
    assert test_order["order_status"] == "Pending"
    assert test_order["rider_id"] is None

    # Assign rider to order
    assign_res = client.put(
        f"/api/admin/orders/{test_order['id']}/assign-rider",
        json={"rider_id": rider["id"]},
        headers=headers
    )
    assert assign_res.status_code == 200
    assigned_order = assign_res.json()
    assert assigned_order["rider_id"] == rider["id"]
    assert assigned_order["assigned_at"] is not None
    assert assigned_order["order_status"] in ["Packed", "Out for Delivery"]

    # Assign non-existent rider returns 404
    bad_rider_res = client.put(
        f"/api/admin/orders/{test_order['id']}/assign-rider",
        json={"rider_id": 99999},
        headers=headers
    )
    assert bad_rider_res.status_code == 404

    # Assign to non-existent order returns 404
    bad_order_res = client.put(
        "/api/admin/orders/99999/assign-rider",
        json={"rider_id": rider["id"]},
        headers=headers
    )
    assert bad_order_res.status_code == 404
