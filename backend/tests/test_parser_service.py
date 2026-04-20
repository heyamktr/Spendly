from decimal import Decimal

from app.schemas.parser import ParseFailureReason, ParserConfidence
from app.services.parser_service import parse_expense_message


def test_parse_coffee_message() -> None:
    result = parse_expense_message("coffee 5")

    assert result.success is True
    assert result.amount == Decimal("5")
    assert result.category == "food"
    assert result.note == "coffee"
    assert result.source_text == "coffee 5"
    assert result.confidence == ParserConfidence.high


def test_parse_uber_message() -> None:
    result = parse_expense_message("uber 12 to campus")

    assert result.success is True
    assert result.amount == Decimal("12")
    assert result.category == "transport"
    assert result.note == "uber to campus"
    assert result.source_text == "uber 12 to campus"
    assert result.confidence == ParserConfidence.high


def test_parse_message_without_amount_fails() -> None:
    result = parse_expense_message("spent on lunch")

    assert result.success is False
    assert result.amount is None
    assert result.reason == ParseFailureReason.no_amount


def test_parse_non_positive_amount_fails() -> None:
    result = parse_expense_message("movie 0")

    assert result.success is False
    assert result.amount is None
    assert result.reason == ParseFailureReason.non_positive_amount
