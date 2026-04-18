from typing import Annotated, Any

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from fastapi.responses import PlainTextResponse
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.session import get_db
from app.schemas.webhook import WebhookIntakeResponse
from app.services.messenger_service import MessengerService, get_messenger_service
from app.services.webhook_service import (
    WebhookVerificationError,
    process_messenger_webhook,
    verify_webhook_request,
)

router = APIRouter(prefix="/api/webhook", tags=["webhook"])


@router.get("/messenger", response_class=PlainTextResponse)
def verify_messenger_webhook(
    hub_mode: Annotated[str | None, Query(alias="hub.mode")] = None,
    hub_verify_token: Annotated[str | None, Query(alias="hub.verify_token")] = None,
    hub_challenge: Annotated[str | None, Query(alias="hub.challenge")] = None,
) -> str:
    settings = get_settings()
    try:
        return verify_webhook_request(
            mode=hub_mode,
            verify_token=hub_verify_token,
            challenge=hub_challenge,
            expected_verify_token=settings.messenger_verify_token,
        )
    except WebhookVerificationError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc


@router.post("/messenger", response_model=WebhookIntakeResponse)
def receive_messenger_webhook(
    payload: Annotated[dict[str, Any], Body(...)],
    db: Session = Depends(get_db),
    messenger: MessengerService = Depends(get_messenger_service),
) -> WebhookIntakeResponse:
    try:
        return process_messenger_webhook(db, payload=payload, messenger=messenger)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
