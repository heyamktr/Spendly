from __future__ import annotations

from datetime import UTC, datetime
from decimal import Decimal

from sqlalchemy import select

from app.models.expense import Expense


def test_create_manual_expense_for_existing_user(client, create_user, db_session) -> None:
    user = create_user(messenger_psid="psid-expense-create")

    response = client.post(
        "/api/expenses",
        json={
            "user_id": user.id,
            "amount": "5.25",
            "category": "food",
            "note": "iced coffee",
        },
    )

    assert response.status_code == 201
    data = response.json()
    assert data["user_id"] == user.id
    assert Decimal(str(data["amount"])) == Decimal("5.25")
    assert data["currency"] == "USD"
    assert data["category"] == "food"
    assert data["note"] == "iced coffee"
    assert data["source_text"] == "manual entry: food 5.25 iced coffee"

    expenses = list(db_session.scalars(select(Expense)))
    assert len(expenses) == 1
    assert expenses[0].source_text == "manual entry: food 5.25 iced coffee"


def test_list_expenses_newest_first_for_one_user_only(
    client,
    create_user,
    create_expense,
) -> None:
    user = create_user(messenger_psid="psid-expense-list")
    other_user = create_user(messenger_psid="psid-expense-other")

    older_expense = create_expense(
        user=user,
        amount="4.50",
        category="food",
        source_text="older lunch",
        occurred_at=datetime(2026, 4, 10, 12, 0, tzinfo=UTC),
    )
    newer_expense = create_expense(
        user=user,
        amount="12.00",
        category="transport",
        source_text="newer uber",
        occurred_at=datetime(2026, 4, 11, 8, 30, tzinfo=UTC),
    )
    create_expense(
        user=other_user,
        amount="99.00",
        category="shopping",
        source_text="other user purchase",
        occurred_at=datetime(2026, 4, 12, 9, 0, tzinfo=UTC),
    )

    response = client.get(
        "/api/expenses",
        params={
            "user_id": user.id,
            "limit": 10,
            "offset": 0,
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert [item["id"] for item in data] == [newer_expense.id, older_expense.id]
    assert {item["user_id"] for item in data} == {user.id}
    assert [item["source_text"] for item in data] == ["newer uber", "older lunch"]
