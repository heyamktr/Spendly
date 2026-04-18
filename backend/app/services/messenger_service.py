from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from typing import Protocol
from urllib import error, request

from app.core.config import get_settings

logger = logging.getLogger(__name__)


@dataclass(slots=True)
class MessengerReplyResult:
    provider: str
    accepted: bool
    detail: str | None = None
    status_code: int | None = None
    message_id: str | None = None


class MessengerService(Protocol):
    def send_text_message(self, *, recipient_psid: str, text: str) -> MessengerReplyResult:
        """Send a plain text message through Messenger."""


class StubMessengerService:
    def send_text_message(self, *, recipient_psid: str, text: str) -> MessengerReplyResult:
        logger.info("Stub Messenger reply to %s: %s", recipient_psid, text)
        return MessengerReplyResult(
            provider="stub",
            accepted=True,
            detail="reply logged only; Send API integration not enabled",
        )


@dataclass(slots=True)
class SendApiMessengerService:
    page_access_token: str
    api_base_url: str
    timeout_seconds: float

    def send_text_message(self, *, recipient_psid: str, text: str) -> MessengerReplyResult:
        url = f"{self.api_base_url.rstrip('/')}/me/messages"
        payload = {
            "recipient": {"id": recipient_psid},
            "messaging_type": "RESPONSE",
            "message": {"text": text},
        }
        headers = {
            "Authorization": f"Bearer {self.page_access_token}",
            "Content-Type": "application/json",
        }
        body = json.dumps(payload).encode("utf-8")
        api_request = request.Request(
            url,
            data=body,
            headers=headers,
            method="POST",
        )

        try:
            with request.urlopen(
                api_request,
                timeout=self.timeout_seconds,
            ) as response:
                response_status = response.status
                response_text = response.read().decode("utf-8")
        except error.HTTPError as exc:
            response_status = exc.code
            response_text = exc.read().decode("utf-8", errors="replace")
            response_payload = _read_response_json(response_text)
            return MessengerReplyResult(
                provider="messenger_send_api",
                accepted=False,
                detail=_build_error_detail(
                    status_code=response_status,
                    response_text=response_text,
                    payload=response_payload,
                ),
                status_code=response_status,
                message_id=_extract_message_id(response_payload),
            )
        except error.URLError as exc:
            logger.exception("Messenger Send API request failed for %s", recipient_psid)
            return MessengerReplyResult(
                provider="messenger_send_api",
                accepted=False,
                detail=str(exc),
            )

        response_payload = _read_response_json(response_text)
        message_id = _extract_message_id(response_payload)
        return MessengerReplyResult(
            provider="messenger_send_api",
            accepted=True,
            detail="message sent",
            status_code=response_status,
            message_id=message_id,
        )


def get_messenger_service() -> MessengerService:
    settings = get_settings()
    if settings.messenger_reply_mode == "stub":
        return StubMessengerService()

    if settings.messenger_reply_mode == "send_api":
        if not settings.messenger_page_access_token:
            logger.warning(
                "MESSENGER_REPLY_MODE is 'send_api' but MESSENGER_PAGE_ACCESS_TOKEN is missing; "
                "falling back to stub reply service."
            )
            return StubMessengerService()

        return SendApiMessengerService(
            page_access_token=settings.messenger_page_access_token,
            api_base_url=settings.messenger_api_base_url,
            timeout_seconds=settings.messenger_request_timeout_seconds,
        )

    logger.warning(
        "Unsupported MESSENGER_REPLY_MODE '%s'; falling back to stub reply service.",
        settings.messenger_reply_mode,
    )
    return StubMessengerService()


def _read_response_json(response_text: str) -> dict[str, object] | None:
    try:
        payload = json.loads(response_text)
    except ValueError:
        return None

    if isinstance(payload, dict):
        return payload
    return None


def _extract_message_id(payload: dict[str, object] | None) -> str | None:
    if payload is None:
        return None
    message_id = payload.get("message_id")
    if isinstance(message_id, str) and message_id:
        return message_id
    return None


def _build_error_detail(
    *,
    status_code: int,
    response_text: str,
    payload: dict[str, object] | None,
) -> str:
    if payload is not None:
        error = payload.get("error")
        if isinstance(error, dict):
            message = error.get("message")
            if isinstance(message, str) and message:
                return message

    body_text = response_text.strip()
    if body_text:
        logger.warning(
            "Messenger Send API error %s: %s",
            status_code,
            body_text,
        )
        return body_text

    return f"Send API request failed with status {status_code}"
