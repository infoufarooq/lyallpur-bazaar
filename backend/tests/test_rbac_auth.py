import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest
from fastapi import HTTPException
from jose import jwt

from app.config import settings
from app.models.user import User
from app.models.role import Role, Permission
from app.schemas.auth import UserOut, Token, TokenData
from app.services.auth_service import (
    require_roles,
    require_permissions,
    create_access_token,
    get_user_roles_and_permissions,
    get_current_admin,
)

def test_require_roles_dependency():
    seller_role = Role(name="seller")
    seller_user = User(id=1, full_name="Seller One", roles=[seller_role], is_active=True)
    
    # Seller should pass seller check
    guard = require_roles("seller", "admin")
    assert guard(current_user=seller_user) == seller_user
    
    # Seller should fail rider check
    rider_guard = require_roles("rider")
    with pytest.raises(HTTPException) as exc:
        rider_guard(current_user=seller_user)
    assert exc.value.status_code == 403

def test_require_permissions_with_admin_wildcard():
    admin_role = Role(name="admin")
    admin_user = User(id=99, full_name="Admin", roles=[admin_role], is_active=True)
    
    perm_guard = require_permissions("product:create", "order:assign_rider")
    # Admin passes any permission check
    assert perm_guard(current_user=admin_user) == admin_user

def test_require_roles_with_admin_role_bypass():
    admin_role = Role(name="admin")
    admin_user = User(id=2, full_name="Admin User", roles=[admin_role], is_active=True)

    # Admin passes even when role is not explicitly listed
    rider_guard = require_roles("rider")
    assert rider_guard(current_user=admin_user) == admin_user

def test_require_roles_with_is_admin_flag():
    admin_user = User(id=3, full_name="Flag Admin", is_admin=True, roles=[], is_active=True)
    guard = require_roles("seller")
    assert guard(current_user=admin_user) == admin_user

def test_require_permissions_regular_user():
    perm_create = Permission(code="product:create", category="product")
    perm_read = Permission(code="profile:read_write", category="profile")
    seller_role = Role(name="seller", permissions=[perm_create, perm_read])
    seller_user = User(id=4, full_name="Seller User", roles=[seller_role], is_active=True)

    # Has required permissions
    guard = require_permissions("product:create")
    assert guard(current_user=seller_user) == seller_user

    # Missing one permission
    guard_missing = require_permissions("product:create", "order:assign_rider")
    with pytest.raises(HTTPException) as exc:
        guard_missing(current_user=seller_user)
    assert exc.value.status_code == 403

def test_require_permissions_wildcard_permission():
    wildcard_perm = Permission(code="*", category="admin")
    custom_role = Role(name="super-manager", permissions=[wildcard_perm])
    user = User(id=5, full_name="Wildcard User", roles=[custom_role], is_active=True)

    guard = require_permissions("any:perm:string", "another:perm")
    assert guard(current_user=user) == user

def test_get_current_admin_alias():
    admin_role = Role(name="admin")
    admin_user = User(id=6, full_name="Admin User", roles=[admin_role], is_active=True)
    seller_role = Role(name="seller")
    seller_user = User(id=7, full_name="Seller User", roles=[seller_role], is_active=True)

    assert get_current_admin(current_user=admin_user) == admin_user
    with pytest.raises(HTTPException) as exc:
        get_current_admin(current_user=seller_user)
    assert exc.value.status_code == 403

def test_get_user_roles_and_permissions():
    p1 = Permission(code="order:create", category="order")
    p2 = Permission(code="order:view_own", category="order")
    customer_role = Role(name="customer", permissions=[p1, p2])
    user = User(id=8, full_name="Cust", roles=[customer_role], is_active=True)

    roles, perms = get_user_roles_and_permissions(user)
    assert roles == ["customer"]
    assert sorted(perms) == ["order:create", "order:view_own"]

    # Admin flag adds admin to roles
    user.is_admin = True
    roles, perms = get_user_roles_and_permissions(user)
    assert "admin" in roles

def test_create_access_token_claims():
    roles = ["seller"]
    permissions = ["product:create", "profile:read_write"]
    token = create_access_token(
        data={"sub": "42", "phone": "03001234567"},
        roles=roles,
        permissions=permissions
    )
    payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    assert payload["sub"] == "42"
    assert payload["phone"] == "03001234567"
    assert payload["roles"] == ["seller"]
    assert payload["permissions"] == ["product:create", "profile:read_write"]

def test_user_out_schema_fields():
    user_out = UserOut(
        id=10,
        full_name="Kohinoor Seller",
        phone_number="03007654321",
        is_admin=False,
        is_active=True,
        roles=["seller"],
        permissions=["product:create"],
        business_name="Kohinoor Store",
        vehicle_type=None,
        vehicle_number=None,
        created_at="2026-09-02T12:00:00"
    )
    assert user_out.roles == ["seller"]
    assert user_out.permissions == ["product:create"]
    assert user_out.business_name == "Kohinoor Store"
    assert user_out.vehicle_type is None

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.main import app
from app.database import Base, get_db
from app.seed.seed_rbac import seed_rbac_data

TEST_DATABASE_URL = "sqlite:///:memory:"
test_engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

@pytest.fixture(scope="module")
def api_test_setup():
    Base.metadata.create_all(bind=test_engine)
    db = TestingSessionLocal()
    seed_rbac_data(db)
    db.close()

    def override_get_db():
        session = TestingSessionLocal()
        try:
            yield session
        finally:
            session.close()

    previous_override = app.dependency_overrides.get(get_db)
    app.dependency_overrides[get_db] = override_get_db
    client = TestClient(app)
    yield client
    if previous_override is not None:
        app.dependency_overrides[get_db] = previous_override
    else:
        app.dependency_overrides.pop(get_db, None)
    Base.metadata.drop_all(bind=test_engine)

def test_auth_router_registration_assigns_customer_role(api_test_setup):
    client = api_test_setup
    payload = {
        "full_name": "Hamza Tariq",
        "phone_number": "03001122334",
        "email": "hamza.tariq@test.com",
        "password": "Password123!"
    }
    response = client.post("/api/auth/register", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["roles"] == ["customer"]
    assert "customer" in data["user"]["roles"]
    assert "order:create" in data["permissions"]
    assert "order:create" in data["user"]["permissions"]

    # Verify claims inside JWT
    token_claims = jwt.decode(data["access_token"], settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    assert token_claims["roles"] == ["customer"]
    assert "order:create" in token_claims["permissions"]

def test_auth_router_login_and_me_rbac(api_test_setup):
    client = api_test_setup
    login_payload = {
        "phone_or_email": "seller@lyallpurbazaar.pk",
        "password": "Seller@123"
    }
    response = client.post("/api/auth/login", json=login_payload)
    assert response.status_code == 200
    data = response.json()
    assert "seller" in data["roles"]
    assert "product:create" in data["permissions"]
    assert data["user"]["business_name"] == "Kohinoor Mart"

    token = data["access_token"]
    me_resp = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_resp.status_code == 200
    me_data = me_resp.json()
    assert "seller" in me_data["roles"]
    assert "product:create" in me_data["permissions"]
    assert me_data["business_name"] == "Kohinoor Mart"

