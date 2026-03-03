from __future__ import annotations

import enum
import uuid

from sqlalchemy import Boolean, Enum, ForeignKey, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base
from app.models.base import BaseModelMixin, TenantModelMixin


# ── Role enum ─────────────────────────────────────────────────────────────────

class UserRole(str, enum.Enum):
    """
    Role values stored in the DB and embedded in JWT tokens.
    Using ``str`` as a mixin lets Pydantic serialise the enum as a plain string.
    """
    ADMIN = "admin"
    TEACHER = "teacher"


# ── Organization ──────────────────────────────────────────────────────────────

class Organization(Base, BaseModelMixin):
    """
    Top-level tenant entity.  Every other core model references this table
    via the ``organization_id`` FK (enforced by ``TenantModelMixin``).
    """

    __tablename__ = "organizations"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(
        String(100), nullable=False, unique=True, index=True
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    # Subscription / plan info can be added here in later steps

    # ── Relationships ─────────────────────────────────────────────────────────
    users: Mapped[list["User"]] = relationship(
        "User",
        back_populates="organization",
        cascade="all, delete-orphan",
        # lazy="dynamic" was removed in SQLAlchemy 2.0 — use selectinload() in
        # queries when you need eager loading, or the default lazy="select".
    )

    def __repr__(self) -> str:  # pragma: no cover
        return f"<Organization id={self.id} slug={self.slug!r}>"


# ── OrgSettings ───────────────────────────────────────────────────────────────

class OrgSettings(Base, BaseModelMixin):
    """
    Per-organisation feature-flag store.
    One row is created (with all defaults True) when an org registers.
    """

    __tablename__ = "org_settings"

    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )

    # ── Module toggles (all default to True / enabled) ────────────────────────
    mod_attendance:    Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    mod_fees:          Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    mod_leads:         Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    mod_courses:       Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    mod_teachers:      Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    mod_exams:         Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    mod_communication: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    organization: Mapped["Organization"] = relationship("Organization")

    def __repr__(self) -> str:  # pragma: no cover
        return f"<OrgSettings org={self.organization_id}>"


# ── User ──────────────────────────────────────────────────────────────────────

class User(Base, TenantModelMixin):
    """
    Represents an authenticated user belonging to a single Organization.
    Passwords are stored as bcrypt hashes — never in plain text.
    """

    __tablename__ = "users"
    __table_args__ = (
        # A given email must be unique within a single organization,
        # but the same email can exist across organisations.
        UniqueConstraint("email", "organization_id", name="uq_users_email_org"),
    )

    email: Mapped[str] = mapped_column(
        String(255), nullable=False, index=True
    )
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, name="userrole"),
        nullable=False,
        default=UserRole.TEACHER,
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # ── Relationships ─────────────────────────────────────────────────────────
    organization: Mapped["Organization"] = relationship(
        "Organization",
        back_populates="users",
        # Use a string so SA resolves the FK through the mapper registry at
        # startup — referencing TenantModelMixin.organization_id directly
        # doesn't work in SA 2.0 mapped-column mixins.
        foreign_keys="[User.organization_id]",
    )

    def __repr__(self) -> str:  # pragma: no cover
        return f"<User id={self.id} email={self.email!r} role={self.role}>"
