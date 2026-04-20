from __future__ import annotations

from collections.abc import Callable, Generator
from datetime import UTC, datetime
from decimal import Decimal

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

import app.models  # noqa: F401
from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models.expense import Expense
from app.models.user import User
from app.services.messenger_service import (
    MessengerReplyResult,
    MessengerService,
    get_messenger_service,
)

test_engine = create_engine(
    "sqlite+pysqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(
    bind=test_engine,
    autoflush=False,
    autocommit=False,
    class_=Session,
)


@event.listens_for(test_engine, "connect")
def _register_sqlite_functions(dbapi_connection, _connection_record) -> None:
    dbapi_connection.create_function(
        "char_length",
        1,
        lambda value: len(value) if value is not None else 0,
    )


class RecordingMessengerService:
    def __init__(self) -> None:
        self.messages: list[dict[str, str]] = []

    def send_text_message(self, *, recipient_psid: str, text: str) -> MessengerReplyResult:
        self.messages.append(
            {
                "recipient_psid": recipient_psid,
                "text": text,
            }
        )
        return MessengerReplyResult(
            provider="test",
            accepted=True,
            detail="message recorded in test stub",
        )


@pytest.fixture()
def db_session() -> Generator[Session, None, None]:
    Base.metadata.drop_all(bind=test_engine)
    Base.metadata.create_all(bind=test_engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.rollback()
        session.close()


@pytest.fixture()
def messenger_service() -> MessengerService:
    return RecordingMessengerService()


@pytest.fixture()
def client(
    db_session: Session,
    messenger_service: MessengerService,
) -> Generator[TestClient, None, None]:
    def override_get_db() -> Generator[Session, None, None]:
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_messenger_service] = lambda: messenger_service

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()


@pytest.fixture()
def create_user(db_session: Session) -> Callable[..., User]:
    def _create_user(*, messenger_psid: str, display_name: str | None = None) -> User:
        user = User(
            messenger_psid=messenger_psid,
            display_name=display_name,
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
        return user

    return _create_user


@pytest.fixture()
def create_expense(db_session: Session) -> Callable[..., Expense]:
    def _create_expense(
        *,
        user: User,
        amount: Decimal | str,
        category: str,
        occurred_at: datetime | None = None,
        currency: str = "USD",
        note: str | None = None,
        source_text: str | None = None,
    ) -> Expense:
        expense = Expense(
            user_id=user.id,
            amount=Decimal(str(amount)),
            currency=currency,
            category=category,
            note=note,
            source_text=source_text or f"{category} {amount}",
            occurred_at=occurred_at or datetime.now(UTC),
        )
        db_session.add(expense)
        db_session.commit()
        db_session.refresh(expense)
        return expense

    return _create_expense
