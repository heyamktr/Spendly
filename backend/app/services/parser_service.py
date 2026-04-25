from __future__ import annotations

import re
from decimal import Decimal, InvalidOperation

from app.schemas.parser import ParseFailureReason, ParsedExpenseResult, ParserConfidence

AMOUNT_PATTERN = re.compile(r"(?<!\w)(?:\$)?(?P<amount>\d+(?:\.\d+)?)(?!\w)")

CATEGORY_KEYWORDS: dict[str, tuple[str, ...]] = {
    "food": (
        "coffee",
        "breakfast",
        "lunch",
        "dinner",
        "food",
        "meal",
        "restaurant",
        "cafe",
        "snack",
        "tea",
        "pizza",
        "burger",
        "sushi",
    ),
    "transport": (
        "uber",
        "lyft",
        "taxi",
        "bus",
        "train",
        "metro",
        "subway",
        "parking",
        "commute",
        "gas",
        "fuel",
    ),
    "groceries": (
        "grocery",
        "groceries",
        "supermarket",
        "market",
        "produce",
    ),
    "shopping": (
        "shopping",
        "shop",
        "clothes",
        "clothing",
        "shoes",
        "amazon",
        "store",
    ),
    "entertainment": (
        "movie",
        "cinema",
        "netflix",
        "spotify",
        "game",
        "concert",
        "show",
    ),
    "bills": (
        "bill",
        "bills",
        "rent",
        "internet",
        "phone",
        "electricity",
        "water",
        "utility",
        "utilities",
    ),
    "health": (
        "doctor",
        "dentist",
        "hospital",
        "pharmacy",
        "medicine",
        "medical",
        "gym",
    ),
    "education": (
        "tuition",
        "book",
        "books",
        "course",
        "class",
        "school",
        "education",
    ),
    "travel": (
        "flight",
        "hotel",
        "trip",
        "travel",
        "airbnb",
        "vacation",
    ),
}


def parse_expense_message(text: str | None) -> ParsedExpenseResult:
    source_text = text or ""
    if not source_text.strip():
        return ParsedExpenseResult(
            success=False,
            source_text=source_text,
            reason=ParseFailureReason.empty_text,
        )

    first_numeric_found = False
    for match in AMOUNT_PATTERN.finditer(source_text):
        first_numeric_found = True
        amount_text = match.group("amount")
        try:
            amount = Decimal(amount_text)
        except InvalidOperation:
            continue

        if amount <= 0:
            continue

        note = _build_note(source_text, match.span())
        category = infer_category_from_text(source_text)
        confidence = (
            ParserConfidence.high if category != "other" else ParserConfidence.medium
        )
        return ParsedExpenseResult(
            success=True,
            amount=amount,
            category=category,
            note=note,
            source_text=source_text,
            confidence=confidence,
        )

    reason = (
        ParseFailureReason.non_positive_amount
        if first_numeric_found
        else ParseFailureReason.no_amount
    )
    return ParsedExpenseResult(
        success=False,
        source_text=source_text,
        reason=reason,
    )


def _build_note(source_text: str, amount_span: tuple[int, int]) -> str | None:
    start, end = amount_span
    combined = f"{source_text[:start]} {source_text[end:]}"
    normalized = re.sub(r"\s+", " ", combined).strip()
    return normalized or None


def infer_category_from_text(source_text: str) -> str:
    lowered = source_text.lower()
    for category, keywords in CATEGORY_KEYWORDS.items():
        for keyword in keywords:
            if re.search(rf"\b{re.escape(keyword)}\b", lowered):
                return category
    return "other"
