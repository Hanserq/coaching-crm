from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from jose import JWTError
from pydantic import BaseModel

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
    ChangePasswordRequest,
    InviteUserRequest,
    LoginRequest,
    ProfileUpdate,
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
    # Fetch ALL active users with this email (there may be one per org)
    candidates = db.execute(
        select(User).where(
            User.email == payload.email,
            User.is_active.is_(True),
        )
    ).scalars().all()

    _INVALID = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid email or password.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if not candidates:
        raise _INVALID

    # Find the candidate whose password matches
    user: User | None = next(
        (u for u in candidates if verify_password(payload.password, u.hashed_password)),
        None,
    )
    if user is None:
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


@router.patch(
    "/me",
    response_model=UserResponse,
    summary="Update the current user's own profile (full name).",
)
def update_me(
    payload: ProfileUpdate,
    db: DBSession,
    current_user: CurrentUser,
) -> UserResponse:
    """Allow the authenticated user to update their own full name."""
    current_user.full_name = payload.full_name
    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return UserResponse.model_validate(current_user)


@router.post(
    "/me/change-password",
    status_code=status.HTTP_204_NO_CONTENT,
    response_model=None,
    summary="Change the current user's password.",
)
def change_password(
    payload: ChangePasswordRequest,
    db: DBSession,
    current_user: CurrentUser,
):
    """Verifies the current password before setting the new one."""
    if not verify_password(payload.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect.",
        )
    current_user.hashed_password = hash_password(payload.new_password)
    db.add(current_user)
    db.commit()


# ── Invite a user to the current organisation ─────────────────────────────

@router.post(
    "/invite",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Invite a new user (teacher or admin) into the current organisation.",
)
def invite_user(
    payload: InviteUserRequest,
    db: DBSession,
    current_user: CurrentUser,
) -> UserResponse:
    """
    Create a new user that belongs to the **same** organisation as the
    calling admin.  Only admins may call this endpoint.
    """
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only org admins can invite users.",
        )
    # Check for duplicate email
    existing = db.execute(select(User).where(User.email == payload.email)).scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with that email already exists.",
        )
    new_user = User(
        full_name=payload.full_name,
        email=payload.email,
        hashed_password=hash_password(payload.password),
        role=payload.role,
        organization_id=current_user.organization_id,
        is_active=True,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return UserResponse.model_validate(new_user)


# ── Forgot / Reset password ───────────────────────────────────────────────────

import secrets
import urllib.request
import urllib.error
import json as _json
from datetime import datetime, timedelta, timezone


class ForgotPasswordRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    email: str
    token: str
    new_password: str


def _send_reset_email(to_email: str, otp: str, user_name: str) -> bool:
    """Send OTP via Resend API. Returns True if sent, False if key not configured."""
    from app.core.config import settings as _s
    if not _s.RESEND_API_KEY:
        return False  # No email key — fallback to showing token on screen

    html_body = f"""
    <div style="font-family:Inter,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#f9fafb;border-radius:16px">
      <div style="background:#7c3aed;border-radius:12px;padding:20px;text-align:center;margin-bottom:24px">
        <h1 style="color:white;margin:0;font-size:22px">Password Reset</h1>
      </div>
      <p style="color:#374151;font-size:15px">Hi <strong>{user_name}</strong>,</p>
      <p style="color:#374151;font-size:15px">Use this 6-digit code to reset your CoachingCRM password:</p>
      <div style="background:white;border:2px solid #7c3aed;border-radius:12px;padding:24px;text-align:center;margin:24px 0">
        <span style="font-size:40px;font-weight:900;letter-spacing:10px;color:#7c3aed">{otp}</span>
      </div>
      <p style="color:#6b7280;font-size:13px">⏰ This code expires in <strong>15 minutes</strong>.</p>
      <p style="color:#6b7280;font-size:13px">If you didn't request this, ignore this email safely.</p>
    </div>
    """

    payload_data = _json.dumps({{
        "from": _s.RESEND_FROM_EMAIL,
        "to": [to_email],
        "subject": f"Your CoachingCRM reset code: {otp}",
        "html": html_body,
    }}).encode()

    try:
        req = urllib.request.Request(
            "https://api.resend.com/emails",
            data=payload_data,
            headers={{
                "Authorization": f"Bearer {{_s.RESEND_API_KEY}}",
                "Content-Type": "application/json",
            }},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            return resp.status in (200, 201)
    except urllib.error.HTTPError as e:
        import logging
        logging.getLogger(__name__).error("Resend failed: %s %s", e.code, e.read())
        return False
    except Exception as e:
        import logging
        logging.getLogger(__name__).error("Resend error: %s", e)
        return False


@router.post("/forgot-password", summary="Generate a 6-digit password-reset OTP.")
def forgot_password(payload: ForgotPasswordRequest, db: DBSession):
    # Find the most-recently-created active user with this email
    users = db.execute(
        select(User).where(
            User.email == payload.email,
            User.is_active.is_(True),
        ).order_by(User.created_at.desc())
    ).scalars().all()

    # Always return 200 (don't reveal whether email exists)
    if not users:
        return {{"message": "If that email exists, a reset code has been sent.", "email_sent": False, "token": None}}

    otp = f"{{secrets.randbelow(1_000_000):06d}}"   # 6-digit OTP
    expires = datetime.now(timezone.utc) + timedelta(minutes=15)

    # Apply token to ALL matching users (across orgs) so any can reset
    for u in users:
        u.reset_token = otp
        u.reset_token_expires = expires
        db.add(u)
    db.commit()

    email_sent = _send_reset_email(payload.email, otp, users[0].full_name)

    return {{
        "message": "Reset code sent to email." if email_sent else "Reset token generated.",
        "email_sent": email_sent,
        # Only return token in response when email NOT configured (dev/fallback mode)
        "token": None if email_sent else otp,
        "expires_in_minutes": 15,
    }}


@router.post("/reset-password", summary="Reset password using the 6-digit OTP.")
def reset_password(payload: ResetPasswordRequest, db: DBSession):
    users = db.execute(
        select(User).where(
            User.email == payload.email,
            User.is_active.is_(True),
        )
    ).scalars().all()

    if not users:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token.")

    # Find a matching user with valid token
    now = datetime.now(timezone.utc)
    target: User | None = next(
        (u for u in users
         if u.reset_token == payload.token
         and u.reset_token_expires is not None
         and now <= u.reset_token_expires),
        None,
    )

    if target is None:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token.")

    if len(payload.new_password) < 6:
        raise HTTPException(status_code=422, detail="Password must be at least 6 characters.")

    # Update password for matched user and clear token for all matching users
    new_hash = hash_password(payload.new_password)
    for u in users:
        if u.id == target.id:
            u.hashed_password = new_hash
        u.reset_token = None
        u.reset_token_expires = None
        db.add(u)
    db.commit()
    return {{"message": "Password reset successfully. You can now log in."}}
