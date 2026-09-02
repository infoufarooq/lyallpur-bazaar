from datetime import datetime, timedelta
from typing import Optional, List, Tuple
import bcrypt
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.config import settings
from app.database import get_db
from app.models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login", auto_error=False)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8")[:72],
            hashed_password.encode("utf-8")
        )
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode("utf-8")[:72], salt)
    return hashed.decode("utf-8")

def get_user_roles_and_permissions(user: User) -> Tuple[List[str], List[str]]:
    roles: List[str] = []
    permissions_set: set = set()

    user_roles = getattr(user, "roles", None) or []
    for role in user_roles:
        if isinstance(role, str):
            if role not in roles:
                roles.append(role)
        elif hasattr(role, "name") and role.name:
            if role.name not in roles:
                roles.append(role.name)
            if hasattr(role, "permissions") and role.permissions:
                for perm in role.permissions:
                    if isinstance(perm, str):
                        permissions_set.add(perm)
                    elif hasattr(perm, "code") and perm.code:
                        permissions_set.add(perm.code)

    if hasattr(user, "permissions") and user.permissions:
        for perm in user.permissions:
            if isinstance(perm, str):
                permissions_set.add(perm)
            elif hasattr(perm, "code") and perm.code:
                permissions_set.add(perm.code)

    if getattr(user, "is_admin", False) or "admin" in roles:
        if "admin" not in roles:
            roles.append("admin")

    return roles, sorted(list(permissions_set))

def create_access_token(
    data: dict,
    expires_delta: Optional[timedelta] = None,
    roles: Optional[List[str]] = None,
    permissions: Optional[List[str]] = None,
) -> str:
    to_encode = data.copy()
    if roles is not None:
        to_encode["roles"] = roles
    elif "roles" not in to_encode:
        to_encode["roles"] = []

    if permissions is not None:
        to_encode["permissions"] = permissions
    elif "permissions" not in to_encode:
        to_encode["permissions"] = []

    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def get_current_user_optional(token: Optional[str] = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> Optional[User]:
    if not token:
        return None
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id_str = payload.get("sub")
        if user_id_str is None:
            return None
        user_id = int(user_id_str)
    except (JWTError, ValueError):
        return None
    
    user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
    return user

def get_current_user(user: Optional[User] = Depends(get_current_user_optional)) -> User:
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please log in.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user

def require_roles(*allowed_roles: str):
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if not current_user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required. Please log in.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        user_roles, _ = get_user_roles_and_permissions(current_user)
        if "admin" in user_roles or getattr(current_user, "is_admin", False) or "*" in allowed_roles:
            return current_user
        if any(r in allowed_roles for r in user_roles):
            return current_user
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access forbidden: requires one of the following roles: {', '.join(allowed_roles)}",
        )
    return role_checker

def require_permissions(*required_permissions: str):
    def permission_checker(current_user: User = Depends(get_current_user)) -> User:
        if not current_user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required. Please log in.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        user_roles, user_perms = get_user_roles_and_permissions(current_user)
        if "admin" in user_roles or getattr(current_user, "is_admin", False) or "*" in user_perms:
            return current_user

        missing = [p for p in required_permissions if p not in user_perms]
        if missing:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access forbidden: missing required permissions: {', '.join(missing)}",
            )
        return current_user
    return permission_checker

get_current_admin = require_roles("admin")


