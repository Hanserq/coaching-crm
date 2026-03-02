from __future__ import annotations

import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Generic, List, TypeVar

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.crm import AttendanceStatus, PaymentMethod, StudentStatus

T = TypeVar("T")


# ── Shared base ───────────────────────────────────────────────────────────────

class _OrmBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ── Pagination ────────────────────────────────────────────────────────────────

class PaginatedResponse(_OrmBase, Generic[T]):
    """Generic paginated envelope used by all list endpoints."""
    total: int = Field(..., description="Total number of matching records.")
    page: int = Field(..., description="Current page (1-indexed).")
    page_size: int = Field(..., description="Items per page.")
    pages: int = Field(..., description="Total number of pages.")
    items: List[T]


# ── Student schemas ───────────────────────────────────────────────────────────

class StudentCreate(BaseModel):
    """Payload for creating a new student."""
    full_name: str = Field(..., min_length=1, max_length=255)
    phone: str | None = Field(
        None, max_length=20, pattern=r"^\+?[0-9\s\-\(\)]{6,20}$"
    )
    guardian_name: str | None = Field(None, max_length=255)
    class_name: str | None = Field(None, max_length=100)
    monthly_fee: Decimal = Field(default=Decimal("0.00"), ge=0)
    admission_date: date | None = None
    status: StudentStatus = StudentStatus.ACTIVE


class StudentUpdate(BaseModel):
    """All fields are optional for partial (PATCH) updates."""
    full_name: str | None = Field(None, min_length=1, max_length=255)
    phone: str | None = Field(
        None, max_length=20, pattern=r"^\+?[0-9\s\-\(\)]{6,20}$"
    )
    guardian_name: str | None = None
    class_name: str | None = None
    monthly_fee: Decimal | None = Field(None, ge=0)
    admission_date: date | None = None
    status: StudentStatus | None = None


class StudentResponse(_OrmBase):
    id: uuid.UUID
    full_name: str
    phone: str | None
    guardian_name: str | None
    class_name: str | None
    monthly_fee: Decimal
    admission_date: date | None
    status: StudentStatus
    organization_id: uuid.UUID
    created_at: datetime
    updated_at: datetime


class StudentSummary(_OrmBase):
    """Lightweight representation used in nested responses."""
    id: uuid.UUID
    full_name: str
    class_name: str | None
    status: StudentStatus


# ── Attendance schemas ────────────────────────────────────────────────────────

class AttendanceCreate(BaseModel):
    """Mark attendance for a single student."""
    student_id: uuid.UUID
    date: date
    status: AttendanceStatus = AttendanceStatus.PRESENT


class AttendanceBulkCreate(BaseModel):
    """Mark attendance for multiple students in one request."""
    date: date
    records: List[AttendanceCreate] = Field(..., min_length=1)

    @field_validator("records")
    @classmethod
    def _unique_students(cls, records: list[AttendanceCreate]) -> list[AttendanceCreate]:
        seen: set[uuid.UUID] = set()
        for rec in records:
            if rec.student_id in seen:
                raise ValueError(
                    f"Duplicate student_id {rec.student_id} in bulk request."
                )
            seen.add(rec.student_id)
        return records


class AttendanceUpdate(BaseModel):
    status: AttendanceStatus


class AttendanceResponse(_OrmBase):
    id: uuid.UUID
    student_id: uuid.UUID
    date: date
    status: AttendanceStatus
    organization_id: uuid.UUID
    created_at: datetime


class DailyAttendanceResponse(BaseModel):
    """Attendance summary for a given date."""
    date: date
    total_students: int
    present: int
    absent: int
    late: int
    attendance_percentage: float
    records: List[AttendanceResponse]


# ── FeePayment schemas ────────────────────────────────────────────────────────

class FeePaymentCreate(BaseModel):
    """Record a fee payment for a student."""
    student_id: uuid.UUID
    amount_paid: Decimal = Field(..., gt=0, description="Must be positive.")
    payment_date: date
    month_covered: date = Field(
        ...,
        description="Use the first day of the month, e.g. 2024-03-01.",
    )
    payment_method: PaymentMethod = PaymentMethod.CASH
    notes: str | None = Field(None, max_length=500)

    @field_validator("month_covered", mode="before")
    @classmethod
    def _normalise_month(cls, v: date) -> date:
        """Force month_covered to the first day of the given month."""
        if isinstance(v, date):
            return v.replace(day=1)
        return v


class FeePaymentResponse(_OrmBase):
    id: uuid.UUID
    student_id: uuid.UUID
    amount_paid: Decimal
    payment_date: date
    month_covered: date
    payment_method: PaymentMethod
    notes: str | None
    organization_id: uuid.UUID
    created_at: datetime


class StudentFeeHistoryResponse(BaseModel):
    """Full payment history for a single student."""
    student: StudentSummary
    total_paid: Decimal
    payments: List[FeePaymentResponse]


# ── Dashboard schema ──────────────────────────────────────────────────────────

class DashboardStats(BaseModel):
    """Aggregated CRM stats returned by the dashboard endpoint."""
    total_students: int
    active_students: int
    inactive_students: int
    total_fee_collected_this_month: Decimal
    pending_fees_total: Decimal
    today_attendance_percentage: float
    today_present: int
    today_absent: int
    today_late: int
