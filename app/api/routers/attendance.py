from __future__ import annotations

import calendar
import uuid
from datetime import date, timedelta

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
    DailyRecord,
    MonthlyAttendanceSummary,
    StudentAttendanceStats,
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


# ── Per-student analytics ─────────────────────────────────────────────────────

@router.get(
    "/student/{student_id}",
    response_model=list[AttendanceResponse],
    summary="Get a student's full attendance history.",
)
def get_student_attendance(
    student_id: uuid.UUID,
    db: DBSession,
    current_user: CurrentUser,
    from_date: date | None = Query(None),
    to_date: date | None = Query(None),
) -> list[AttendanceResponse]:
    """Returns all attendance records for a student, with optional date range filters."""
    _verify_student_belongs_to_org(student_id, current_user.organization_id, db)
    q = select(Attendance).where(
        Attendance.student_id == student_id,
        Attendance.organization_id == current_user.organization_id,
    )
    if from_date:
        q = q.where(Attendance.date >= from_date)
    if to_date:
        q = q.where(Attendance.date <= to_date)
    q = q.order_by(Attendance.date.desc())
    records = db.execute(q).scalars().all()
    return [AttendanceResponse.model_validate(r) for r in records]


@router.get(
    "/student/{student_id}/stats",
    response_model=StudentAttendanceStats,
    summary="Get full attendance analytics for a single student.",
)
def get_student_attendance_stats(
    student_id: uuid.UUID,
    db: DBSession,
    current_user: CurrentUser,
) -> StudentAttendanceStats:
    """
    Returns all-time totals, this-month / this-week breakdowns,
    6-month monthly breakdown, last-30 records, and a late count
    for the guardian notification trigger.
    """
    _verify_student_belongs_to_org(student_id, current_user.organization_id, db)

    today = date.today()
    month_start = today.replace(day=1)
    # start of current ISO week (Monday)
    week_start = today - timedelta(days=today.weekday())

    all_records = db.execute(
        select(Attendance).where(
            Attendance.student_id == student_id,
            Attendance.organization_id == current_user.organization_id,
        ).order_by(Attendance.date.desc())
    ).scalars().all()

    # ── All-time ──────────────────────────────────────────────────────────────
    total_marked = len(all_records)
    present_all  = sum(1 for r in all_records if r.status == AttendanceStatus.PRESENT)
    late_all     = sum(1 for r in all_records if r.status == AttendanceStatus.LATE)
    absent_all   = sum(1 for r in all_records if r.status == AttendanceStatus.ABSENT)
    att_pct      = round((present_all + late_all) / total_marked * 100, 1) if total_marked else 0.0

    # ── This month ────────────────────────────────────────────────────────────
    month_recs = [r for r in all_records if r.date >= month_start]
    m_present  = sum(1 for r in month_recs if r.status == AttendanceStatus.PRESENT)
    m_late     = sum(1 for r in month_recs if r.status == AttendanceStatus.LATE)
    m_absent   = sum(1 for r in month_recs if r.status == AttendanceStatus.ABSENT)
    m_total    = len(month_recs)
    m_pct      = round((m_present + m_late) / m_total * 100, 1) if m_total else 0.0

    # ── This week ─────────────────────────────────────────────────────────────
    week_recs = [r for r in all_records if r.date >= week_start]
    w_present  = sum(1 for r in week_recs if r.status == AttendanceStatus.PRESENT)
    w_late     = sum(1 for r in week_recs if r.status == AttendanceStatus.LATE)
    w_absent   = sum(1 for r in week_recs if r.status == AttendanceStatus.ABSENT)
    w_total    = len(week_recs)
    w_pct      = round((w_present + w_late) / w_total * 100, 1) if w_total else 0.0

    # ── 6-month breakdown (oldest first) ─────────────────────────────────────
    MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
    monthly: list[MonthlyAttendanceSummary] = []
    for offset in range(5, -1, -1):
        # go back `offset` months from today
        base = today.replace(day=1)
        for _ in range(offset):
            base = (base - timedelta(days=1)).replace(day=1)
        yr, mo = base.year, base.month
        last_day = calendar.monthrange(yr, mo)[1]
        mo_start = date(yr, mo, 1)
        mo_end   = date(yr, mo, last_day)
        recs = [r for r in all_records if mo_start <= r.date <= mo_end]
        p = sum(1 for r in recs if r.status == AttendanceStatus.PRESENT)
        l = sum(1 for r in recs if r.status == AttendanceStatus.LATE)
        a = sum(1 for r in recs if r.status == AttendanceStatus.ABSENT)
        tot = len(recs)
        pct = round((p + l) / tot * 100, 1) if tot else 0.0
        monthly.append(MonthlyAttendanceSummary(
            year=yr, month=mo,
            month_label=f"{MONTH_NAMES[mo - 1]} {yr}",
            present=p, late=l, absent=a,
            total_marked=tot, percentage=pct,
        ))

    # ── Last 30 records ───────────────────────────────────────────────────────
    recent = [DailyRecord(id=r.id, date=r.date, status=r.status) for r in all_records[:30]]

    return StudentAttendanceStats(
        total_marked=total_marked,
        present=present_all,
        late=late_all,
        absent=absent_all,
        attendance_percentage=att_pct,
        this_month_present=m_present,
        this_month_late=m_late,
        this_month_absent=m_absent,
        this_month_total=m_total,
        this_month_percentage=m_pct,
        this_week_present=w_present,
        this_week_late=w_late,
        this_week_absent=w_absent,
        this_week_total=w_total,
        this_week_percentage=w_pct,
        monthly_breakdown=monthly,
        recent_records=recent,
        consecutive_late_this_month=m_late,
    )
