from __future__ import annotations

from datetime import date, datetime, timezone
from decimal import Decimal

from fastapi import APIRouter
from sqlalchemy import func, select

from app.api.dependencies import CurrentUser, DBSession
from app.models.crm import Attendance, AttendanceStatus, FeePayment, Student, StudentStatus
from app.schemas.crm import DashboardStats

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get(
    "/",
    response_model=DashboardStats,
    summary="Get aggregated CRM statistics for the organisation.",
)
def get_dashboard(
    db: DBSession,
    current_user: CurrentUser,
) -> DashboardStats:
    """
    Returns a single-shot summary payload consumed by the front-end dashboard:

    - Student counts (total / active / inactive)
    - Fee collected this calendar month
    - Pending fees total (sum of monthly_fee for active students minus
      what has already been collected this month)
    - Today's attendance percentage + breakdown
    """
    org_id = current_user.organization_id
    today: date = datetime.now(tz=timezone.utc).date()
    month_start = today.replace(day=1)

    # ── Student counts ─────────────────────────────────────────────────────────
    total_students: int = db.execute(
        select(func.count(Student.id)).where(
            Student.organization_id == org_id
        )
    ).scalar_one()

    active_students: int = db.execute(
        select(func.count(Student.id)).where(
            Student.organization_id == org_id,
            Student.status == StudentStatus.ACTIVE,
        )
    ).scalar_one()

    inactive_students: int = total_students - active_students

    # ── Fee collected this month ───────────────────────────────────────────────
    fee_this_month: Decimal = db.execute(
        select(func.coalesce(func.sum(FeePayment.amount_paid), 0)).where(
            FeePayment.organization_id == org_id,
            FeePayment.payment_date >= month_start,
            FeePayment.payment_date <= today,
        )
    ).scalar_one()

    # ── Pending fees ───────────────────────────────────────────────────────────
    # Total expected this month = sum of monthly_fee for all ACTIVE students
    total_expected: Decimal = db.execute(
        select(func.coalesce(func.sum(Student.monthly_fee), 0)).where(
            Student.organization_id == org_id,
            Student.status == StudentStatus.ACTIVE,
        )
    ).scalar_one()

    # Fee already collected for the current billing month
    fee_collected_for_month: Decimal = db.execute(
        select(func.coalesce(func.sum(FeePayment.amount_paid), 0)).where(
            FeePayment.organization_id == org_id,
            FeePayment.month_covered == month_start,
        )
    ).scalar_one()

    pending_fees = max(Decimal("0.00"), total_expected - fee_collected_for_month)

    # ── Today's attendance ─────────────────────────────────────────────────────
    today_records = db.execute(
        select(Attendance.status).where(
            Attendance.organization_id == org_id,
            Attendance.date == today,
        )
    ).scalars().all()

    today_present = sum(1 for s in today_records if s == AttendanceStatus.PRESENT)
    today_absent = sum(1 for s in today_records if s == AttendanceStatus.ABSENT)
    today_late = sum(1 for s in today_records if s == AttendanceStatus.LATE)
    today_pct = (
        round((today_present / active_students) * 100, 2)
        if active_students > 0
        else 0.0
    )

    return DashboardStats(
        total_students=total_students,
        active_students=active_students,
        inactive_students=inactive_students,
        total_fee_collected_this_month=Decimal(str(fee_this_month)),
        pending_fees_total=pending_fees,
        today_attendance_percentage=today_pct,
        today_present=today_present,
        today_absent=today_absent,
        today_late=today_late,
    )
