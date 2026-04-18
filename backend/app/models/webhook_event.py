from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from sqlalchemy import CheckConstraint, DateTime, Index, JSON, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class WebhookEvent(Base):
    __tablename__ = "webhook_events"
    __table_args__ = (
        CheckConstraint("char_length(provider) > 0", name="ck_webhook_events_provider_not_blank"),
        CheckConstraint("char_length(event_key) > 0", name="ck_webhook_events_event_key_not_blank"),
        CheckConstraint("char_length(sender_psid) > 0", name="ck_webhook_events_sender_psid_not_blank"),
        CheckConstraint("char_length(status) > 0", name="ck_webhook_events_status_not_blank"),
        Index("ix_webhook_events_sender_psid_received_at", "sender_psid", "received_at"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    provider: Mapped[str] = mapped_column(String(50), nullable=False)
    event_key: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        unique=True,
        index=True,
    )
    sender_psid: Mapped[str] = mapped_column(String(255), nullable=False)
    payload_json: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)
    status: Mapped[str] = mapped_column(String(50), nullable=False)
    received_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(UTC),
        server_default=func.now(),
    )
    processed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
