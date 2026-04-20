from __future__ import annotations

from datetime import UTC, datetime, timedelta
from decimal import Decimal

from app.services import analytics_service


class FixedDateTime(datetime):
    frozen_now = datetime(2026, 4, 16, 15, 30, tzinfo=UTC)

    @classmethod
    def now(cls, tz=None):
        if tz is None:
            return cls.frozen_now.replace(tzinfo=None)
        return cls.frozen_now.astimezone(tz)


def _freeze_analytics_now(monkeypatch, frozen_now: datetime) -> None:
    FixedDateTime.frozen_now = frozen_now
    monkeypatch.setattr(analytics_service, "datetime", FixedDateTime)


def test_summary_returns_correct_day_week_month_totals(
    client,
    create_user,
    create_expense,
    monkeypatch,
) -> None:
    frozen_now = datetime(2026, 4, 16, 15, 30, tzinfo=UTC)
    _freeze_analytics_now(monkeypatch, frozen_now)

    user = create_user(messenger_psid="psid-analytics-summary")
    create_expense(
        user=user,
        amount="5.00",
        category="food",
        occurred_at=frozen_now - timedelta(hours=1),
    )
    create_expense(
        user=user,
        amount="7.00",
        category="transport",
        occurred_at=frozen_now - timedelta(days=2),
    )
    create_expense(
        user=user,
        amount="11.00",
        category="shopping",
        occurred_at=frozen_now - timedelta(days=10),
    )
    create_expense(
        user=user,
        amount="19.00",
        category="travel",
        occurred_at=frozen_now - timedelta(days=45),
    )

    response = client.get("/api/analytics/summary", params={"user_id": user.id})

    assert response.status_code == 200
    data = response.json()
    assert data["user_id"] == user.id
    assert data["currency"] == "USD"
    assert Decimal(str(data["day_total"])) == Decimal("5.00")
    assert Decimal(str(data["week_total"])) == Decimal("12.00")
    assert Decimal(str(data["month_total"])) == Decimal("23.00")


def test_by_category_returns_grouped_totals_for_selected_period(
    client,
    create_user,
    create_expense,
    monkeypatch,
) -> None:
    frozen_now = datetime(2026, 4, 20, 10, 0, tzinfo=UTC)
    _freeze_analytics_now(monkeypatch, frozen_now)

    user = create_user(messenger_psid="psid-analytics-category")
    create_expense(
        user=user,
        amount="5.00",
        category="food",
        occurred_at=frozen_now - timedelta(days=1),
    )
    create_expense(
        user=user,
        amount="3.00",
        category="food",
        occurred_at=frozen_now - timedelta(days=5),
    )
    create_expense(
        user=user,
        amount="12.00",
        category="transport",
        occurred_at=frozen_now - timedelta(days=2),
    )
    create_expense(
        user=user,
        amount="6.00",
        category="groceries",
        occurred_at=frozen_now - timedelta(days=12),
    )
    create_expense(
        user=user,
        amount="40.00",
        category="shopping",
        occurred_at=frozen_now - timedelta(days=50),
    )

    response = client.get(
        "/api/analytics/by-category",
        params={
            "user_id": user.id,
            "period": "month",
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["user_id"] == user.id
    assert data["period"] == "month"
    assert data["currency"] == "USD"

    totals = {
        item["category"]: Decimal(str(item["total"]))
        for item in data["items"]
    }
    assert totals == {
        "transport": Decimal("12.00"),
        "food": Decimal("8.00"),
        "groceries": Decimal("6.00"),
    }


def test_recent_returns_sorted_limited_results(
    client,
    create_user,
    create_expense,
) -> None:
    user = create_user(messenger_psid="psid-analytics-recent")
    other_user = create_user(messenger_psid="psid-analytics-other")

    oldest = create_expense(
        user=user,
        amount="4.00",
        category="food",
        source_text="oldest",
        occurred_at=datetime(2026, 4, 1, 9, 0, tzinfo=UTC),
    )
    middle = create_expense(
        user=user,
        amount="8.00",
        category="transport",
        source_text="middle",
        occurred_at=datetime(2026, 4, 2, 9, 0, tzinfo=UTC),
    )
    newest = create_expense(
        user=user,
        amount="12.00",
        category="shopping",
        source_text="newest",
        occurred_at=datetime(2026, 4, 3, 9, 0, tzinfo=UTC),
    )
    create_expense(
        user=other_user,
        amount="50.00",
        category="travel",
        source_text="other user",
        occurred_at=datetime(2026, 4, 4, 9, 0, tzinfo=UTC),
    )

    response = client.get(
        "/api/analytics/recent",
        params={
            "user_id": user.id,
            "limit": 2,
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["user_id"] == user.id
    assert [item["id"] for item in data["items"]] == [newest.id, middle.id]
    assert all(item["user_id"] == user.id for item in data["items"])
    assert oldest.id not in [item["id"] for item in data["items"]]
