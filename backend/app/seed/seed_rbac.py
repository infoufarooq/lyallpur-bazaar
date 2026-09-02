from sqlalchemy.orm import Session
from app.models.role import Role, Permission
from app.models.user import User
from app.services.auth_service import get_password_hash

STANDARD_PERMISSIONS = [
    {"code": "profile:read_write", "category": "account", "description": "View & manage personal profile and addresses"},
    {"code": "order:create", "category": "orders", "description": "Place new customer orders"},
    {"code": "order:view_own", "category": "orders", "description": "View customer's placed orders"},
    {"code": "product:view_own", "category": "catalog", "description": "View seller's catalog & stock"},
    {"code": "product:create", "category": "catalog", "description": "Create new seller products"},
    {"code": "product:update_own", "category": "catalog", "description": "Update price/stock for seller's own products"},
    {"code": "product:delete_own", "category": "catalog", "description": "Deactivate seller's own products"},
    {"code": "order:view_seller_items", "category": "orders", "description": "View order items containing seller's goods"},
    {"code": "delivery:view_assigned", "category": "delivery", "description": "View assigned delivery runs"},
    {"code": "delivery:update_status", "category": "delivery", "description": "Update delivery progress (Out for Delivery -> Delivered)"},
    {"code": "order:assign_rider", "category": "orders", "description": "Dispatch and assign riders to customer orders"},
    {"code": "admin:rbac_manage", "category": "admin", "description": "Create/edit roles, map permissions, assign user roles"},
    {"code": "admin:catalog_manage_all", "category": "admin", "description": "Edit or delete any product across all sellers"},
    {"code": "admin:zones_manage", "category": "admin", "description": "Configure Faisalabad delivery sectors and fees"},
    {"code": "admin:metrics_view", "category": "admin", "description": "View platform-wide revenue and performance metrics"},
]

ROLE_DEFINITIONS = [
    {
        "name": "admin",
        "description": "Platform administrator with full governance access across all operations",
        "is_system_role": True,
        "permissions": [p["code"] for p in STANDARD_PERMISSIONS],
    },
    {
        "name": "seller",
        "description": "Local merchant who manages their own store catalog, inventory, and order items",
        "is_system_role": True,
        "permissions": [
            "profile:read_write",
            "product:view_own",
            "product:create",
            "product:update_own",
            "product:delete_own",
            "order:view_seller_items",
        ],
    },
    {
        "name": "rider",
        "description": "Delivery rider operating across Faisalabad localities to fulfill orders",
        "is_system_role": True,
        "permissions": [
            "profile:read_write",
            "delivery:view_assigned",
            "delivery:update_status",
        ],
    },
    {
        "name": "customer",
        "description": "Verified consumer who browses, purchases, and tracks local deliveries",
        "is_system_role": True,
        "permissions": [
            "profile:read_write",
            "order:create",
            "order:view_own",
        ],
    },
]

DEMO_ACCOUNTS = [
    {
        "email": "admin@lyallpurbazaar.pk",
        "password": "Admin@123",
        "full_name": "Lyallpur Admin",
        "phone_number": "03001234567",
        "is_admin": True,
        "role": "admin",
        "extra": {},
    },
    {
        "email": "seller@lyallpurbazaar.pk",
        "password": "Seller@123",
        "full_name": "Kohinoor Mart Merchant",
        "phone_number": "03002345678",
        "is_admin": False,
        "role": "seller",
        "extra": {"business_name": "Kohinoor Mart"},
    },
    {
        "email": "rider@lyallpurbazaar.pk",
        "password": "Rider@123",
        "full_name": "Tariq Express Rider",
        "phone_number": "03003456789",
        "is_admin": False,
        "role": "rider",
        "extra": {"vehicle_type": "Honda CD 70", "vehicle_number": "FDN-2024-8841"},
    },
    {
        "email": "customer@lyallpurbazaar.pk",
        "password": "Customer@123",
        "full_name": "Customer Demo",
        "phone_number": "03004567890",
        "is_admin": False,
        "role": "customer",
        "extra": {},
    },
]

def seed_rbac_data(db: Session):
    """
    Seeds the 15 standard permissions, foundational system roles (admin, seller, rider, customer),
    their mapped permissions, and demo user accounts. Idempotent.
    """
    # 1. Permissions
    perm_map = {}
    for p_def in STANDARD_PERMISSIONS:
        perm = db.query(Permission).filter(Permission.code == p_def["code"]).first()
        if not perm:
            perm = Permission(
                code=p_def["code"],
                category=p_def["category"],
                description=p_def["description"],
            )
            db.add(perm)
            db.flush()
        else:
            perm.category = p_def["category"]
            perm.description = p_def["description"]
        perm_map[p_def["code"]] = perm

    # 2. Roles & Permissions Mapping
    role_map = {}
    for r_def in ROLE_DEFINITIONS:
        role = db.query(Role).filter(Role.name == r_def["name"]).first()
        if not role:
            role = Role(
                name=r_def["name"],
                description=r_def["description"],
                is_system_role=r_def["is_system_role"],
            )
            db.add(role)
            db.flush()
        else:
            role.description = r_def["description"]
            role.is_system_role = r_def["is_system_role"]

        # Ensure permissions mapped
        target_perms = [perm_map[code] for code in r_def["permissions"] if code in perm_map]
        existing_perm_ids = {p.id for p in role.permissions}
        for p in target_perms:
            if p.id not in existing_perm_ids:
                role.permissions.append(p)
                existing_perm_ids.add(p.id)

        role_map[r_def["name"]] = role

    # 3. Demo Accounts
    for u_def in DEMO_ACCOUNTS:
        user = db.query(User).filter(User.email == u_def["email"]).first()
        if not user:
            # Check by phone to prevent unique constraint conflicts
            user = db.query(User).filter(User.phone_number == u_def["phone_number"]).first()

        if not user:
            user = User(
                email=u_def["email"],
                phone_number=u_def["phone_number"],
                full_name=u_def["full_name"],
                hashed_password=get_password_hash(u_def["password"]),
                is_admin=u_def["is_admin"],
                is_active=True,
                business_name=u_def["extra"].get("business_name"),
                vehicle_type=u_def["extra"].get("vehicle_type"),
                vehicle_number=u_def["extra"].get("vehicle_number"),
            )
            db.add(user)
            db.flush()
        else:
            # Update extra details if not set
            if u_def["extra"].get("business_name"):
                user.business_name = u_def["extra"]["business_name"]
            if u_def["extra"].get("vehicle_type"):
                user.vehicle_type = u_def["extra"]["vehicle_type"]
            if u_def["extra"].get("vehicle_number"):
                user.vehicle_number = u_def["extra"]["vehicle_number"]
            if u_def["is_admin"]:
                user.is_admin = True

        # Assign role to user
        target_role = role_map.get(u_def["role"])
        if target_role:
            existing_role_names = {r.name for r in user.roles}
            if target_role.name not in existing_role_names:
                user.roles.append(target_role)

    db.commit()
