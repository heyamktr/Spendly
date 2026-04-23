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


def test_update_expense_changes_selected_fields(client, create_user, create_expense, db_session) -> None:
    user = create_user(messenger_psid="psid-expense-update")
    expense = create_expense(
        user=user,
        amount="7.00",
        category="food",
        note="burger",
        source_text="burger 7",
        occurred_at=datetime(2026, 4, 23, 9, 33, tzinfo=UTC),
    )

    response = client.patch(
        f"/api/expenses/{expense.id}",
        json={
            "amount": "8.50",
            "category": "groceries",
            "note": "burger combo",
            "occurred_at": "2026-04-23T10:15:00Z",
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert Decimal(str(data["amount"])) == Decimal("8.50")
    assert data["category"] == "groceries"
    assert data["note"] == "burger combo"
    assert data["source_text"] == "burger 7"
    assert data["occurred_at"].startswith("2026-04-23T10:15:00")

    updated_expense = db_session.get(Expense, expense.id)
    assert updated_expense is not None
    assert updated_expense.category == "groceries"
    assert updated_expense.note == "burger combo"
    assert updated_expense.source_text == "burger 7"


def test_delete_expense_removes_row(client, create_user, create_expense, db_session) -> None:
    user = create_user(messenger_psid="psid-expense-delete")
    expense = create_expense(
        user=user,
        amount="13.00",
        category="transport",
        source_text="taxi 13",
    )

    response = client.delete(f"/api/expenses/{expense.id}")

    assert response.status_code == 204
    assert response.content == b""
    assert db_session.get(Expense, expense.id) is None
