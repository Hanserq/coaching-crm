from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

import bcrypt
from jose import JWTError, jwt

from app.core.config import settings

# ── Password hashing (bcrypt directly — avoids passlib/bcrypt 5.x incompatibility) ──

def hash_password(plain_password: str) -> str:
    """Return a bcrypt-hashed version of *plain_password*."""
    return bcrypt.hashpw(plain_password.encode(), bcrypt.gensalt()).decode()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Return True if *plain_password* matches *hashed_password*."""
    return bcrypt.checkpw(plain_password.encode(), hashed_password.encode())


# ── JWT helpers ───────────────────────────────────────────────────────────────

def _create_token(data: dict[str, Any], expires_delta: timedelta) -> str:
    """
    Internal helper: clone *data*, add a UTC expiry claim, then encode.
    """
    payload = data.copy()
    expire = datetime.now(tz=timezone.utc) + expires_delta
    payload.update({"exp": expire})
    return jwt.encode(
        payload,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )


def create_access_token(data: dict[str, Any]) -> str:
    """
    Create a short-lived JWT access token.

    *data* should contain at minimum:
      - ``sub``  — the user's UUID string
      - ``role`` — the user's role string
      - ``org``  — the organization UUID string
    """
    return _create_token(
        data,
        timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )


def create_refresh_token(data: dict[str, Any]) -> str:
    """
    Create a long-lived JWT refresh token.

    Carries only ``sub`` and ``type: refresh`` to minimise surface area.
    """
    refresh_data = {"sub": data["sub"], "type": "refresh"}
    return _create_token(
        refresh_data,
        timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    )


def decode_access_token(token: str) -> dict[str, Any]:
    """
    Decode and validate a JWT access token.

    Raises:
        jose.JWTError: if the token is invalid, expired, or tampered with.
    """
    return jwt.decode(
        token,
        settings.JWT_SECRET_KEY,
        algorithms=[settings.JWT_ALGORITHM],
    )


def decode_refresh_token(token: str) -> dict[str, Any]:
    """
    Decode and validate a JWT refresh token.

    Additionally verifies that the ``type`` claim equals ``"refresh"``.

    Raises:
        jose.JWTError: if the token is invalid or not a refresh token.
    """
    payload: dict[str, Any] = jwt.decode(
        token,
        settings.JWT_SECRET_KEY,
        algorithms=[settings.JWT_ALGORITHM],
    )
    if payload.get("type") != "refresh":
        raise JWTError("Token is not a refresh token.")
    return payload
