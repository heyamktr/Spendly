from __future__ import annotations

from datetime import UTC, datetime
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.expense import Expense
from app.models.user import User
from app.schemas.expense import ExpenseCreate, ExpenseUpdate


def list_expenses(db: Session, *, user_id: int, limit: int, offset: int) -> list[Expense]:
    statement = (
        select(Expense)
        .where(Expense.user_id == user_id)
        .order_by(Expense.occurred_at.desc(), Expense.id.desc())
        .limit(limit)
        .offset(offset)
    )
    return list(db.scalars(statement))


def get_expense_by_id(db: Session, expense_id: int) -> Expense | None:
    return db.get(Expense, expense_id)


def create_expense(db: Session, *, user: User, expense_in: ExpenseCreate) -> Expense:
    occurred_at = _normalize_occurred_at(expense_in.occurred_at)
    source_text = expense_in.source_text or _build_manual_source_text(expense_in)

    return create_expense_record(
        db,
        user=user,
        amount=expense_in.amount,
        currency=expense_in.currency,
        category=expense_in.category,
        note=expense_in.note,
        source_text=source_text,
        occurred_at=occurred_at,
        commit=True,
    )


def create_expense_record(
    db: Session,
    *,
    user: User,
    amount: Decimal,
    currency: str,
    category: str,
    note: str | None,
    source_text: str,
    occurred_at: datetime,
    commit: bool,
) -> Expense:
    normalized_occurred_at = _normalize_occurred_at(occurred_at)

    expense = Expense(
        user_id=user.id,
        amount=amount,
        currency=currency,
        category=category,
        note=note,
        source_text=source_text,
        occurred_at=normalized_occurred_at,
    )
    db.add(expense)
    if commit:
        db.commit()
        db.refresh(expense)
    else:
        db.flush()
    return expense


def update_expense(
    db: Session,
    *,
    expense: Expense,
    expense_in: ExpenseUpdate,
) -> Expense:
    if "amount" in expense_in.model_fields_set:
        expense.amount = expense_in.amount
    if "currency" in expense_in.model_fields_set:
        expense.currency = expense_in.currency
    if "category" in expense_in.model_fields_set:
        expense.category = expense_in.category
    if "note" in expense_in.model_fields_set:
        expense.note = expense_in.note
    if "occurred_at" in expense_in.model_fields_set:
        expense.occurred_at = _normalize_occurred_at(expense_in.occurred_at)

    db.commit()
    db.refresh(expense)
    return expense


def delete_expense(db: Session, *, expense: Expense) -> None:
    db.delete(expense)
    db.commit()


def _normalize_occurred_at(value: datetime | None) -> datetime:
    if value is None:
        return datetime.now(UTC)
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value.astimezone(UTC)


def _build_manual_source_text(expense_in: ExpenseCreate) -> str:
    amount_text = format(expense_in.amount, "f").rstrip("0").rstrip(".") or "0"
    parts = ["manual entry", expense_in.category, amount_text]
    if expense_in.note:
        parts.append(expense_in.note)
    return ": ".join([parts[0], " ".join(parts[1:])])
