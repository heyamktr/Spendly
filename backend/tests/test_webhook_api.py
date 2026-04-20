from __future__ import annotations

from types import SimpleNamespace

from sqlalchemy import select

from app.api.routes import webhook as webhook_routes
from app.models.expense import Expense
from app.models.user import User
from app.models.webhook_event import WebhookEvent


def _set_verify_token(monkeypatch, token: str = "test-verify-token") -> None:
    monkeypatch.setattr(
        webhook_routes,
        "get_settings",
        lambda: SimpleNamespace(messenger_verify_token=token),
    )


def _messenger_payload(*, text: str, mid: str, sender_psid: str = "psid-webhook") -> dict:
    return {
        "object": "page",
        "entry": [
            {
                "id": "page-123",
                "time": 1713523200000,
                "messaging": [
                    {
                        "sender": {"id": sender_psid},
                        "recipient": {"id": "page-123"},
                        "timestamp": 1713523200000,
                        "message": {
                            "mid": mid,
                            "text": text,
                        },
                    }
                ],
            }
        ],
    }


def test_webhook_verification_succeeds_with_correct_token(client, monkeypatch) -> None:
    _set_verify_token(monkeypatch)

    response = client.get(
        "/api/webhook/messenger",
        params={
            "hub.mode": "subscribe",
            "hub.verify_token": "test-verify-token",
            "hub.challenge": "12345",
        },
    )

    assert response.status_code == 200
    assert response.text == "12345"


def test_webhook_verification_fails_with_invalid_token(client, monkeypatch) -> None:
    _set_verify_token(monkeypatch)

    response = client.get(
        "/api/webhook/messenger",
        params={
            "hub.mode": "subscribe",
            "hub.verify_token": "wrong-token",
            "hub.challenge": "12345",
        },
    )

    assert response.status_code == 403
    assert response.json() == {"detail": "invalid verify token"}


def test_new_webhook_event_persists_user_event_and_expense(
    client,
    db_session,
    messenger_service,
) -> None:
    response = client.post(
        "/api/webhook/messenger",
        json=_messenger_payload(text="coffee 5", mid="mid.1"),
    )

    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "processed": 1,
        "duplicates": 0,
        "parse_failed": 0,
        "ignored": 0,
        "errors": 0,
    }

    users = list(db_session.scalars(select(User)))
    expenses = list(db_session.scalars(select(Expense)))
    events = list(db_session.scalars(select(WebhookEvent)))

    assert len(users) == 1
    assert users[0].messenger_psid == "psid-webhook"

    assert len(expenses) == 1
    assert expenses[0].category == "food"
    assert expenses[0].note == "coffee"
    assert expenses[0].source_text == "coffee 5"

    assert len(events) == 1
    assert events[0].status == "processed"
    assert events[0].processed_at is not None
    assert events[0].payload_json["messaging"]["message"]["text"] == "coffee 5"

    assert messenger_service.messages == [
        {
            "recipient_psid": "psid-webhook",
            "text": "Logged $5.00 for food: coffee",
        }
    ]


def test_duplicate_webhook_does_not_create_second_expense_or_reply(
    client,
    db_session,
    messenger_service,
) -> None:
    payload = _messenger_payload(text="uber 12 to campus", mid="mid.duplicate")

    first_response = client.post("/api/webhook/messenger", json=payload)
    second_response = client.post("/api/webhook/messenger", json=payload)

    assert first_response.status_code == 200
    assert second_response.status_code == 200
    assert second_response.json() == {
        "status": "ok",
        "processed": 0,
        "duplicates": 1,
        "parse_failed": 0,
        "ignored": 0,
        "errors": 0,
    }

    expenses = list(db_session.scalars(select(Expense)))
    events = list(db_session.scalars(select(WebhookEvent)))

    assert len(expenses) == 1
    assert len(events) == 1
    assert len(messenger_service.messages) == 1
    assert messenger_service.messages[0]["text"] == "Logged $12.00 for transport: uber to campus"


def test_parse_failure_stores_webhook_event_and_skips_expense_creation(
    client,
    db_session,
    messenger_service,
) -> None:
    response = client.post(
        "/api/webhook/messenger",
        json=_messenger_payload(text="spent on lunch", mid="mid.parse-failure"),
    )

    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "processed": 0,
        "duplicates": 0,
        "parse_failed": 1,
        "ignored": 0,
        "errors": 0,
    }

    users = list(db_session.scalars(select(User)))
    expenses = list(db_session.scalars(select(Expense)))
    events = list(db_session.scalars(select(WebhookEvent)))

    assert len(users) == 1
    assert len(expenses) == 0
    assert len(events) == 1
    assert events[0].status == "parse_failed"
    assert events[0].processed_at is not None
    assert events[0].payload_json["messaging"]["message"]["text"] == "spent on lunch"

    assert messenger_service.messages == [
        {
            "recipient_psid": "psid-webhook",
            "text": (
                "I couldn't understand that expense. "
                'Try something like "coffee 5" or "uber 12 to campus".'
            ),
        }
    ]
