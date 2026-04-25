from decimal import Decimal

from app.schemas.parser import ParserConfidence
from app.services import receipt_service


def test_build_receipt_scan_response_extracts_total_and_history_category(
    db_session,
    create_user,
    create_expense,
) -> None:
    user = create_user(messenger_psid="psid-receipt-history")
    create_expense(
        user=user,
        amount="12.40",
        category="groceries",
        note="Whole Foods",
        source_text="whole foods groceries",
    )

    result = receipt_service._build_receipt_scan_response(
        db_session,
        user=user,
        ocr_text="""
        WHOLE FOODS
        organic bananas 4.99
        salad kit 7.99
        TOTAL 42.87
        """,
    )

    assert result.success is True
    assert result.amount == Decimal("42.87")
    assert result.category == "groceries"
    assert result.note == "WHOLE FOODS"
    assert result.source_text == "receipt scan: WHOLE FOODS total 42.87"
    assert result.confidence == ParserConfidence.high


def test_build_receipt_scan_response_supports_integer_total_lines(
    db_session,
    create_user,
) -> None:
    user = create_user(messenger_psid="psid-receipt-integer")

    result = receipt_service._build_receipt_scan_response(
        db_session,
        user=user,
        ocr_text="""
        CAMPUS CAFE
        sandwich 9
        chips 2
        TOTAL 14
        """,
    )

    assert result.success is True
    assert result.amount == Decimal("14.00")
    assert result.category == "food"
    assert result.note == "CAMPUS CAFE"
    assert result.confidence == ParserConfidence.high


def test_scan_receipt_rejects_invalid_base64(
    db_session,
    create_user,
) -> None:
    user = create_user(messenger_psid="psid-receipt-invalid")

    result = receipt_service.scan_receipt(
        db_session,
        user=user,
        file_name="receipt.png",
        content_type="image/png",
        image_base64="not-valid-base64",
    )

    assert result.success is False
    assert result.reason == "The uploaded receipt image is not valid base64 data."
