"""courses.py — Course, Batch, and BatchStudent management."""
from __future__ import annotations

import uuid
from datetime import date

from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import select

from app.api.dependencies import CurrentUser, DBSession
from app.models.crm import Batch, BatchStatus, BatchStudent, Course, Student

router = APIRouter(prefix="/courses", tags=["Courses & Batches"])


# ── Schemas ───────────────────────────────────────────────────────────────────

class CourseOut(BaseModel):
    id: uuid.UUID
    name: str
    description: str | None
    duration_months: int | None
    fee_amount: float
    is_active: bool
    model_config = {"from_attributes": True}


class CourseCreate(BaseModel):
    name: str
    description: str | None = None
    duration_months: int | None = None
    fee_amount: float = 0
    is_active: bool = True


class CourseUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    duration_months: int | None = None
    fee_amount: float | None = None
    is_active: bool | None = None


class BatchOut(BaseModel):
    id: uuid.UUID
    course_id: uuid.UUID
    name: str
    schedule: str | None
    teacher_name: str | None
    capacity: int | None
    status: BatchStatus
    classroom: str | None
    start_date: date | None
    end_date: date | None
    is_online: bool
    enrolled_count: int = 0
    model_config = {"from_attributes": True}


class BatchCreate(BaseModel):
    course_id: uuid.UUID
    name: str
    schedule: str | None = None
    teacher_name: str | None = None
    capacity: int | None = None
    status: BatchStatus = BatchStatus.ACTIVE
    classroom: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    is_online: bool = False


class BatchUpdate(BaseModel):
    name: str | None = None
    schedule: str | None = None
    teacher_name: str | None = None
    capacity: int | None = None
    status: BatchStatus | None = None
    classroom: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    is_online: bool | None = None


class StudentSummary(BaseModel):
    id: uuid.UUID
    full_name: str
    phone: str | None
    class_name: str | None
    model_config = {"from_attributes": True}


# ── Course endpoints ──────────────────────────────────────────────────────────

@router.post("/", response_model=CourseOut, status_code=status.HTTP_201_CREATED)
def create_course(payload: CourseCreate, db: DBSession, current_user: CurrentUser) -> CourseOut:
    course = Course(**payload.model_dump(), organization_id=current_user.organization_id)
    db.add(course); db.commit(); db.refresh(course)
    return CourseOut.model_validate(course)


@router.get("/", response_model=list[CourseOut])
def list_courses(db: DBSession, current_user: CurrentUser) -> list[CourseOut]:
    courses = db.execute(
        select(Course).where(Course.organization_id == current_user.organization_id).order_by(Course.name)
    ).scalars().all()
    return [CourseOut.model_validate(c) for c in courses]


@router.patch("/{course_id}", response_model=CourseOut)
def update_course(course_id: uuid.UUID, payload: CourseUpdate, db: DBSession, current_user: CurrentUser) -> CourseOut:
    course = db.execute(select(Course).where(Course.id == course_id, Course.organization_id == current_user.organization_id)).scalar_one_or_none()
    if not course: raise HTTPException(404, "Course not found.")
    for f, v in payload.model_dump(exclude_none=True).items(): setattr(course, f, v)
    db.add(course); db.commit(); db.refresh(course)
    return CourseOut.model_validate(course)


@router.delete("/{course_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_course(course_id: uuid.UUID, db: DBSession, current_user: CurrentUser):
    course = db.execute(select(Course).where(Course.id == course_id, Course.organization_id == current_user.organization_id)).scalar_one_or_none()
    if course: db.delete(course); db.commit()


# ── Batch endpoints ───────────────────────────────────────────────────────────

@router.post("/batches", response_model=BatchOut, status_code=status.HTTP_201_CREATED)
def create_batch(payload: BatchCreate, db: DBSession, current_user: CurrentUser) -> BatchOut:
    batch = Batch(**payload.model_dump(), organization_id=current_user.organization_id)
    db.add(batch); db.commit(); db.refresh(batch)
    out = BatchOut.model_validate(batch)
    out.enrolled_count = 0
    return out


@router.get("/batches", response_model=list[BatchOut])
def list_batches(
    db: DBSession, current_user: CurrentUser,
    course_id: uuid.UUID | None = Query(None),
) -> list[BatchOut]:
    q = select(Batch).where(Batch.organization_id == current_user.organization_id)
    if course_id: q = q.where(Batch.course_id == course_id)
    batches = db.execute(q.order_by(Batch.name)).scalars().all()
    result = []
    for b in batches:
        out = BatchOut.model_validate(b)
        out.enrolled_count = db.execute(
            select(BatchStudent).where(BatchStudent.batch_id == b.id)
        ).scalars().__class__.__mro__  # count via len
        out.enrolled_count = len(list(db.execute(
            select(BatchStudent).where(BatchStudent.batch_id == b.id, BatchStudent.organization_id == current_user.organization_id)
        ).scalars().all()))
        result.append(out)
    return result


@router.patch("/batches/{batch_id}", response_model=BatchOut)
def update_batch(batch_id: uuid.UUID, payload: BatchUpdate, db: DBSession, current_user: CurrentUser) -> BatchOut:
    batch = db.execute(select(Batch).where(Batch.id == batch_id, Batch.organization_id == current_user.organization_id)).scalar_one_or_none()
    if not batch: raise HTTPException(404, "Batch not found.")
    for f, v in payload.model_dump(exclude_none=True).items(): setattr(batch, f, v)
    db.add(batch); db.commit(); db.refresh(batch)
    out = BatchOut.model_validate(batch)
    out.enrolled_count = len(list(db.execute(select(BatchStudent).where(BatchStudent.batch_id == batch.id, BatchStudent.organization_id == current_user.organization_id)).scalars().all()))
    return out


@router.delete("/batches/{batch_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_batch(batch_id: uuid.UUID, db: DBSession, current_user: CurrentUser):
    batch = db.execute(select(Batch).where(Batch.id == batch_id, Batch.organization_id == current_user.organization_id)).scalar_one_or_none()
    if batch: db.delete(batch); db.commit()


@router.get("/batches/{batch_id}/students", response_model=list[StudentSummary])
def get_batch_students(batch_id: uuid.UUID, db: DBSession, current_user: CurrentUser) -> list[StudentSummary]:
    rows = db.execute(
        select(Student)
        .join(BatchStudent, BatchStudent.student_id == Student.id)
        .where(BatchStudent.batch_id == batch_id, BatchStudent.organization_id == current_user.organization_id)
    ).scalars().all()
    return [StudentSummary.model_validate(s) for s in rows]


@router.post("/batches/{batch_id}/students/{student_id}", status_code=status.HTTP_201_CREATED)
def enroll_student(batch_id: uuid.UUID, student_id: uuid.UUID, db: DBSession, current_user: CurrentUser):
    existing = db.execute(
        select(BatchStudent).where(
            BatchStudent.batch_id == batch_id,
            BatchStudent.student_id == student_id,
            BatchStudent.organization_id == current_user.organization_id,
        )
    ).scalar_one_or_none()
    if not existing:
        bs = BatchStudent(batch_id=batch_id, student_id=student_id, organization_id=current_user.organization_id)
        db.add(bs); db.commit()
    return {"ok": True}


@router.delete("/batches/{batch_id}/students/{student_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_from_batch(batch_id: uuid.UUID, student_id: uuid.UUID, db: DBSession, current_user: CurrentUser):
    bs = db.execute(
        select(BatchStudent).where(
            BatchStudent.batch_id == batch_id,
            BatchStudent.student_id == student_id,
            BatchStudent.organization_id == current_user.organization_id,
        )
    ).scalar_one_or_none()
    if bs: db.delete(bs); db.commit()
