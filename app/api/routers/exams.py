"""exams.py — Exam creation, marks entry, and notice/announcement management."""
from __future__ import annotations

import uuid
from datetime import date

from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import select

from app.api.dependencies import CurrentUser, DBSession
from app.models.crm import Exam, ExamResult, Notice, NoticeAudience

router = APIRouter(tags=["Exams & Notices"])


# ── Exam schemas ──────────────────────────────────────────────────────────────

class ExamOut(BaseModel):
    id: uuid.UUID
    title: str
    subject: str | None
    exam_date: date
    max_marks: float
    course_id: uuid.UUID | None
    batch_id: uuid.UUID | None
    model_config = {"from_attributes": True}


class ExamCreate(BaseModel):
    title: str
    subject: str | None = None
    exam_date: date
    max_marks: float = 100
    course_id: uuid.UUID | None = None
    batch_id: uuid.UUID | None = None


class ResultOut(BaseModel):
    id: uuid.UUID
    exam_id: uuid.UUID
    student_id: uuid.UUID
    student_name: str | None = None
    marks_obtained: float
    remarks: str | None
    is_absent: bool
    percentage: float = 0
    model_config = {"from_attributes": True}


class ResultUpsert(BaseModel):
    student_id: uuid.UUID
    marks_obtained: float = 0
    remarks: str | None = None
    is_absent: bool = False


# ── Notice schemas ────────────────────────────────────────────────────────────

class NoticeOut(BaseModel):
    id: uuid.UUID
    title: str
    body: str
    audience: NoticeAudience
    is_pinned: bool
    author: str | None
    created_at: date
    model_config = {"from_attributes": True}


class NoticeCreate(BaseModel):
    title: str
    body: str
    audience: NoticeAudience = NoticeAudience.ALL
    is_pinned: bool = False


# ── Exam endpoints ────────────────────────────────────────────────────────────

exam_router = APIRouter(prefix="/exams", tags=["Exams & Notices"])


@exam_router.post("/", response_model=ExamOut, status_code=status.HTTP_201_CREATED)
def create_exam(payload: ExamCreate, db: DBSession, current_user: CurrentUser) -> ExamOut:
    exam = Exam(**payload.model_dump(), organization_id=current_user.organization_id)
    db.add(exam); db.commit(); db.refresh(exam)
    return ExamOut.model_validate(exam)


@exam_router.get("/", response_model=list[ExamOut])
def list_exams(db: DBSession, current_user: CurrentUser, course_id: uuid.UUID | None = Query(None)) -> list[ExamOut]:
    q = select(Exam).where(Exam.organization_id == current_user.organization_id)
    if course_id: q = q.where(Exam.course_id == course_id)
    exams = db.execute(q.order_by(Exam.exam_date.desc())).scalars().all()
    return [ExamOut.model_validate(e) for e in exams]


@exam_router.delete("/{exam_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_exam(exam_id: uuid.UUID, db: DBSession, current_user: CurrentUser):
    exam = db.execute(select(Exam).where(Exam.id == exam_id, Exam.organization_id == current_user.organization_id)).scalar_one_or_none()
    if exam: db.delete(exam); db.commit()


@exam_router.get("/{exam_id}/results", response_model=list[ResultOut])
def get_exam_results(exam_id: uuid.UUID, db: DBSession, current_user: CurrentUser) -> list[ResultOut]:
    exam = db.execute(select(Exam).where(Exam.id == exam_id, Exam.organization_id == current_user.organization_id)).scalar_one_or_none()
    if not exam: raise HTTPException(404, "Exam not found.")
    results = db.execute(select(ExamResult).where(ExamResult.exam_id == exam_id, ExamResult.organization_id == current_user.organization_id)).scalars().all()
    out = []
    for r in results:
        pct = round(r.marks_obtained / exam.max_marks * 100, 1) if exam.max_marks > 0 else 0
        ro = ResultOut.model_validate(r)
        ro.percentage = pct
        out.append(ro)
    return sorted(out, key=lambda x: x.marks_obtained, reverse=True)


@exam_router.post("/{exam_id}/results", response_model=list[ResultOut], status_code=status.HTTP_201_CREATED)
def upsert_exam_results(exam_id: uuid.UUID, payload: list[ResultUpsert], db: DBSession, current_user: CurrentUser) -> list[ResultOut]:
    exam = db.execute(select(Exam).where(Exam.id == exam_id, Exam.organization_id == current_user.organization_id)).scalar_one_or_none()
    if not exam: raise HTTPException(404, "Exam not found.")
    out = []
    for entry in payload:
        existing = db.execute(
            select(ExamResult).where(ExamResult.exam_id == exam_id, ExamResult.student_id == entry.student_id, ExamResult.organization_id == current_user.organization_id)
        ).scalar_one_or_none()
        if existing:
            existing.marks_obtained = entry.marks_obtained
            existing.remarks = entry.remarks
            existing.is_absent = entry.is_absent
            db.add(existing); db.commit(); db.refresh(existing)
            r = existing
        else:
            r = ExamResult(exam_id=exam_id, organization_id=current_user.organization_id, **entry.model_dump())
            db.add(r); db.commit(); db.refresh(r)
        pct = round(r.marks_obtained / exam.max_marks * 100, 1) if exam.max_marks > 0 else 0
        ro = ResultOut.model_validate(r)
        ro.percentage = pct
        out.append(ro)
    return out


# ── Notice endpoints ──────────────────────────────────────────────────────────

notice_router = APIRouter(prefix="/notices", tags=["Exams & Notices"])


@notice_router.post("/", response_model=NoticeOut, status_code=status.HTTP_201_CREATED)
def create_notice(payload: NoticeCreate, db: DBSession, current_user: CurrentUser) -> NoticeOut:
    notice = Notice(**payload.model_dump(), author=current_user.full_name, organization_id=current_user.organization_id)
    db.add(notice); db.commit(); db.refresh(notice)
    return NoticeOut.model_validate(notice)


@notice_router.get("/", response_model=list[NoticeOut])
def list_notices(db: DBSession, current_user: CurrentUser) -> list[NoticeOut]:
    notices = db.execute(
        select(Notice).where(Notice.organization_id == current_user.organization_id).order_by(Notice.is_pinned.desc(), Notice.created_at.desc())
    ).scalars().all()
    return [NoticeOut.model_validate(n) for n in notices]


@notice_router.delete("/{notice_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_notice(notice_id: uuid.UUID, db: DBSession, current_user: CurrentUser):
    notice = db.execute(select(Notice).where(Notice.id == notice_id, Notice.organization_id == current_user.organization_id)).scalar_one_or_none()
    if notice: db.delete(notice); db.commit()
