from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.dependencies import CurrentUser, DBSession
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_refresh_token,
    hash_password,
    verify_password,
)
from app.models.user import Organization, User, UserRole
from app.schemas.user import (
    AdminRegisterRequest,
    LoginRequest,
    RefreshTokenRequest,
    TokenResponse,
    UserResponse,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


# ── Helper ────────────────────────────────────────────────────────────────────

def _build_token_response(user: User) -> TokenResponse:
    """Construct the access + refresh token pair for a given user."""
    token_data = {
        "sub": str(user.id),
        "role": user.role.value,
        "org": str(user.organization_id),
    }
    return TokenResponse(
        access_token=create_access_token(token_data),
        refresh_token=create_refresh_token(token_data),
    )


# ── Register initial organisation + admin ─────────────────────────────────────

@router.post(
    "/register",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Bootstrap a new coaching-center tenant with its first Admin user.",
)
def register_organization(
    payload: AdminRegisterRequest,
    db: DBSession,
) -> TokenResponse:
    """
    Creates an **Organisation** and an **Admin** user atomically.

    - The organization ``slug`` must be globally unique.
    - The admin email must be unique within the organisation (enforced by DB constraint).
    - Returns JWT tokens so the admin can immediately authenticate.
    """
    # 1. Guard: slug must be unique
    existing_org: Organization | None = db.execute(
        select(Organization).where(Organization.slug == payload.organization.slug)
    ).scalar_one_or_none()

    if existing_org is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"An organisation with slug '{payload.organization.slug}' already exists.",
        )

    # 1.5 Guard: email must be unique across the entire system
    existing_user: User | None = db.execute(
        select(User).where(User.email == payload.admin_user.email)
    ).scalar_one_or_none()

    if existing_user is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A user with email '{payload.admin_user.email}' already exists.",
        )

    # 2. Create organisation
    org = Organization(
        name=payload.organization.name,
        slug=payload.organization.slug,
    )
    db.add(org)
    db.flush()  # Populate org.id without committing

    # 3. Create admin user
    admin = User(
        email=payload.admin_user.email,
        hashed_password=hash_password(payload.admin_user.password),
        full_name=payload.admin_user.full_name,
        role=UserRole.ADMIN,            # First user is always Admin
        organization_id=org.id,
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)

    return _build_token_response(admin)


# ── Login ─────────────────────────────────────────────────────────────────────

@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Authenticate with email + password and receive JWT tokens.",
)
def login(
    payload: LoginRequest,
    db: DBSession,
) -> TokenResponse:
    """
    Validates credentials and returns an access + refresh token pair.

    Note: we intentionally return the same generic error whether the email
    doesn't exist or the password is wrong, to prevent user enumeration.
    """
    user: User | None = db.execute(
        select(User).where(
            User.email == payload.email,
            User.is_active.is_(True),
        )
    ).scalar_one_or_none()

    _INVALID = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid email or password.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if user is None or not verify_password(payload.password, user.hashed_password):
        raise _INVALID

    return _build_token_response(user)


# ── Refresh ───────────────────────────────────────────────────────────────────

@router.post(
    "/refresh",
    response_model=TokenResponse,
    summary="Exchange a valid refresh token for a new token pair.",
)
def refresh_tokens(
    payload: RefreshTokenRequest,
    db: DBSession,
) -> TokenResponse:
    """
    Validates the refresh token, loads the user from DB, and issues a fresh
    access + refresh token pair (token rotation).
    """
    try:
        token_data = decode_refresh_token(payload.refresh_token)
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    import uuid as _uuid  # local import to avoid circular at module level

    user: User | None = db.execute(
        select(User).where(
            User.id == _uuid.UUID(token_data["sub"]),
            User.is_active.is_(True),
        )
    ).scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive.",
        )

    return _build_token_response(user)


# ── Current user info ─────────────────────────────────────────────────────────

@router.get(
    "/me",
    response_model=UserResponse,
    summary="Return the profile of the currently authenticated user.",
)
def get_me(current_user: CurrentUser) -> UserResponse:
    """Protected endpoint — requires a valid access token."""
    return UserResponse.model_validate(current_user)
