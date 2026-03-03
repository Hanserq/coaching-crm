"""settings.py — Module feature-flag management for an organisation."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select

from app.api.dependencies import CurrentUser, DBSession
from app.models.user import OrgSettings, UserRole

router = APIRouter(prefix="/settings", tags=["Settings"])


# ── Schema ────────────────────────────────────────────────────────────────────

class ModuleSettings(BaseModel):
    mod_attendance:    bool = True
    mod_fees:          bool = True
    mod_leads:         bool = True
    mod_courses:       bool = True
    mod_teachers:      bool = True
    mod_exams:         bool = True
    mod_communication: bool = True

    model_config = {"from_attributes": True}


# ── Helper ────────────────────────────────────────────────────────────────────

def _get_or_create_settings(org_id, db) -> OrgSettings:
    """Return the org's settings row, creating one with defaults if missing."""
    row = db.execute(
        select(OrgSettings).where(OrgSettings.organization_id == org_id)
    ).scalar_one_or_none()
    if row is None:
        row = OrgSettings(organization_id=org_id)
        db.add(row)
        db.commit()
        db.refresh(row)
    return row


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get(
    "/modules",
    response_model=ModuleSettings,
    summary="Get the feature-module flags for the current organisation.",
)
def get_module_settings(db: DBSession, current_user: CurrentUser) -> ModuleSettings:
    row = _get_or_create_settings(current_user.organization_id, db)
    return ModuleSettings.model_validate(row)


@router.patch(
    "/modules",
    response_model=ModuleSettings,
    summary="Toggle one or more feature modules on/off. Admin only.",
)
def update_module_settings(
    payload: ModuleSettings,
    db: DBSession,
    current_user: CurrentUser,
) -> ModuleSettings:
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only org admins can change module settings.",
        )
    row = _get_or_create_settings(current_user.organization_id, db)
    for field, value in payload.model_dump().items():
        setattr(row, field, value)
    db.add(row)
    db.commit()
    db.refresh(row)
    return ModuleSettings.model_validate(row)
