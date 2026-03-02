from __future__ import annotations

import enum
import uuid
from datetime import date, datetime

from sqlalchemy import (
    Date,
    Enum,
    ForeignKey,
    Numeric,
    String,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base
from app.models.base import TenantModelMixin


# ── Enums ─────────────────────────────────────────────────────────────────────

class StudentStatus(str, enum.Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"


class AttendanceStatus(str, enum.Enum):
    PRESENT = "present"
    ABSENT = "absent"
    LATE = "late"


class PaymentMethod(str, enum.Enum):
    CASH = "cash"
    BANK_TRANSFER = "bank_transfer"
    UPI = "upi"
    CHEQUE = "cheque"
    OTHER = "other"


# ── Student ───────────────────────────────────────────────────────────────────

class Student(Base, TenantModelMixin):
    """
    A student enrolled in a coaching center (tenant).

    All monetary values use ``Numeric(10, 2)`` for exact decimal arithmetic;
    never use ``Float`` for currency.
    """

    __tablename__ = "students"

    full_name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True, index=True)
    guardian_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    class_name: Mapped[str | None] = mapped_column(
        String(100), nullable=True,
        comment="e.g. 'Grade 10 - A', 'JEE Batch 1'"
    )
    monthly_fee: Mapped[float] = mapped_column(
        Numeric(10, 2), nullable=False, default=0.00
    )
    admission_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    status: Mapped[StudentStatus] = mapped_column(
        Enum(StudentStatus, name="studentstatus"),
        nullable=False,
        default=StudentStatus.ACTIVE,
        index=True,
    )

    # ── Relationships ─────────────────────────────────────────────────────────
    attendance_records: Mapped[list["Attendance"]] = relationship(
        "Attendance",
        back_populates="student",
        cascade="all, delete-orphan",
        lazy="dynamic",
    )
    fee_payments: Mapped[list["FeePayment"]] = relationship(
        "FeePayment",
        back_populates="student",
        cascade="all, delete-orphan",
        lazy="dynamic",
    )

    def __repr__(self) -> str:  # pragma: no cover
        return f"<Student id={self.id} name={self.full_name!r}>"


# ── Attendance ────────────────────────────────────────────────────────────────

class Attendance(Base, TenantModelMixin):
    """
    One attendance record per student per calendar date.

    The ``UniqueConstraint`` on (student_id, date, organization_id) prevents
    duplicate entries and is enforced both at the DB and application layers.
    """

    __tablename__ = "attendance"
    __table_args__ = (
        UniqueConstraint(
            "student_id", "date", "organization_id",
            name="uq_attendance_student_date_org",
        ),
    )

    student_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("students.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    status: Mapped[AttendanceStatus] = mapped_column(
        Enum(AttendanceStatus, name="attendancestatus"),
        nullable=False,
        default=AttendanceStatus.PRESENT,
    )

    # ── Relationship ──────────────────────────────────────────────────────────
    student: Mapped["Student"] = relationship(
        "Student", back_populates="attendance_records"
    )

    def __repr__(self) -> str:  # pragma: no cover
        return (
            f"<Attendance student={self.student_id} date={self.date} "
            f"status={self.status}>"
        )


# ── FeePayment ────────────────────────────────────────────────────────────────

class FeePayment(Base, TenantModelMixin):
    """
    Records a single fee payment transaction for a student.

    ``month_covered`` stores the billing month as a ``DATE`` (first day of the
    month, e.g. 2024-03-01) for easy range queries without string parsing.
    """

    __tablename__ = "fee_payments"

    student_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("students.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    amount_paid: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    payment_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    month_covered: Mapped[date] = mapped_column(
        Date, nullable=False,
        comment="Store as first day of the month, e.g. 2024-03-01"
    )
    payment_method: Mapped[PaymentMethod] = mapped_column(
        Enum(PaymentMethod, name="paymentmethod"),
        nullable=False,
        default=PaymentMethod.CASH,
    )
    notes: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # ── Relationship ──────────────────────────────────────────────────────────
    student: Mapped["Student"] = relationship(
        "Student", back_populates="fee_payments"
    )

    def __repr__(self) -> str:  # pragma: no cover
        return (
            f"<FeePayment student={self.student_id} "
            f"amount={self.amount_paid} month={self.month_covered}>"
        )
