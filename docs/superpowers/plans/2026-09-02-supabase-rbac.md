# Production Grade Supabase Integration with Dynamic RBAC Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the Lyallpur Bazaar marketplace into a production-grade e-commerce application powered by Supabase PostgreSQL with dynamic Role-Based Access Control (RBAC), multi-vendor product ownership, delivery rider dispatch, and dedicated portals for Customers, Sellers, Riders, and Admins.

**Architecture:** A unified FastAPI backend with SQLAlchemy 2.0 connection pooling connecting to Supabase PostgreSQL (with automatic SQLite fallback for local test execution). Dynamic RBAC matrix (`roles`, `permissions`, `role_permissions`, `user_roles`) loaded into JWT token claims and enforced via FastAPI dependency guards. Dedicated API routers for `/api/seller`, `/api/rider`, and `/api/admin/rbac`. React frontend featuring context-aware role navigation, protected route wrappers, and dedicated Seller, Rider, and RBAC Management views.

**Tech Stack:** Python 3.12, FastAPI, SQLAlchemy 2.0, psycopg2-binary, Pytest, React 18, Vite, Tailwind CSS, Lucide React, Axios.

**Spec:** [`docs/superpowers/specs/2026-09-02-supabase-rbac-design.md`](file:///c:/Users/User/Documents/Projects/Daraz-alike/docs/superpowers/specs/2026-09-02-supabase-rbac-design.md)

## Global Constraints

- Python 3.12+ compatibility with clean typing and Pydantic v2 schemas.
- All existing 11 test suites in `backend/tests/test_api.py` must pass continuously without regressions.
- Supabase PostgreSQL connection pooler (Supavisor / port 6543) support with SSL handling (`sslmode=require`).
- Local zero-config SQLite test execution retained for fast, offline CI/test environments.
- Frontend builds cleanly via `npm run build --prefix frontend`.
- Follow repository collaboration rules in `briefs/TASK.md`, `briefs/HANDOFF.md`, and `AGENTS.md`.

---

### Task 1: Supabase Configuration, Dependencies & Connection Engine

**Files:**
- Modify: `backend/requirements.txt:1-12`
- Modify: `backend/app/config.py:1-44`
- Modify: `backend/app/database.py:1-35`
- Create: `supabase/schema.sql`
- Test: `backend/tests/test_db_config.py`

**Interfaces:**
- Consumes: `settings.DATABASE_URL`, `settings.get_database_url()`
- Produces: `get_db()`, `engine`, `SessionLocal` with PostgreSQL connection pooling and SQLite fallback

- [ ] **Step 1: Write the failing test for DB configuration**

Create `backend/tests/test_db_config.py`:
```python
from app.config import Settings

def test_supabase_url_normalization():
    s = Settings(DATABASE_URL="postgres://user:pass@db.supabase.co:6543/postgres?sslmode=require")
    normalized = s.get_database_url(s.DATABASE_URL)
    assert normalized.startswith("postgresql+psycopg2://")
    assert "sslmode=require" in normalized

def test_sqlite_url_preservation():
    s = Settings(DATABASE_URL="sqlite:///./test.db")
    normalized = s.get_database_url(s.DATABASE_URL)
    assert normalized.startswith("sqlite:///")
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest backend/tests/test_db_config.py -v`  
Expected: FAIL with `AssertionError: assert 'postgresql://user...' startswith 'postgresql+psycopg2://'`

- [ ] **Step 3: Update requirements, config, database engine and schema**

1. In `backend/requirements.txt`, add `psycopg2-binary>=2.9.9`.
2. In `backend/app/config.py`, enhance `get_database_url`:
```python
    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 20
    DB_POOL_RECYCLE: int = 300

    @classmethod
    def get_database_url(cls, url: str) -> str:
        if url.startswith("postgres://"):
            return url.replace("postgres://", "postgresql+psycopg2://", 1)
        if url.startswith("postgresql://") and not url.startswith("postgresql+psycopg2://"):
            return url.replace("postgresql://", "postgresql+psycopg2://", 1)
        return url
```
3. In `backend/app/database.py`, configure pool settings when using PostgreSQL:
```python
pool_kwargs = {}
if not db_url.startswith("sqlite"):
    pool_kwargs = {
        "pool_size": settings.DB_POOL_SIZE,
        "max_overflow": settings.DB_MAX_OVERFLOW,
        "pool_recycle": settings.DB_POOL_RECYCLE,
        "pool_pre_ping": True,
    }

engine = create_engine(
    db_url,
    connect_args=connect_args,
    echo=False,
    **pool_kwargs
)
```
4. Create `supabase/schema.sql` containing full DDL with all tables, constraints, foreign keys, and indexes for Supabase PostgreSQL.

- [ ] **Step 4: Run tests to verify they pass**

Run: `python -m pytest backend/tests/test_db_config.py -v`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/requirements.txt backend/app/config.py backend/app/database.py supabase/schema.sql backend/tests/test_db_config.py
git commit -m "feat(db): add Supabase PostgreSQL pooling engine and SQL schema"
```

---

### Task 2: Dynamic RBAC Models, Seed Data & User Extensions

**Files:**
- Create: `backend/app/models/role.py`
- Modify: `backend/app/models/user.py:1-40`
- Modify: `backend/app/models/product.py:1-70`
- Modify: `backend/app/models/order.py:1-60`
- Modify: `backend/app/models/__init__.py:1-15`
- Create: `backend/app/seed/seed_rbac.py`
- Modify: `backend/app/main.py:1-50`
- Test: `backend/tests/test_rbac_models.py`

**Interfaces:**
- Consumes: `Base`, `db` session
- Produces: `Role`, `Permission`, `role_permissions`, `user_roles`, `seed_rbac_data(db)`

- [ ] **Step 1: Write the failing test for RBAC models and relationships**

Create `backend/tests/test_rbac_models.py`:
```python
from app.database import Base, engine, SessionLocal
from app.models.role import Role, Permission
from app.models.user import User
from app.models.product import Product
from app.models.order import Order
from app.seed.seed_rbac import seed_rbac_data

def test_rbac_models_and_seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_rbac_data(db)
        
        # Verify roles
        roles = {r.name: r for r in db.query(Role).all()}
        assert "admin" in roles
        assert "seller" in roles
        assert "rider" in roles
        assert "customer" in roles
        
        # Verify permissions on seller
        seller_role = roles["seller"]
        seller_perm_codes = {p.code for p in seller_role.permissions}
        assert "product:create" in seller_perm_codes
        assert "product:view_own" in seller_perm_codes
        
        # Verify admin user has admin role
        admin_user = db.query(User).filter(User.email == "admin@lyallpurbazaar.pk").first()
        assert admin_user is not None
        assert any(r.name == "admin" for r in admin_user.roles)
    finally:
        db.close()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest backend/tests/test_rbac_models.py -v`  
Expected: FAIL with `ModuleNotFoundError: No module named 'app.models.role'`

- [ ] **Step 3: Implement RBAC models, entity extensions, and seeder**

1. Create `backend/app/models/role.py` defining:
   - `role_permissions` Table (`role_id`, `permission_id`)
   - `user_roles` Table (`user_id`, `role_id`)
   - `Role` Class (`id`, `name`, `description`, `is_system_role`, `permissions`, `users`)
   - `Permission` Class (`id`, `code`, `category`, `description`)
2. Update `backend/app/models/user.py`:
   - Add `business_name = Column(String(150), nullable=True)`
   - Add `vehicle_type = Column(String(100), nullable=True)`
   - Add `vehicle_number = Column(String(50), nullable=True)`
   - Add `roles = relationship("Role", secondary="user_roles", back_populates="users")`
   - Add `seller_products = relationship("Product", back_populates="seller")`
   - Add `assigned_deliveries = relationship("Order", foreign_keys="[Order.rider_id]", back_populates="rider")`
3. Update `backend/app/models/product.py`:
   - Add `seller_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)`
   - Add `seller = relationship("User", back_populates="seller_products")`
4. Update `backend/app/models/order.py`:
   - Add `rider_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)`
   - Add `assigned_at = Column(DateTime, nullable=True)`
   - Add `delivered_at = Column(DateTime, nullable=True)`
   - Add `delivery_notes = Column(Text, nullable=True)`
   - Add `rider = relationship("User", foreign_keys=[rider_id], back_populates="assigned_deliveries")`
5. Create `backend/app/seed/seed_rbac.py` to seed:
   - 15 standard permissions
   - `admin`, `seller`, `rider`, `customer` roles with mapped permissions
   - Demo accounts:
     - `admin@lyallpurbazaar.pk` (pass: `Admin@123`)
     - `seller@lyallpurbazaar.pk` (pass: `Seller@123`, store: "Kohinoor Mart")
     - `rider@lyallpurbazaar.pk` (pass: `Rider@123`, vehicle: "Honda CD 70", number: "FDN-2024-8841")
     - `customer@lyallpurbazaar.pk` (pass: `Customer@123`)
6. In `backend/app/main.py`, invoke `seed_rbac_data(db)` in the lifespan function.

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m pytest backend/tests/test_rbac_models.py -v`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/models/ backend/app/seed/ backend/app/main.py backend/tests/test_rbac_models.py
git commit -m "feat(rbac): implement dynamic RBAC schema, models, and demo seeder"
```

---

### Task 3: Security, JWT Claims & RBAC Authorization Dependencies

**Files:**
- Modify: `backend/app/schemas/auth.py:1-60`
- Modify: `backend/app/services/auth_service.py:1-69`
- Modify: `backend/app/routers/auth.py:1-89`
- Test: `backend/tests/test_rbac_auth.py`

**Interfaces:**
- Consumes: `User`, `Role`, `Permission`, `oauth2_scheme`
- Produces: `require_roles(*roles)`, `require_permissions(*permissions)`, updated `Token`, `UserOut`

- [ ] **Step 1: Write failing tests for RBAC dependencies**

Create `backend/tests/test_rbac_auth.py`:
```python
import pytest
from fastapi import HTTPException
from app.models.user import User
from app.models.role import Role, Permission
from app.services.auth_service import require_roles, require_permissions, create_access_token

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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest backend/tests/test_rbac_auth.py -v`  
Expected: FAIL with `ImportError: cannot import name 'require_roles' from 'app.services.auth_service'`

- [ ] **Step 3: Implement dependencies, claims, and schemas**

1. In `backend/app/schemas/auth.py`:
   - Extend `UserOut` with `roles: List[str] = []`, `permissions: List[str] = []`, `business_name: Optional[str] = None`, `vehicle_type: Optional[str] = None`, `vehicle_number: Optional[str] = None`.
2. In `backend/app/services/auth_service.py`:
   - Helper `get_user_roles_and_permissions(user: User) -> Tuple[List[str], List[str]]`.
   - Update `create_access_token` to accept `roles` and `permissions` in token payload.
   - Implement `require_roles(*allowed_roles: str)`: checks if user has at least one allowed role (or is `admin`).
   - Implement `require_permissions(*required_permissions: str)`: checks if user has all requested permissions (or is `admin`).
3. In `backend/app/routers/auth.py`:
   - Inject roles and permissions in `/login`, `/register`, and `/me`. Assign `customer` role by default upon new registration.

- [ ] **Step 4: Run tests to verify they pass**

Run: `python -m pytest backend/tests/test_rbac_auth.py -v`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/schemas/auth.py backend/app/services/auth_service.py backend/app/routers/auth.py backend/tests/test_rbac_auth.py
git commit -m "feat(auth): add JWT roles/permissions claims and RBAC dependency guards"
```

---

### Task 4: Dynamic Admin RBAC Management API & Rider Dispatch

**Files:**
- Create: `backend/app/schemas/rbac.py`
- Create: `backend/app/routers/admin_rbac.py`
- Modify: `backend/app/routers/admin.py:1-184`
- Modify: `backend/app/main.py`
- Test: `backend/tests/test_admin_rbac.py`

**Interfaces:**
- Consumes: `require_permissions("admin:rbac_manage")`, `require_permissions("order:assign_rider")`
- Produces: `/api/admin/rbac/*`, `/api/admin/riders`, `/api/admin/orders/{id}/assign-rider`

- [ ] **Step 1: Write failing integration test for RBAC management**

Create `backend/tests/test_admin_rbac.py`:
```python
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_admin_rbac_endpoints():
    # Login as admin
    res = client.post("/api/auth/login", json={"phone_or_email": "admin@lyallpurbazaar.pk", "password": "Admin@123"})
    assert res.status_code == 200
    token = res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # 1. List roles
    roles_res = client.get("/api/admin/rbac/roles", headers=headers)
    assert roles_res.status_code == 200
    roles = roles_res.json()
    assert any(r["name"] == "seller" for r in roles)
    
    # 2. List permissions
    perms_res = client.get("/api/admin/rbac/permissions", headers=headers)
    assert perms_res.status_code == 200
    assert len(perms_res.json()) >= 10
    
    # 3. List riders
    riders_res = client.get("/api/admin/riders", headers=headers)
    assert riders_res.status_code == 200
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest backend/tests/test_admin_rbac.py -v`  
Expected: FAIL with 404 on `/api/admin/rbac/roles`

- [ ] **Step 3: Implement admin RBAC router and rider dispatch**

1. Create `backend/app/schemas/rbac.py`:
   - `PermissionOut`: `id`, `code`, `category`, `description`
   - `RoleOut`: `id`, `name`, `description`, `is_system_role`, `permissions: List[PermissionOut]`, `user_count: int`
   - `RoleCreate`: `name`, `description`, `permission_codes: List[str]`
   - `RolePermissionsUpdate`: `permission_codes: List[str]`
   - `UserRoleUpdate`: `role_names: List[str]`
   - `RiderAssignRequest`: `rider_id: int`
2. Create `backend/app/routers/admin_rbac.py`:
   - `GET /roles`: List all roles with attached permissions and user counts.
   - `POST /roles`: Create new custom role.
   - `PUT /roles/{role_id}/permissions`: Update mapped permissions for a role.
   - `GET /permissions`: System dictionary of permissions categorized.
   - `GET /users`: List users with current roles.
   - `PUT /users/{user_id}/roles`: Reassign roles to user.
3. In `backend/app/routers/admin.py`:
   - Add `GET /riders`: Query all active users who possess the `rider` role.
   - Add `PUT /orders/{order_id}/assign-rider`: Assign `rider_id`, set `assigned_at`, and advance status to `Packed` (or `Out for Delivery`).
4. Include router in `backend/app/main.py`.

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m pytest backend/tests/test_admin_rbac.py -v`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/schemas/rbac.py backend/app/routers/admin_rbac.py backend/app/routers/admin.py backend/app/main.py backend/tests/test_admin_rbac.py
git commit -m "feat(admin): add dynamic RBAC management and rider dispatch endpoints"
```

---

### Task 5: Seller Portal API & Multi-Vendor Catalog Isolation

**Files:**
- Create: `backend/app/schemas/seller.py`
- Create: `backend/app/routers/seller.py`
- Modify: `backend/app/services/product_service.py:1-120`
- Modify: `backend/app/main.py`
- Test: `backend/tests/test_seller_api.py`

**Interfaces:**
- Consumes: `require_permissions("product:view_own")` / `require_roles("seller", "admin")`
- Produces: `/api/seller/dashboard`, `/api/seller/products`, `/api/seller/orders`

- [ ] **Step 1: Write failing test for seller catalog isolation**

Create `backend/tests/test_seller_api.py`:
```python
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_seller_isolation():
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest backend/tests/test_seller_api.py -v`  
Expected: FAIL with 404 on `/api/seller/dashboard`

- [ ] **Step 3: Implement seller router and ownership enforcement**

1. Create `backend/app/schemas/seller.py`:
   - `SellerDashboardMetrics`: `total_products: int`, `low_stock_count: int`, `total_revenue_pkr: float`, `total_orders_count: int`
   - `SellerOrderLineItem`: `order_number: str`, `product_name: str`, `quantity: int`, `unit_price: float`, `total_pkr: float`, `status: str`, `created_at: str`
2. Create `backend/app/routers/seller.py`:
   - `GET /dashboard`: Aggregate products, stock, and orders containing products where `product.seller_id == current_user.id`.
   - `GET /products`: Filter products where `product.seller_id == current_user.id`.
   - `POST /products`: Sets `data.seller_id = current_user.id` and creates product.
   - `PUT /products/{product_id}`: Verifies ownership `product.seller_id == current_user.id` before mutating.
   - `DELETE /products/{product_id}`: Verifies ownership before setting `is_active = False`.
   - `GET /orders`: Returns order items for this seller's products.
3. In `backend/app/services/product_service.py`, add `seller_id` handling and ownership verification helper.
4. Include router in `backend/app/main.py`.

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m pytest backend/tests/test_seller_api.py -v`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/schemas/seller.py backend/app/routers/seller.py backend/app/services/product_service.py backend/app/main.py backend/tests/test_seller_api.py
git commit -m "feat(seller): add seller hub API with strict catalog ownership isolation"
```

---

### Task 6: Rider Delivery Portal API

**Files:**
- Create: `backend/app/schemas/rider.py`
- Create: `backend/app/routers/rider.py`
- Modify: `backend/app/main.py`
- Test: `backend/tests/test_rider_api.py`

**Interfaces:**
- Consumes: `require_permissions("delivery:view_assigned")` / `require_roles("rider", "admin")`
- Produces: `/api/rider/dashboard`, `/api/rider/deliveries`, `/api/rider/deliveries/{id}/status`, `/api/rider/history`

- [ ] **Step 1: Write failing test for rider operations**

Create `backend/tests/test_rider_api.py`:
```python
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_rider_flow():
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest backend/tests/test_rider_api.py -v`  
Expected: FAIL with 404 on `/api/rider/deliveries`

- [ ] **Step 3: Implement rider router and schemas**

1. Create `backend/app/schemas/rider.py`:
   - `RiderDeliveryOut`: `order_id`, `order_number`, `recipient_name`, `recipient_phone`, `locality`, `full_address`, `nearby_landmark`, `total_amount_pkr`, `order_status`, `payment_method`, `delivery_notes`
   - `RiderStatusUpdate`: `status: str`, `delivery_notes: Optional[str] = None`
   - `RiderDashboardMetrics`: `pending_deliveries: int`, `delivered_today: int`, `cod_cash_collected_pkr: float`
2. Create `backend/app/routers/rider.py`:
   - `GET /dashboard`: Aggregate assigned orders metrics for `current_user.id`.
   - `GET /deliveries`: Orders where `order.rider_id == current_user.id` and status not Delivered/Cancelled.
   - `PUT /deliveries/{order_id}/status`: Advances status to `Out for Delivery` or `Delivered`, updates `delivered_at` timestamp and notes.
   - `GET /history`: Delivered orders log for the authenticated rider.
3. Include router in `backend/app/main.py`.

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m pytest backend/tests/test_rider_api.py -v`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/schemas/rider.py backend/app/routers/rider.py backend/app/main.py backend/tests/test_rider_api.py
git commit -m "feat(rider): implement rider delivery runs, status transitions, and COD logs"
```

---

### Task 7: Frontend Auth Context, Role-Based Routing & Header

**Files:**
- Modify: `frontend/src/context/AuthContext.jsx:1-76`
- Create: `frontend/src/components/auth/ProtectedRoute.jsx`
- Modify: `frontend/src/components/layout/Header.jsx:1-120`
- Modify: `frontend/src/pages/LoginPage.jsx:1-140`

**Interfaces:**
- Consumes: `user.roles`, `user.permissions`
- Produces: `hasRole()`, `hasPermission()`, `isAdmin`, `isSeller`, `isRider`, `isCustomer`, `<ProtectedRoute />`

- [ ] **Step 1: Enhance AuthContext with roles and permissions helpers**

In `frontend/src/context/AuthContext.jsx`:
- Parse `roles` and `permissions` from user response.
- Expose helper functions:
  ```javascript
  const hasRole = (roleName) => user?.roles?.includes(roleName) || user?.roles?.includes('admin');
  const hasPermission = (code) => user?.roles?.includes('admin') || user?.permissions?.includes(code);
  const isAdmin = Boolean(user?.roles?.includes('admin') || user?.is_admin);
  const isSeller = Boolean(user?.roles?.includes('seller'));
  const isRider = Boolean(user?.roles?.includes('rider'));
  const isCustomer = Boolean(!isSeller && !isRider && !isAdmin) || Boolean(user?.roles?.includes('customer'));
  ```

- [ ] **Step 2: Create ProtectedRoute component**

Create `frontend/src/components/auth/ProtectedRoute.jsx`:
- Checks if user is authenticated. If not, redirect to `/login`.
- If `allowedRoles` specified, verify user has at least one role. If not, redirect with toast or warning.
- If `requiredPermissions` specified, verify user satisfies permissions.

- [ ] **Step 3: Update Header with role-aware portal links**

In `frontend/src/components/layout/Header.jsx`:
- If `isSeller`, display link to "🏪 Seller Hub" (`/seller`).
- If `isRider`, display link to "🛵 Rider Portal" (`/rider`).
- If `isAdmin`, display link to "🛡️ Admin Portal" (`/admin`).
- If `isCustomer`, display "My Orders" (`/account`).

- [ ] **Step 4: Update LoginPage with 4 demo personas**

In `frontend/src/pages/LoginPage.jsx`:
- Add one-click quick login tabs for:
  - 👑 **Admin**: `admin@lyallpurbazaar.pk` / `Admin@123`
  - 🏪 **Seller**: `seller@lyallpurbazaar.pk` / `Seller@123`
  - 🛵 **Rider**: `rider@lyallpurbazaar.pk` / `Rider@123`
  - 🛍️ **Customer**: `customer@lyallpurbazaar.pk` / `Customer@123`

- [ ] **Step 5: Verify frontend build compiles**

Run: `npm run build --prefix frontend`  
Expected: Successful build with zero errors.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/context/AuthContext.jsx frontend/src/components/auth/ProtectedRoute.jsx frontend/src/components/layout/Header.jsx frontend/src/pages/LoginPage.jsx
git commit -m "feat(frontend): add role-based auth state, route guard, header links, and demo login buttons"
```

---

### Task 8: Frontend Portals (Seller, Rider & Admin RBAC)

**Files:**
- Create: `frontend/src/pages/SellerPage.jsx`
- Create: `frontend/src/pages/RiderPage.jsx`
- Modify: `frontend/src/pages/AdminPage.jsx:1-300`
- Modify: `frontend/src/App.jsx:1-67`

**Interfaces:**
- Consumes: `/api/seller/*`, `/api/rider/*`, `/api/admin/rbac/*`
- Produces: Protected routes `/seller`, `/rider`, enhanced `/admin`

- [ ] **Step 1: Implement SellerPage**

Create `frontend/src/pages/SellerPage.jsx`:
- KPI cards: Total Products, Low Stock Alerts, Total Revenue (PKR), Active Orders.
- Inventory Table: Search, filter, inline edit stock and price, modal to create a new product.
- Store Orders Table: Order number, item details, quantity, status.

- [ ] **Step 2: Implement RiderPage**

Create `frontend/src/pages/RiderPage.jsx`:
- Active Deliveries: Faisalabad cards with recipient name, phone call link, delivery zone, full address, landmark, and COD amount.
- Status Actions: Single-click button "Mark Out for Delivery" and "Mark Delivered".
- Shift Summary: Total drops completed and total COD cash in hand.

- [ ] **Step 3: Enhance AdminPage with RBAC Tab and Rider Dispatch Modal**

In `frontend/src/pages/AdminPage.jsx`:
- Add "RBAC & Roles" tab:
  - Table of roles with their permissions.
  - Interactive checkboxes to toggle permissions on roles and save via `/api/admin/rbac/roles/{id}/permissions`.
  - User role assignment: search user and assign/revoke roles.
- In Orders tab, add "Dispatch Rider" action to assign orders to active riders.

- [ ] **Step 4: Register routes in App.jsx**

In `frontend/src/App.jsx`:
- Add `<Route path="/seller" element={<ProtectedRoute allowedRoles={['seller', 'admin']}><SellerPage /></ProtectedRoute>} />`
- Add `<Route path="/rider" element={<ProtectedRoute allowedRoles={['rider', 'admin']}><RiderPage /></ProtectedRoute>} />`

- [ ] **Step 5: Verify frontend build compiles**

Run: `npm run build --prefix frontend`  
Expected: Successful build with zero errors.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/SellerPage.jsx frontend/src/pages/RiderPage.jsx frontend/src/pages/AdminPage.jsx frontend/src/App.jsx
git commit -m "feat(frontend): create Seller Hub, Rider Delivery Portal, and Admin RBAC Matrix views"
```

---

### Task 9: End-to-End Acceptance, Verification & Handoff

**Files:**
- Modify: `briefs/TASK.md`
- Modify: `briefs/HANDOFF.md`
- Test: All backend pytest suites & frontend build

**Interfaces:**
- Acceptance checks per repository collaboration guidelines

- [ ] **Step 1: Run complete backend test suite**

Run: `python -m pytest backend/tests -v`  
Expected: All tests pass (including existing 11 tests and all new RBAC tests).

- [ ] **Step 2: Run frontend production build**

Run: `npm run build --prefix frontend`  
Expected: Vite build passes cleanly.

- [ ] **Step 3: Update briefs/TASK.md and briefs/HANDOFF.md**

Record all added files, changed paths, validation results, and next actions according to `AGENTS.md`.

- [ ] **Step 4: Commit and tag completion**

```bash
git add briefs/TASK.md briefs/HANDOFF.md
git commit -m "docs(handoff): record completed Supabase integration and dynamic RBAC milestone"
```
