from __future__ import annotations

import uuid
from datetime import date

from fastapi import APIRouter, HTTPException, Query, status
from fastapi.responses import Response
from sqlalchemy import func, select

from app.api.dependencies import CurrentUser, DBSession
from app.models.crm import FeePayment, Student
from app.schemas.crm import (
    FeePaymentCreate,
    FeePaymentResponse,
    StudentFeeHistoryResponse,
    StudentSummary,
)

router = APIRouter(prefix="/fees", tags=["Fees"])


# ── Helpers ───────────────────────────────────────────────────────────────────

def _get_student_or_404(
    student_id: uuid.UUID,
    org_id: uuid.UUID,
    db,
) -> Student:
    student: Student | None = db.execute(
        select(Student).where(
            Student.id == student_id,
            Student.organization_id == org_id,
        )
    ).scalar_one_or_none()

    if student is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student {student_id} not found in your organisation.",
        )
    return student


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post(
    "/",
    response_model=FeePaymentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Record a fee payment for a student.",
)
def record_payment(
    payload: FeePaymentCreate,
    db: DBSession,
    current_user: CurrentUser,
) -> FeePaymentResponse:
    """
    Records a new fee payment.  The ``month_covered`` field is automatically
    normalised to the first day of the month by the schema validator.
    """
    _get_student_or_404(payload.student_id, current_user.organization_id, db)

    payment = FeePayment(
        student_id=payload.student_id,
        amount_paid=payload.amount_paid,
        payment_date=payload.payment_date,
        month_covered=payload.month_covered,
        payment_method=payload.payment_method,
        notes=payload.notes,
        organization_id=current_user.organization_id,
    )
    db.add(payment)
    db.commit()
    db.refresh(payment)
    return FeePaymentResponse.model_validate(payment)


@router.get(
    "/student/{student_id}",
    response_model=StudentFeeHistoryResponse,
    summary="Get full fee payment history for a student.",
)
def get_student_fee_history(
    student_id: uuid.UUID,
    db: DBSession,
    current_user: CurrentUser,
    from_date: date | None = Query(None, description="Filter payments on or after this date."),
    to_date: date | None = Query(None, description="Filter payments on or before this date."),
) -> StudentFeeHistoryResponse:
    """
    Returns all fee payments for a student with optional date range filtering.
    Includes a ``total_paid`` aggregate.
    """
    student = _get_student_or_404(student_id, current_user.organization_id, db)

    query = select(FeePayment).where(
        FeePayment.student_id == student_id,
        FeePayment.organization_id == current_user.organization_id,
    )

    if from_date:
        query = query.where(FeePayment.payment_date >= from_date)
    if to_date:
        query = query.where(FeePayment.payment_date <= to_date)

    query = query.order_by(FeePayment.payment_date.desc())
    payments = db.execute(query).scalars().all()

    total_paid = sum(p.amount_paid for p in payments)

    return StudentFeeHistoryResponse(
        student=StudentSummary.model_validate(student),
        total_paid=total_paid,
        payments=[FeePaymentResponse.model_validate(p) for p in payments],
    )


@router.get(
    "/",
    response_model=list[FeePaymentResponse],
    summary="List all fee payments for the organisation with optional filters.",
)
def list_payments(
    db: DBSession,
    current_user: CurrentUser,
    student_id: uuid.UUID | None = Query(None),
    from_date: date | None = Query(None),
    to_date: date | None = Query(None),
    month_covered: date | None = Query(
        None, description="Filter by billing month (any day in that month works)."
    ),
) -> list[FeePaymentResponse]:
    """
    Org-scoped payment list.  All filters are optional and combinable.
    ``month_covered`` matches any payment whose month_covered falls within the
    same calendar month as the provided date.
    """
    query = select(FeePayment).where(
        FeePayment.organization_id == current_user.organization_id
    )

    if student_id:
        query = query.where(FeePayment.student_id == student_id)
    if from_date:
        query = query.where(FeePayment.payment_date >= from_date)
    if to_date:
        query = query.where(FeePayment.payment_date <= to_date)
    if month_covered:
        # Match rows whose month_covered is in the same year-month
        month_start = month_covered.replace(day=1)
        if month_covered.month == 12:
            from datetime import date as _date
            month_end = _date(month_covered.year + 1, 1, 1)
        else:
            month_end = month_covered.replace(month=month_covered.month + 1, day=1)
        query = query.where(
            FeePayment.month_covered >= month_start,
            FeePayment.month_covered < month_end,
        )

    query = query.order_by(FeePayment.payment_date.desc())
    payments = db.execute(query).scalars().all()
    return [FeePaymentResponse.model_validate(p) for p in payments]


@router.delete(
    "/{payment_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_model=None,
    summary="Delete a fee payment record (Admin only).",
)
def delete_payment(
    payment_id: uuid.UUID,
    db: DBSession,
    current_user: CurrentUser,
) -> Response:
    payment: FeePayment | None = db.execute(
        select(FeePayment).where(
            FeePayment.id == payment_id,
            FeePayment.organization_id == current_user.organization_id,
        )
    ).scalar_one_or_none()

    if payment is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Payment {payment_id} not found.",
        )

    db.delete(payment)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
