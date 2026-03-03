"""leads.py — Lead & Admission pipeline management."""
from __future__ import annotations

import uuid
from datetime import date

from fastapi import APIRouter, Query, status
from pydantic import BaseModel
from sqlalchemy import func, select

from app.api.dependencies import CurrentUser, DBSession
from app.models.crm import Lead, LeadNote, LeadSource, LeadStatus

router = APIRouter(prefix="/leads", tags=["Leads"])


# ── Schemas ───────────────────────────────────────────────────────────────────

class LeadNoteOut(BaseModel):
    id: uuid.UUID
    lead_id: uuid.UUID
    content: str
    author: str | None
    created_at: date
    model_config = {"from_attributes": True}


class LeadOut(BaseModel):
    id: uuid.UUID
    full_name: str
    phone: str | None
    email: str | None
    course_interest: str | None
    source: LeadSource
    status: LeadStatus
    next_followup_date: date | None
    counselor_name: str | None
    notes: str | None
    created_at: date
    lead_notes: list[LeadNoteOut] = []
    model_config = {"from_attributes": True}


class LeadCreate(BaseModel):
    full_name: str
    phone: str | None = None
    email: str | None = None
    course_interest: str | None = None
    source: LeadSource = LeadSource.OTHER
    status: LeadStatus = LeadStatus.NEW
    next_followup_date: date | None = None
    counselor_name: str | None = None
    notes: str | None = None


class LeadUpdate(BaseModel):
    full_name: str | None = None
    phone: str | None = None
    email: str | None = None
    course_interest: str | None = None
    source: LeadSource | None = None
    status: LeadStatus | None = None
    next_followup_date: date | None = None
    counselor_name: str | None = None
    notes: str | None = None


class LeadNoteCreate(BaseModel):
    content: str
    author: str | None = None


class LeadFunnelStats(BaseModel):
    new: int
    contacted: int
    demo_scheduled: int
    follow_up: int
    converted: int
    lost: int
    total: int


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/", response_model=LeadOut, status_code=status.HTTP_201_CREATED)
def create_lead(payload: LeadCreate, db: DBSession, current_user: CurrentUser) -> LeadOut:
    lead = Lead(**payload.model_dump(), organization_id=current_user.organization_id)
    db.add(lead)
    db.commit()
    db.refresh(lead)
    return LeadOut.model_validate(lead)


@router.get("/", response_model=list[LeadOut])
def list_leads(
    db: DBSession,
    current_user: CurrentUser,
    status_filter: LeadStatus | None = Query(None, alias="status"),
    search: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, le=200),
) -> list[LeadOut]:
    q = select(Lead).where(Lead.organization_id == current_user.organization_id)
    if status_filter:
        q = q.where(Lead.status == status_filter)
    if search:
        q = q.where(Lead.full_name.ilike(f"%{search}%"))
    q = q.order_by(Lead.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    leads = db.execute(q).scalars().all()
    return [LeadOut.model_validate(l) for l in leads]


@router.get("/stats", response_model=LeadFunnelStats)
def lead_funnel_stats(db: DBSession, current_user: CurrentUser) -> LeadFunnelStats:
    counts: dict[str, int] = {}
    rows = db.execute(
        select(Lead.status, func.count(Lead.id).label("cnt"))
        .where(Lead.organization_id == current_user.organization_id)
        .group_by(Lead.status)
    ).all()
    for row in rows:
        counts[row.status.value] = row.cnt
    total = sum(counts.values())
    return LeadFunnelStats(
        new=counts.get("new", 0),
        contacted=counts.get("contacted", 0),
        demo_scheduled=counts.get("demo_scheduled", 0),
        follow_up=counts.get("follow_up", 0),
        converted=counts.get("converted", 0),
        lost=counts.get("lost", 0),
        total=total,
    )


@router.get("/{lead_id}", response_model=LeadOut)
def get_lead(lead_id: uuid.UUID, db: DBSession, current_user: CurrentUser) -> LeadOut:
    lead = db.execute(
        select(Lead).where(Lead.id == lead_id, Lead.organization_id == current_user.organization_id)
    ).scalar_one_or_none()
    if not lead:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Lead not found.")
    return LeadOut.model_validate(lead)


@router.patch("/{lead_id}", response_model=LeadOut)
def update_lead(lead_id: uuid.UUID, payload: LeadUpdate, db: DBSession, current_user: CurrentUser) -> LeadOut:
    lead = db.execute(
        select(Lead).where(Lead.id == lead_id, Lead.organization_id == current_user.organization_id)
    ).scalar_one_or_none()
    if not lead:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Lead not found.")
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(lead, field, value)
    db.add(lead)
    db.commit()
    db.refresh(lead)
    return LeadOut.model_validate(lead)


@router.delete("/{lead_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_lead(lead_id: uuid.UUID, db: DBSession, current_user: CurrentUser):
    lead = db.execute(
        select(Lead).where(Lead.id == lead_id, Lead.organization_id == current_user.organization_id)
    ).scalar_one_or_none()
    if lead:
        db.delete(lead)
        db.commit()


@router.post("/{lead_id}/notes", response_model=LeadNoteOut, status_code=status.HTTP_201_CREATED)
def add_lead_note(lead_id: uuid.UUID, payload: LeadNoteCreate, db: DBSession, current_user: CurrentUser) -> LeadNoteOut:
    note = LeadNote(
        lead_id=lead_id,
        content=payload.content,
        author=payload.author or current_user.full_name,
        organization_id=current_user.organization_id,
    )
    db.add(note)
    db.commit()
    db.refresh(note)
    return LeadNoteOut.model_validate(note)
