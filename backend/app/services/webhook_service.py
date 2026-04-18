from __future__ import annotations

import hashlib
import logging
from dataclasses import dataclass
from datetime import UTC, datetime
from enum import StrEnum
from typing import Any

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.webhook_event import WebhookEvent
from app.schemas.parser import ParseFailureReason, ParsedExpenseResult
from app.schemas.webhook import WebhookIntakeResponse
from app.services import expense_service, parser_service, user_service
from app.services.messenger_service import MessengerService

logger = logging.getLogger(__name__)


class WebhookEventStatus(StrEnum):
    received = "received"
    processed = "processed"
    parse_failed = "parse_failed"
    error = "error"


class WebhookVerificationError(Exception):
    def __init__(self, *, status_code: int, detail: str) -> None:
        self.status_code = status_code
        self.detail = detail
        super().__init__(detail)


@dataclass(slots=True)
class IncomingMessengerEvent:
    page_id: str
    sender_psid: str
    message_mid: str | None
    timestamp_ms: int | None
    text: str | None
    payload_json: dict[str, Any]

    @property
    def occurred_at(self) -> datetime:
        if self.timestamp_ms is None:
            return datetime.now(UTC)
        return datetime.fromtimestamp(self.timestamp_ms / 1000, tz=UTC)


def verify_webhook_request(
    *,
    mode: str | None,
    verify_token: str | None,
    challenge: str | None,
    expected_verify_token: str,
) -> str:
    if mode != "subscribe":
        raise WebhookVerificationError(
            status_code=400,
            detail="invalid hub.mode",
        )

    if verify_token != expected_verify_token:
        raise WebhookVerificationError(
            status_code=403,
            detail="invalid verify token",
        )

    if challenge is None or challenge == "":
        raise WebhookVerificationError(
            status_code=400,
            detail="missing hub.challenge",
        )

    return challenge


def process_messenger_webhook(
    db: Session,
    *,
    payload: dict[str, Any],
    messenger: MessengerService,
) -> WebhookIntakeResponse:
    events, ignored = _extract_messenger_events(payload)
    counts = {
        "processed": 0,
        "duplicates": 0,
        "parse_failed": 0,
        "ignored": ignored,
        "errors": 0,
    }

    for incoming_event in events:
        event_key = build_event_key(incoming_event)
        webhook_event = _create_received_event(
            db,
            incoming_event=incoming_event,
            event_key=event_key,
        )
        if webhook_event is None:
            counts["duplicates"] += 1
            continue

        try:
            user = user_service.get_or_create_user_by_messenger_psid(
                db,
                messenger_psid=incoming_event.sender_psid,
            )
            parse_result = parser_service.parse_expense_message(incoming_event.text)

            if not parse_result.success:
                _mark_event_finished(
                    db,
                    webhook_event=webhook_event,
                    status=WebhookEventStatus.parse_failed,
                )
                _send_parse_failure_reply(
                    messenger,
                    recipient_psid=incoming_event.sender_psid,
                    parse_result=parse_result,
                )
                counts["parse_failed"] += 1
                continue

            expense_service.create_expense_record(
                db,
                user=user,
                amount=parse_result.amount,
                currency="USD",
                category=parse_result.category,
                note=parse_result.note,
                source_text=parse_result.source_text,
                occurred_at=incoming_event.occurred_at,
                commit=False,
            )
            webhook_event.status = WebhookEventStatus.processed.value
            webhook_event.processed_at = datetime.now(UTC)
            db.commit()
            _send_confirmation_reply(
                messenger,
                recipient_psid=incoming_event.sender_psid,
                parse_result=parse_result,
            )
            counts["processed"] += 1
        except Exception:
            logger.exception("Failed to process webhook event %s", webhook_event.id)
            db.rollback()
            _mark_event_error(db, webhook_event_id=webhook_event.id)
            counts["errors"] += 1

    return WebhookIntakeResponse(**counts)


def build_event_key(incoming_event: IncomingMessengerEvent) -> str:
    if incoming_event.message_mid:
        raw_key = ":".join(
            [
                "messenger",
                incoming_event.page_id,
                incoming_event.sender_psid,
                incoming_event.message_mid,
            ]
        )
    else:
        raw_key = ":".join(
            [
                "messenger",
                incoming_event.page_id,
                incoming_event.sender_psid,
                str(incoming_event.timestamp_ms or 0),
                incoming_event.text or "",
            ]
        )

    digest = hashlib.sha256(raw_key.encode("utf-8")).hexdigest()
    return f"messenger:{digest}"


def _extract_messenger_events(payload: dict[str, Any]) -> tuple[list[IncomingMessengerEvent], int]:
    if payload.get("object") != "page":
        raise ValueError("unsupported webhook payload object")

    entries = payload.get("entry")
    if not isinstance(entries, list):
        raise ValueError("invalid webhook payload: entry must be a list")

    events: list[IncomingMessengerEvent] = []
    ignored = 0

    for entry in entries:
        if not isinstance(entry, dict):
            ignored += 1
            continue

        page_id = _coerce_string(entry.get("id")) or "unknown_page"
        entry_time = entry.get("time")
        messaging_items = entry.get("messaging")
        if not isinstance(messaging_items, list):
            ignored += 1
            continue

        for messaging_event in messaging_items:
            if not isinstance(messaging_event, dict):
                ignored += 1
                continue

            sender = messaging_event.get("sender")
            sender_psid = None
            if isinstance(sender, dict):
                sender_psid = _coerce_string(sender.get("id"))

            recipient = messaging_event.get("recipient")
            recipient_id = None
            if isinstance(recipient, dict):
                recipient_id = _coerce_string(recipient.get("id"))

            final_page_id = recipient_id or page_id
            message = messaging_event.get("message")
            message_mid = None
            text = None
            if isinstance(message, dict):
                message_mid = _coerce_string(message.get("mid"))
                raw_text = message.get("text")
                if isinstance(raw_text, str):
                    text = raw_text

            timestamp_ms = _coerce_int(messaging_event.get("timestamp")) or _coerce_int(entry_time)
            if sender_psid is None:
                ignored += 1
                continue

            payload_json = {
                "object": payload.get("object"),
                "entry": {
                    "id": page_id,
                    "time": entry_time,
                },
                "messaging": messaging_event,
            }
            events.append(
                IncomingMessengerEvent(
                    page_id=final_page_id,
                    sender_psid=sender_psid,
                    message_mid=message_mid,
                    timestamp_ms=timestamp_ms,
                    text=text,
                    payload_json=payload_json,
                )
            )

    return events, ignored


def _create_received_event(
    db: Session,
    *,
    incoming_event: IncomingMessengerEvent,
    event_key: str,
) -> WebhookEvent | None:
    webhook_event = WebhookEvent(
        provider="messenger",
        event_key=event_key,
        sender_psid=incoming_event.sender_psid,
        payload_json=incoming_event.payload_json,
        status=WebhookEventStatus.received.value,
    )
    db.add(webhook_event)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        return None

    db.refresh(webhook_event)
    return webhook_event


def _mark_event_finished(
    db: Session,
    *,
    webhook_event: WebhookEvent,
    status: WebhookEventStatus,
) -> None:
    webhook_event.status = status.value
    webhook_event.processed_at = datetime.now(UTC)
    db.commit()


def _mark_event_error(db: Session, *, webhook_event_id: int) -> None:
    webhook_event = db.get(WebhookEvent, webhook_event_id)
    if webhook_event is None:
        return

    webhook_event.status = WebhookEventStatus.error.value
    webhook_event.processed_at = datetime.now(UTC)
    db.commit()


def _send_confirmation_reply(
    messenger: MessengerService,
    *,
    recipient_psid: str,
    parse_result: ParsedExpenseResult,
) -> None:
    amount_text = format(parse_result.amount, ".2f")
    message = f"Logged ${amount_text} to {parse_result.category}."
    _safe_send_reply(messenger, recipient_psid=recipient_psid, text=message)


def _send_parse_failure_reply(
    messenger: MessengerService,
    *,
    recipient_psid: str,
    parse_result: ParsedExpenseResult,
) -> None:
    reason_text = "I couldn't find a positive amount in that message."
    if parse_result.reason == ParseFailureReason.empty_text:
        reason_text = "I couldn't read any message text."

    message = (
        f"{reason_text} Try messages like 'coffee 5' or 'uber 12 to campus'."
    )
    _safe_send_reply(messenger, recipient_psid=recipient_psid, text=message)


def _safe_send_reply(
    messenger: MessengerService,
    *,
    recipient_psid: str,
    text: str,
) -> None:
    try:
        messenger.send_text_reply(recipient_psid=recipient_psid, text=text)
    except Exception:
        logger.exception("Failed to send Messenger reply to %s", recipient_psid)


def _coerce_string(value: Any) -> str | None:
    if value is None:
        return None
    if isinstance(value, str):
        normalized = value.strip()
        return normalized or None
    return str(value)


def _coerce_int(value: Any) -> int | None:
    if value is None:
        return None
    if isinstance(value, bool):
        return None
    if isinstance(value, int):
        return value
    if isinstance(value, float):
        return int(value)
    if isinstance(value, str) and value.strip():
        try:
            return int(value)
        except ValueError:
            return None
    return None
