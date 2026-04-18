from __future__ import annotations

from datetime import UTC, datetime, timedelta
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.expense import Expense
from app.schemas.analytics import (
    AnalyticsByCategoryResponse,
    AnalyticsCategoryItem,
    AnalyticsPeriod,
    AnalyticsRecentResponse,
    AnalyticsSummaryResponse,
)


def get_summary(db: Session, *, user_id: int) -> AnalyticsSummaryResponse:
    now = datetime.now(UTC)
    day_start = _start_of_day(now)
    week_start = _start_of_week(now)
    month_start = _start_of_month(now)
    earliest_start = min(day_start, week_start, month_start)

    statement = select(
        func.sum(Expense.amount).filter(Expense.occurred_at >= day_start).label("day_total"),
        func.sum(Expense.amount).filter(Expense.occurred_at >= week_start).label("week_total"),
        func.sum(Expense.amount).filter(Expense.occurred_at >= month_start).label("month_total"),
    ).where(
        Expense.user_id == user_id,
        Expense.occurred_at >= earliest_start,
    )

    day_total, week_total, month_total = db.execute(statement).one()
    currency = _resolve_currency(db, user_id=user_id, occurred_after=earliest_start)

    return AnalyticsSummaryResponse(
        user_id=user_id,
        currency=currency,
        day_total=_as_decimal(day_total),
        week_total=_as_decimal(week_total),
        month_total=_as_decimal(month_total),
    )


def get_by_category(
    db: Session,
    *,
    user_id: int,
    period: AnalyticsPeriod,
) -> AnalyticsByCategoryResponse:
    period_start = _period_start(period)
    currency = _resolve_currency(db, user_id=user_id, occurred_after=period_start)

    total_label = func.sum(Expense.amount).label("total")
    statement = (
        select(Expense.category, total_label)
        .where(
            Expense.user_id == user_id,
            Expense.occurred_at >= period_start,
        )
        .group_by(Expense.category)
        .order_by(total_label.desc(), Expense.category.asc())
    )

    rows = db.execute(statement).all()
    items = [
        AnalyticsCategoryItem(category=row.category, total=_as_decimal(row.total))
        for row in rows
    ]

    return AnalyticsByCategoryResponse(
        user_id=user_id,
        period=period,
        currency=currency,
        items=items,
    )


def get_recent(db: Session, *, user_id: int, limit: int) -> AnalyticsRecentResponse:
    statement = (
        select(Expense)
        .where(Expense.user_id == user_id)
        .order_by(Expense.occurred_at.desc(), Expense.id.desc())
        .limit(limit)
    )
    expenses = list(db.scalars(statement))
    return AnalyticsRecentResponse(user_id=user_id, items=expenses)


def _period_start(period: AnalyticsPeriod) -> datetime:
    now = datetime.now(UTC)
    if period == AnalyticsPeriod.day:
        return _start_of_day(now)
    if period == AnalyticsPeriod.week:
        return _start_of_week(now)
    return _start_of_month(now)


def _start_of_day(value: datetime) -> datetime:
    return value.astimezone(UTC).replace(hour=0, minute=0, second=0, microsecond=0)


def _start_of_week(value: datetime) -> datetime:
    day_start = _start_of_day(value)
    return day_start - timedelta(days=day_start.weekday())


def _start_of_month(value: datetime) -> datetime:
    return _start_of_day(value).replace(day=1)


def _resolve_currency(db: Session, *, user_id: int, occurred_after: datetime | None) -> str:
    distinct_statement = select(Expense.currency).where(Expense.user_id == user_id)
    if occurred_after is not None:
        distinct_statement = distinct_statement.where(Expense.occurred_at >= occurred_after)

    currencies = list(db.scalars(distinct_statement.distinct().order_by(Expense.currency)))
    if len(currencies) > 1:
        raise ValueError("analytics do not support mixed currencies in the selected period")
    if len(currencies) == 1:
        return currencies[0]

    fallback_statement = (
        select(Expense.currency)
        .where(Expense.user_id == user_id)
        .order_by(Expense.occurred_at.desc(), Expense.id.desc())
        .limit(1)
    )
    fallback_currency = db.scalar(fallback_statement)
    return fallback_currency or "USD"


def _as_decimal(value: Decimal | int | None) -> Decimal:
    if value is None:
        return Decimal("0.00")
    return Decimal(value)
