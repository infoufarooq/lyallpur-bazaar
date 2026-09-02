from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.role import Role, Permission
from app.schemas.auth import UserOut
from app.schemas.rbac import (
    RoleOut,
    RoleCreate,
    RolePermissionsUpdate,
    PermissionOut,
    UserRoleUpdate,
)
from app.services.auth_service import require_permissions

router = APIRouter(
    prefix="/admin/rbac",
    tags=["Admin RBAC"],
    dependencies=[Depends(require_permissions("admin:rbac_manage"))]
)

@router.get("/roles", response_model=List[RoleOut])
def list_roles(db: Session = Depends(get_db)):
    """
    List all system and custom roles with attached permissions and user counts.
    """
    roles = db.query(Role).all()
    result = []
    for r in roles:
        result.append(
            RoleOut(
                id=r.id,
                name=r.name,
                description=r.description,
                is_system_role=r.is_system_role,
                permissions=[PermissionOut.model_validate(p) for p in r.permissions],
                user_count=len(r.users) if r.users else 0,
            )
        )
    return result

@router.post("/roles", response_model=RoleOut, status_code=status.HTTP_201_CREATED)
def create_role(data: RoleCreate, db: Session = Depends(get_db)):
    """
    Create a new custom role with mapped permissions.
    """
    role_name = data.name.strip()
    existing = db.query(Role).filter(Role.name == role_name).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Role with name '{role_name}' already exists"
        )

    permissions = []
    if data.permission_codes:
        permissions = db.query(Permission).filter(Permission.code.in_(data.permission_codes)).all()
        found_codes = {p.code for p in permissions}
        missing_codes = set(data.permission_codes) - found_codes
        if missing_codes:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid permission code(s): {', '.join(sorted(missing_codes))}"
            )

    new_role = Role(
        name=role_name,
        description=data.description,
        is_system_role=False,
        permissions=permissions,
    )
    db.add(new_role)
    db.commit()
    db.refresh(new_role)

    return RoleOut(
        id=new_role.id,
        name=new_role.name,
        description=new_role.description,
        is_system_role=new_role.is_system_role,
        permissions=[PermissionOut.model_validate(p) for p in new_role.permissions],
        user_count=0,
    )

@router.put("/roles/{role_id}/permissions", response_model=RoleOut)
def update_role_permissions(
    role_id: int,
    data: RolePermissionsUpdate,
    db: Session = Depends(get_db)
):
    """
    Update mapped permissions for an existing role.
    """
    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Role with id {role_id} not found"
        )

    permissions = []
    if data.permission_codes:
        permissions = db.query(Permission).filter(Permission.code.in_(data.permission_codes)).all()
        found_codes = {p.code for p in permissions}
        missing_codes = set(data.permission_codes) - found_codes
        if missing_codes:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid permission code(s): {', '.join(sorted(missing_codes))}"
            )

    role.permissions = permissions
    db.commit()
    db.refresh(role)

    return RoleOut(
        id=role.id,
        name=role.name,
        description=role.description,
        is_system_role=role.is_system_role,
        permissions=[PermissionOut.model_validate(p) for p in role.permissions],
        user_count=len(role.users) if role.users else 0,
    )

@router.get("/permissions", response_model=List[PermissionOut])
def list_permissions(category: Optional[str] = None, db: Session = Depends(get_db)):
    """
    System dictionary of permissions, optionally filtered by category.
    """
    query = db.query(Permission)
    if category:
        query = query.filter(Permission.category == category)
    permissions = query.order_by(Permission.category, Permission.code).all()
    return permissions

@router.get("/users", response_model=List[UserOut])
def list_users(
    page: int = 1,
    limit: int = 50,
    role: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    List platform users with their assigned roles.
    """
    query = db.query(User)
    if role:
        query = query.join(User.roles).filter(Role.name == role)
    offset = (page - 1) * limit
    users = query.order_by(User.id).offset(offset).limit(limit).all()
    return users

@router.put("/users/{user_id}/roles", response_model=UserOut)
def update_user_roles(
    user_id: int,
    data: UserRoleUpdate,
    db: Session = Depends(get_db)
):
    """
    Reassign roles to a user.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with id {user_id} not found"
        )

    roles = []
    if data.role_names:
        roles = db.query(Role).filter(Role.name.in_(data.role_names)).all()
        found_names = {r.name for r in roles}
        missing_names = set(data.role_names) - found_names
        if missing_names:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid role name(s): {', '.join(sorted(missing_names))}"
            )

    user.roles = roles
    # Sync is_admin flag with admin role presence
    if "admin" in data.role_names:
        user.is_admin = True
    elif user.is_admin and "admin" not in data.role_names:
        user.is_admin = False

    db.commit()
    db.refresh(user)
    return user
