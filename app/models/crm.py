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


# ── Lead & Admission ──────────────────────────────────────────────────────────

class LeadStatus(str, enum.Enum):
    NEW            = "new"
    CONTACTED      = "contacted"
    DEMO_SCHEDULED = "demo_scheduled"
    FOLLOW_UP      = "follow_up"
    CONVERTED      = "converted"
    LOST           = "lost"


class LeadSource(str, enum.Enum):
    WALK_IN   = "walk_in"
    WHATSAPP  = "whatsapp"
    WEBSITE   = "website"
    REFERRAL  = "referral"
    SOCIAL    = "social"
    OTHER     = "other"


class Lead(Base, TenantModelMixin):
    """A prospective student captured through any channel."""

    __tablename__ = "leads"

    full_name:        Mapped[str]            = mapped_column(String(255), nullable=False, index=True)
    phone:            Mapped[str | None]     = mapped_column(String(20),  nullable=True)
    email:            Mapped[str | None]     = mapped_column(String(255), nullable=True)
    course_interest:  Mapped[str | None]     = mapped_column(String(255), nullable=True)
    source:           Mapped[LeadSource]     = mapped_column(Enum(LeadSource,  name="leadsource"),  nullable=False, default=LeadSource.OTHER)
    status:           Mapped[LeadStatus]     = mapped_column(Enum(LeadStatus,  name="leadstatus"),  nullable=False, default=LeadStatus.NEW, index=True)
    next_followup_date: Mapped[date | None]  = mapped_column(Date, nullable=True)
    counselor_name:   Mapped[str | None]     = mapped_column(String(255), nullable=True)
    notes:            Mapped[str | None]     = mapped_column(String(1000), nullable=True)

    lead_notes: Mapped[list["LeadNote"]] = relationship("LeadNote", back_populates="lead", cascade="all, delete-orphan")

    def __repr__(self) -> str:  # pragma: no cover
        return f"<Lead {self.full_name!r} status={self.status}>"


class LeadNote(Base, TenantModelMixin):
    """Call log / activity note attached to a Lead."""

    __tablename__ = "lead_notes"

    lead_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("leads.id", ondelete="CASCADE"), nullable=False, index=True)
    content: Mapped[str]       = mapped_column(String(2000), nullable=False)
    author:  Mapped[str | None]= mapped_column(String(255), nullable=True)

    lead: Mapped["Lead"] = relationship("Lead", back_populates="lead_notes")


# ── Course & Batch ────────────────────────────────────────────────────────────

class Course(Base, TenantModelMixin):
    """A course or programme offered by the coaching center."""

    __tablename__ = "courses"

    name:             Mapped[str]        = mapped_column(String(255), nullable=False, index=True)
    description:      Mapped[str | None] = mapped_column(String(1000), nullable=True)
    duration_months:  Mapped[int | None] = mapped_column(nullable=True)
    fee_amount:       Mapped[float]      = mapped_column(Numeric(10, 2), nullable=False, default=0)
    is_active:        Mapped[bool]       = mapped_column(default=True, nullable=False)

    batches: Mapped[list["Batch"]] = relationship("Batch", back_populates="course", cascade="all, delete-orphan")


class BatchStatus(str, enum.Enum):
    ACTIVE   = "active"
    INACTIVE = "inactive"
    COMPLETED = "completed"


class Batch(Base, TenantModelMixin):
    """A scheduled batch (e.g. 'JEE Morning') within a course."""

    __tablename__ = "batches"

    course_id:       Mapped[uuid.UUID]       = mapped_column(UUID(as_uuid=True), ForeignKey("courses.id", ondelete="CASCADE"), nullable=False, index=True)
    name:            Mapped[str]             = mapped_column(String(255), nullable=False)
    schedule:        Mapped[str | None]      = mapped_column(String(500), nullable=True)   # free-text e.g. "Mon/Wed/Fri 7–9am"
    teacher_name:    Mapped[str | None]      = mapped_column(String(255), nullable=True)
    capacity:        Mapped[int | None]      = mapped_column(nullable=True)
    status:          Mapped[BatchStatus]     = mapped_column(Enum(BatchStatus, name="batchstatus"), nullable=False, default=BatchStatus.ACTIVE)
    classroom:       Mapped[str | None]      = mapped_column(String(100), nullable=True)
    start_date:      Mapped[date | None]     = mapped_column(Date, nullable=True)
    end_date:        Mapped[date | None]     = mapped_column(Date, nullable=True)
    is_online:       Mapped[bool]            = mapped_column(default=False, nullable=False)

    course:  Mapped["Course"]           = relationship("Course", back_populates="batches")
    members: Mapped[list["BatchStudent"]]= relationship("BatchStudent", back_populates="batch", cascade="all, delete-orphan")


class BatchStudent(Base, TenantModelMixin):
    """Many-to-many: student ↔ batch."""

    __tablename__ = "batch_students"
    __table_args__ = (
        UniqueConstraint("batch_id", "student_id", "organization_id", name="uq_batch_student_org"),
    )

    batch_id:   Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("batches.id",  ondelete="CASCADE"), nullable=False, index=True)
    student_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)

    batch:   Mapped["Batch"]   = relationship("Batch",   back_populates="members")
    student: Mapped["Student"] = relationship("Student")


# ── Exam & Performance ────────────────────────────────────────────────────────

class Exam(Base, TenantModelMixin):
    """A test or examination event."""

    __tablename__ = "exams"

    title:      Mapped[str]          = mapped_column(String(255), nullable=False)
    course_id:  Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("courses.id", ondelete="SET NULL"), nullable=True, index=True)
    batch_id:   Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("batches.id", ondelete="SET NULL"), nullable=True, index=True)
    exam_date:  Mapped[date]         = mapped_column(Date, nullable=False, index=True)
    max_marks:  Mapped[float]        = mapped_column(Numeric(6, 2), nullable=False, default=100)
    subject:    Mapped[str | None]   = mapped_column(String(100), nullable=True)

    results: Mapped[list["ExamResult"]] = relationship("ExamResult", back_populates="exam", cascade="all, delete-orphan")


class ExamResult(Base, TenantModelMixin):
    """A single student's result for one exam."""

    __tablename__ = "exam_results"
    __table_args__ = (
        UniqueConstraint("exam_id", "student_id", "organization_id", name="uq_exam_result"),
    )

    exam_id:       Mapped[uuid.UUID]     = mapped_column(UUID(as_uuid=True), ForeignKey("exams.id",    ondelete="CASCADE"), nullable=False, index=True)
    student_id:    Mapped[uuid.UUID]     = mapped_column(UUID(as_uuid=True), ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    marks_obtained:Mapped[float]         = mapped_column(Numeric(6, 2), nullable=False)
    remarks:       Mapped[str | None]    = mapped_column(String(500), nullable=True)
    is_absent:     Mapped[bool]          = mapped_column(default=False, nullable=False)

    exam:    Mapped["Exam"]    = relationship("Exam",    back_populates="results")
    student: Mapped["Student"] = relationship("Student")


# ── Notice / Announcement ─────────────────────────────────────────────────────

class NoticeAudience(str, enum.Enum):
    ALL      = "all"
    STUDENTS = "students"
    TEACHERS = "teachers"
    PARENTS  = "parents"


class Notice(Base, TenantModelMixin):
    """An announcement or broadcast message."""

    __tablename__ = "notices"

    title:    Mapped[str]             = mapped_column(String(255), nullable=False)
    body:     Mapped[str]             = mapped_column(String(5000), nullable=False)
    audience: Mapped[NoticeAudience]  = mapped_column(Enum(NoticeAudience, name="noticeaudience"), nullable=False, default=NoticeAudience.ALL)
    is_pinned:Mapped[bool]            = mapped_column(default=False, nullable=False)
    author:   Mapped[str | None]      = mapped_column(String(255), nullable=True)

    def __repr__(self) -> str:  # pragma: no cover
        return f"<Notice {self.title!r}>"

