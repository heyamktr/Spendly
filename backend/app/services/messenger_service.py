from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Protocol

from app.core.config import get_settings

logger = logging.getLogger(__name__)


@dataclass(slots=True)
class MessengerReplyResult:
    provider: str
    accepted: bool
    detail: str | None = None


class MessengerService(Protocol):
    def send_text_reply(self, *, recipient_psid: str, text: str) -> MessengerReplyResult:
        """Send a text reply through Messenger."""


class StubMessengerService:
    def send_text_reply(self, *, recipient_psid: str, text: str) -> MessengerReplyResult:
        logger.info("Stub Messenger reply to %s: %s", recipient_psid, text)
        return MessengerReplyResult(
            provider="stub",
            accepted=False,
            detail="reply logged only; Send API integration not enabled",
        )


def get_messenger_service() -> MessengerService:
    settings = get_settings()
    if settings.messenger_reply_mode != "stub":
        logger.warning(
            "Unsupported MESSENGER_REPLY_MODE '%s'; falling back to stub reply service.",
            settings.messenger_reply_mode,
        )
    return StubMessengerService()
