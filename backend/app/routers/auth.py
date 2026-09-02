from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User, Address
from app.models.role import Role
from app.schemas.auth import UserCreate, UserLogin, UserOut, Token, AddressCreate, AddressOut
from app.services.auth_service import (
    verify_password,
    get_password_hash,
    create_access_token,
    get_current_user,
    get_user_roles_and_permissions,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=Token)
def register(data: UserCreate, db: Session = Depends(get_db)):
    # Check if phone number already exists
    existing = db.query(User).filter(User.phone_number == data.phone_number).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this mobile number already exists."
        )
    if data.email:
        existing_email = db.query(User).filter(User.email == data.email).first()
        if existing_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="An account with this email address already exists."
            )

    user = User(
        full_name=data.full_name,
        phone_number=data.phone_number,
        email=data.email,
        hashed_password=get_password_hash(data.password),
        is_admin=False,
        is_active=True
    )

    # Assign customer role by default upon new registration if not assigned
    customer_role = db.query(Role).filter(Role.name == "customer").first()
    if customer_role:
        user.roles.append(customer_role)
    else:
        customer_role = Role(name="customer", description="Standard customer", is_system_role=True)
        db.add(customer_role)
        user.roles.append(customer_role)

    db.add(user)
    db.commit()
    db.refresh(user)

    roles, permissions = get_user_roles_and_permissions(user)

    token = create_access_token(
        data={"sub": str(user.id), "phone": user.phone_number, "is_admin": user.is_admin},
        roles=roles,
        permissions=permissions,
    )
    user_out = UserOut.model_validate(user)
    user_out.roles = roles
    user_out.permissions = permissions
    return Token(access_token=token, token_type="bearer", user=user_out, roles=roles, permissions=permissions)

@router.post("/login", response_model=Token)
def login(data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(
        (User.phone_number == data.phone_or_email) | (User.email == data.phone_or_email)
    ).first()

    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect phone number/email or password."
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This account has been deactivated."
        )

    roles, permissions = get_user_roles_and_permissions(user)

    token = create_access_token(
        data={"sub": str(user.id), "phone": user.phone_number, "is_admin": user.is_admin},
        roles=roles,
        permissions=permissions,
    )
    user_out = UserOut.model_validate(user)
    user_out.roles = roles
    user_out.permissions = permissions
    return Token(access_token=token, token_type="bearer", user=user_out, roles=roles, permissions=permissions)

@router.get("/me", response_model=UserOut)
def get_profile(current_user: User = Depends(get_current_user)):
    roles, permissions = get_user_roles_and_permissions(current_user)
    user_out = UserOut.model_validate(current_user)
    user_out.roles = roles
    user_out.permissions = permissions
    return user_out


@router.post("/addresses", response_model=AddressOut)
def add_address(data: AddressCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if data.is_default:
        # Clear default flag on other addresses
        for a in current_user.addresses:
            a.is_default = False

    addr = Address(
        user_id=current_user.id,
        title=data.title,
        recipient_name=data.recipient_name,
        phone_number=data.phone_number,
        city="Faisalabad",
        locality=data.locality,
        full_address=data.full_address,
        nearby_landmark=data.nearby_landmark,
        is_default=data.is_default
    )
    db.add(addr)
    db.commit()
    db.refresh(addr)
    return addr
