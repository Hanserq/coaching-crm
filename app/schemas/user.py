from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.models.user import UserRole


# ── Shared helpers ────────────────────────────────────────────────────────────

class _OrmBase(BaseModel):
    """Base schema that enables ORM mode for all response schemas."""
    model_config = ConfigDict(from_attributes=True)


# ── Organization schemas ──────────────────────────────────────────────────────

class OrganizationCreate(BaseModel):
    """Payload for creating a new coaching-center organisation."""
    name: str = Field(..., min_length=2, max_length=255)
    slug: str = Field(
        ...,
        min_length=2,
        max_length=100,
        pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$",
        description="URL-friendly unique identifier (lowercase, hyphens only).",
    )

    @field_validator("slug")
    @classmethod
    def _slug_lowercase(cls, v: str) -> str:
        return v.lower()


class OrganizationResponse(_OrmBase):
    """Public representation of an Organisation."""
    id: uuid.UUID
    name: str
    slug: str
    is_active: bool
    created_at: datetime


# ── User schemas ──────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    """Payload for creating a new user inside an existing organisation."""
    email: EmailStr
    password: str = Field(
        ...,
        min_length=8,
        description="Plain-text password — will be hashed before storage.",
    )
    full_name: str = Field(..., min_length=1, max_length=255)
    role: UserRole = UserRole.TEACHER


class AdminRegisterRequest(BaseModel):
    """
    One-shot payload for bootstrapping a new tenant:
    creates the Organisation and its first Admin user atomically.
    """
    organization: OrganizationCreate
    admin_user: UserCreate


class UserResponse(_OrmBase):
    """Public representation of a User (no password fields exposed)."""
    id: uuid.UUID
    email: str
    full_name: str
    role: UserRole
    is_active: bool
    organization_id: uuid.UUID
    created_at: datetime


# ── Auth token schemas ────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    """Credentials for the login endpoint."""
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    """Returned after a successful login or token refresh."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshTokenRequest(BaseModel):
    """Payload for the token-refresh endpoint."""
    refresh_token: str


class TokenData(BaseModel):
    """
    Decoded claims extracted from a validated JWT.
    Used internally by ``get_current_user`` — never sent to the client.
    """
    sub: uuid.UUID          # User UUID
    role: UserRole
    org: uuid.UUID          # Organization UUID
