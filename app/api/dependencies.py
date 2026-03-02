from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import decode_access_token
from app.db.database import get_db
from app.models.user import User, UserRole
from app.schemas.user import TokenData

# ── HTTP Bearer extractor ─────────────────────────────────────────────────────
# `auto_error=False` lets us return a nicer 401 instead of FastAPI's default.
_bearer_scheme = HTTPBearer(auto_error=False)

# ── Convenience type aliases ──────────────────────────────────────────────────
DBSession = Annotated[Session, Depends(get_db)]
BearerCredentials = Annotated[
    HTTPAuthorizationCredentials | None, Depends(_bearer_scheme)
]


def _credentials_exception(detail: str = "Could not validate credentials") -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=detail,
        headers={"WWW-Authenticate": "Bearer"},
    )


# ── Token → TokenData ─────────────────────────────────────────────────────────

def _parse_token(credentials: BearerCredentials) -> TokenData:
    """
    Extract the raw JWT from the Authorization header, decode it, and return
    a validated ``TokenData`` instance.  Raises 401 on any failure.
    """
    if credentials is None:
        raise _credentials_exception("Authorization header missing.")
    try:
        payload = decode_access_token(credentials.credentials)
        user_id = payload.get("sub")
        role_str = payload.get("role")
        org_id = payload.get("org")

        if not all([user_id, role_str, org_id]):
            raise _credentials_exception("Incomplete token payload.")

        return TokenData(
            sub=uuid.UUID(str(user_id)),
            role=UserRole(role_str),
            org=uuid.UUID(str(org_id)),
        )
    except (JWTError, ValueError) as exc:
        raise _credentials_exception() from exc


# ── TokenData → User (with org context) ──────────────────────────────────────

def get_current_user(
    db: DBSession,
    credentials: BearerCredentials,
) -> User:
    """
    FastAPI dependency: validates the bearer token, fetches the matching User
    from the database, and ensures organization context is present.

    Usage::

        @router.get("/me")
        def me(current_user: User = Depends(get_current_user)):
            ...
    """
    token_data = _parse_token(credentials)

    user: User | None = db.execute(
        select(User).where(
            User.id == token_data.sub,
            User.organization_id == token_data.org,
            User.is_active.is_(True),
        )
    ).scalar_one_or_none()

    if user is None:
        raise _credentials_exception("User not found or inactive.")

    return user


# ── Role-based guards ─────────────────────────────────────────────────────────

def require_admin(current_user: Annotated[User, Depends(get_current_user)]) -> User:
    """
    Dependency that additionally requires the current user to hold the
    ``ADMIN`` role.  Returns the user unchanged so callers can still use it.
    """
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrator role required.",
        )
    return current_user


def require_teacher_or_admin(
    current_user: Annotated[User, Depends(get_current_user)],
) -> User:
    """
    Dependency that accepts both TEACHER and ADMIN roles.
    """
    if current_user.role not in {UserRole.ADMIN, UserRole.TEACHER}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions.",
        )
    return current_user


# ── Annotated dependency shortcuts ───────────────────────────────────────────
# Import these in routers for clean, readable signatures.

CurrentUser = Annotated[User, Depends(get_current_user)]
AdminUser = Annotated[User, Depends(require_admin)]
TeacherOrAdminUser = Annotated[User, Depends(require_teacher_or_admin)]
