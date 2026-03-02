from __future__ import annotations

import uuid
from datetime import date

from fastapi import APIRouter, HTTPException, Query, status
from fastapi.responses import Response
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError

from app.api.dependencies import CurrentUser, DBSession
from app.models.crm import Attendance, AttendanceStatus, Student
from app.schemas.crm import (
    AttendanceBulkCreate,
    AttendanceCreate,
    AttendanceResponse,
    AttendanceUpdate,
    DailyAttendanceResponse,
)

router = APIRouter(prefix="/attendance", tags=["Attendance"])


# ── Helpers ───────────────────────────────────────────────────────────────────

def _verify_student_belongs_to_org(
    student_id: uuid.UUID,
    org_id: uuid.UUID,
    db,
) -> None:
    """Raise 404 if the student doesn't belong to the caller's organisation."""
    exists = db.execute(
        select(Student.id).where(
            Student.id == student_id,
            Student.organization_id == org_id,
        )
    ).scalar_one_or_none()

    if exists is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student {student_id} not found in your organisation.",
        )


def _get_attendance_or_404(
    attendance_id: uuid.UUID,
    org_id: uuid.UUID,
    db,
) -> Attendance:
    record: Attendance | None = db.execute(
        select(Attendance).where(
            Attendance.id == attendance_id,
            Attendance.organization_id == org_id,
        )
    ).scalar_one_or_none()

    if record is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Attendance record {attendance_id} not found.",
        )
    return record


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post(
    "/",
    response_model=AttendanceResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Mark attendance for a single student.",
)
def mark_attendance(
    payload: AttendanceCreate,
    db: DBSession,
    current_user: CurrentUser,
) -> AttendanceResponse:
    """
    Creates an attendance record.  Raises **409 Conflict** if a record already
    exists for this student on this date (enforced by the DB unique constraint).
    """
    _verify_student_belongs_to_org(
        payload.student_id, current_user.organization_id, db
    )

    record = Attendance(
        student_id=payload.student_id,
        date=payload.date,
        status=payload.status,
        organization_id=current_user.organization_id,
    )
    db.add(record)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"Attendance for student {payload.student_id} "
                f"on {payload.date} already exists. "
                "Use PATCH to update it."
            ),
        )

    db.refresh(record)
    return AttendanceResponse.model_validate(record)


@router.post(
    "/bulk",
    response_model=list[AttendanceResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Mark attendance for multiple students in one request.",
)
def mark_bulk_attendance(
    payload: AttendanceBulkCreate,
    db: DBSession,
    current_user: CurrentUser,
) -> list[AttendanceResponse]:
    """
    Accepts a list of attendance records for a given date.
    All student IDs must belong to the caller's organisation.
    Uses a single commit for atomicity — all records succeed or all fail.
    """
    student_ids = [r.student_id for r in payload.records]

    # Verify all students belong to this org in one query
    found_ids: set[uuid.UUID] = set(
        db.execute(
            select(Student.id).where(
                Student.id.in_(student_ids),
                Student.organization_id == current_user.organization_id,
            )
        ).scalars().all()
    )

    missing = set(student_ids) - found_ids
    if missing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Students not found in your organisation: {missing}",
        )

    records = [
        Attendance(
            student_id=r.student_id,
            date=payload.date,
            status=r.status,
            organization_id=current_user.organization_id,
        )
        for r in payload.records
    ]
    db.add_all(records)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"One or more attendance records for {payload.date} already exist. "
                "Delete them first or use PATCH to update individual records."
            ),
        )

    for r in records:
        db.refresh(r)

    return [AttendanceResponse.model_validate(r) for r in records]


@router.get(
    "/daily",
    response_model=DailyAttendanceResponse,
    summary="Get full attendance list for a specific date.",
)
def get_daily_attendance(
    db: DBSession,
    current_user: CurrentUser,
    attendance_date: date = Query(..., alias="date", description="ISO date, e.g. 2024-03-15"),
) -> DailyAttendanceResponse:
    """
    Returns all attendance records for the given date within the organisation,
    along with computed present/absent/late counts and an attendance percentage.
    """
    records = db.execute(
        select(Attendance).where(
            Attendance.organization_id == current_user.organization_id,
            Attendance.date == attendance_date,
        )
    ).scalars().all()

    # Total active students for the org
    total_active: int = db.execute(
        select(func.count(Student.id)).where(
            Student.organization_id == current_user.organization_id,
            Student.status == "active",
        )
    ).scalar_one()

    present = sum(1 for r in records if r.status == AttendanceStatus.PRESENT)
    absent = sum(1 for r in records if r.status == AttendanceStatus.ABSENT)
    late = sum(1 for r in records if r.status == AttendanceStatus.LATE)
    pct = round((present / total_active * 100), 2) if total_active > 0 else 0.0

    return DailyAttendanceResponse(
        date=attendance_date,
        total_students=total_active,
        present=present,
        absent=absent,
        late=late,
        attendance_percentage=pct,
        records=[AttendanceResponse.model_validate(r) for r in records],
    )


@router.patch(
    "/{attendance_id}",
    response_model=AttendanceResponse,
    summary="Update the status of an existing attendance record.",
)
def update_attendance(
    attendance_id: uuid.UUID,
    payload: AttendanceUpdate,
    db: DBSession,
    current_user: CurrentUser,
) -> AttendanceResponse:
    record = _get_attendance_or_404(attendance_id, current_user.organization_id, db)
    record.status = payload.status
    db.add(record)
    db.commit()
    db.refresh(record)
    return AttendanceResponse.model_validate(record)


@router.delete(
    "/{attendance_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_model=None,
    summary="Delete an attendance record.",
)
def delete_attendance(
    attendance_id: uuid.UUID,
    db: DBSession,
    current_user: CurrentUser,
) -> Response:
    record = _get_attendance_or_404(attendance_id, current_user.organization_id, db)
    db.delete(record)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
