from __future__ import annotations

import math
import uuid

from fastapi import APIRouter, HTTPException, Query, status
from fastapi.responses import Response
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.api.dependencies import CurrentUser, DBSession, TeacherOrAdminUser
from app.models.crm import Student, StudentStatus
from app.schemas.crm import (
    PaginatedResponse,
    StudentCreate,
    StudentResponse,
    StudentUpdate,
)

router = APIRouter(prefix="/students", tags=["Students"])


# ── Helpers ───────────────────────────────────────────────────────────────────

def _get_student_or_404(
    student_id: uuid.UUID,
    org_id: uuid.UUID,
    db: Session,
) -> Student:
    """Fetch a student that belongs to the caller's organisation or raise 404."""
    student: Student | None = db.execute(
        select(Student).where(
            Student.id == student_id,
            Student.organization_id == org_id,
        )
    ).scalar_one_or_none()

    if student is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student {student_id} not found.",
        )
    return student


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post(
    "/",
    response_model=StudentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new student (Admin only).",
)
def create_student(
    payload: StudentCreate,
    db: DBSession,
    current_user: CurrentUser,
) -> StudentResponse:
    student = Student(
        **payload.model_dump(),
        organization_id=current_user.organization_id,
    )
    db.add(student)
    db.commit()
    db.refresh(student)
    return StudentResponse.model_validate(student)


@router.get(
    "/",
    response_model=PaginatedResponse[StudentResponse],
    summary="List students with optional search and pagination.",
)
def list_students(
    db: DBSession,
    current_user: CurrentUser,
    page: int = Query(1, ge=1, description="Page number (1-indexed)."),
    page_size: int = Query(20, ge=1, le=100, description="Items per page."),
    search: str | None = Query(None, description="Search by full_name or phone."),
    status_filter: StudentStatus | None = Query(None, alias="status"),
) -> PaginatedResponse[StudentResponse]:
    """
    Returns a paginated list of students scoped to the caller's organisation.
    Supports free-text search across ``full_name`` and ``phone``, and an
    optional ``status`` filter.
    """
    base_query = select(Student).where(
        Student.organization_id == current_user.organization_id
    )

    if search:
        term = f"%{search.strip()}%"
        base_query = base_query.where(
            or_(
                Student.full_name.ilike(term),
                Student.phone.ilike(term),
            )
        )

    if status_filter is not None:
        base_query = base_query.where(Student.status == status_filter)

    # Count total matching rows (without LIMIT/OFFSET)
    total: int = db.execute(
        select(func.count()).select_from(base_query.subquery())
    ).scalar_one()

    students = db.execute(
        base_query.order_by(Student.full_name)
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).scalars().all()

    return PaginatedResponse[StudentResponse](
        total=total,
        page=page,
        page_size=page_size,
        pages=max(1, math.ceil(total / page_size)),
        items=[StudentResponse.model_validate(s) for s in students],
    )


@router.get(
    "/{student_id}",
    response_model=StudentResponse,
    summary="Get a single student by ID.",
)
def get_student(
    student_id: uuid.UUID,
    db: DBSession,
    current_user: CurrentUser,
) -> StudentResponse:
    student = _get_student_or_404(student_id, current_user.organization_id, db)
    return StudentResponse.model_validate(student)


@router.patch(
    "/{student_id}",
    response_model=StudentResponse,
    summary="Partially update a student.",
)
def update_student(
    student_id: uuid.UUID,
    payload: StudentUpdate,
    db: DBSession,
    current_user: CurrentUser,
) -> StudentResponse:
    student = _get_student_or_404(student_id, current_user.organization_id, db)

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(student, field, value)

    db.add(student)
    db.commit()
    db.refresh(student)
    return StudentResponse.model_validate(student)


@router.delete(
    "/{student_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_model=None,
    summary="Soft-delete a student by marking them inactive (Admin only).",
)
def deactivate_student(
    student_id: uuid.UUID,
    db: DBSession,
    current_user: TeacherOrAdminUser,
) -> Response:
    """
    Performs a soft delete: sets status to INACTIVE rather than removing the
    row.  Historical attendance and payment records are preserved.
    """
    student = _get_student_or_404(student_id, current_user.organization_id, db)
    student.status = StudentStatus.INACTIVE
    db.add(student)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
