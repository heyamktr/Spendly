from __future__ import annotations

import base64
import binascii
import re
import shutil
import subprocess
import tempfile
from decimal import Decimal, InvalidOperation
from pathlib import Path

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.user import User
from app.schemas.parser import ParserConfidence
from app.schemas.receipt import ReceiptScanResponse
from app.services import expense_service
from app.services.parser_service import infer_category_from_text

SUPPORTED_IMAGE_SUFFIXES = {".jpg", ".jpeg", ".png", ".bmp", ".tif", ".tiff", ".webp"}
SUPPORTED_IMAGE_CONTENT_TYPES = {
    "image/jpeg",
    "image/png",
    "image/bmp",
    "image/tiff",
    "image/webp",
}
DECIMAL_AMOUNT_PATTERN = re.compile(
    r"(?<!\d)(?:usd\s*)?\$?(?P<amount>\d{1,3}(?:,\d{3})*(?:\.\d{2})|\d+\.\d{2})(?!\d)",
    re.IGNORECASE,
)
WHOLE_AMOUNT_PATTERN = re.compile(
    r"(?<!\d)(?:usd\s*)?\$?(?P<amount>\d{1,5})(?!\d)",
    re.IGNORECASE,
)
TOTAL_PRIORITY_PATTERNS = (
    "grand total",
    "amount due",
    "balance due",
    "total due",
    "order total",
    "your total",
)
NON_MERCHANT_PATTERNS = (
    "receipt",
    "invoice",
    "subtotal",
    "tax",
    "total",
    "amount due",
    "balance due",
    "change",
    "cash",
    "visa",
    "mastercard",
    "debit",
    "credit",
    "auth",
    "approval",
    "thank",
    "date",
    "time",
    "cashier",
)
HISTORY_STOPWORDS = {
    "the",
    "and",
    "for",
    "from",
    "with",
    "your",
    "receipt",
    "store",
    "market",
    "payment",
    "card",
    "debit",
    "credit",
    "entry",
    "manual",
    "scan",
    "total",
}
MAX_IMAGE_BYTES = 6 * 1024 * 1024


class ReceiptOcrError(Exception):
    """Raised when receipt OCR fails."""


def scan_receipt(
    db: Session,
    *,
    user: User,
    file_name: str,
    content_type: str | None,
    image_base64: str,
) -> ReceiptScanResponse:
    if not _is_supported_image(file_name=file_name, content_type=content_type):
        return ReceiptScanResponse(
            success=False,
            reason="Upload a JPG, PNG, WEBP, BMP, or TIFF receipt image.",
        )

    try:
        image_bytes = _decode_image_bytes(image_base64)
    except ValueError as exc:
        return ReceiptScanResponse(success=False, reason=str(exc))

    if len(image_bytes) > MAX_IMAGE_BYTES:
        return ReceiptScanResponse(
            success=False,
            reason="That receipt image is too large. Try an image under 6 MB.",
        )

    try:
        ocr_text = _extract_text_with_tesseract(image_bytes, file_name=file_name)
    except ReceiptOcrError:
        return ReceiptScanResponse(
            success=False,
            reason="Spendly could not scan that receipt. Try a clearer image with the total visible.",
        )

    return _build_receipt_scan_response(db, user=user, ocr_text=ocr_text)


def _build_receipt_scan_response(
    db: Session,
    *,
    user: User,
    ocr_text: str,
) -> ReceiptScanResponse:
    normalized_text = _normalize_ocr_text(ocr_text)
    if len(normalized_text) < 6:
        return ReceiptScanResponse(
            success=False,
            reason="I could not read enough text from that receipt. Try a sharper photo.",
            ocr_text=normalized_text or None,
        )

    lines = _extract_lines(normalized_text)
    merchant = _extract_merchant(lines)
    amount, strong_total_match = _extract_total(lines)
    if amount is None:
        return ReceiptScanResponse(
            success=False,
            reason="I could not find a receipt total. Try an image where the final total is visible.",
            note=merchant,
            ocr_text=normalized_text[:2000],
        )

    category = _infer_receipt_category(db, user=user, merchant=merchant, ocr_text=normalized_text)
    confidence = (
        ParserConfidence.high
        if strong_total_match and category != "other"
        else ParserConfidence.medium
    )

    return ReceiptScanResponse(
        success=True,
        amount=amount,
        currency="USD",
        category=category,
        note=merchant,
        source_text=_build_receipt_source_text(note=merchant, amount=amount),
        confidence=confidence,
        ocr_text=normalized_text[:2000],
    )


def _decode_image_bytes(value: str) -> bytes:
    payload = value
    if value.startswith("data:") and "," in value:
        payload = value.split(",", 1)[1]

    try:
        decoded = base64.b64decode(payload, validate=True)
    except (binascii.Error, ValueError) as exc:
        raise ValueError("The uploaded receipt image is not valid base64 data.") from exc

    if not decoded:
        raise ValueError("The uploaded receipt image was empty.")

    return decoded


def _extract_text_with_tesseract(image_bytes: bytes, *, file_name: str) -> str:
    settings = get_settings()
    tesseract_command = settings.tesseract_path or shutil.which("tesseract")
    if not tesseract_command:
        raise ReceiptOcrError("tesseract unavailable")

    suffix = Path(file_name).suffix.lower() or ".png"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
        temp_file.write(image_bytes)
        temp_path = Path(temp_file.name)

    try:
        completed = subprocess.run(
            [
                tesseract_command,
                str(temp_path),
                "stdout",
                "--psm",
                "6",
            ],
            capture_output=True,
            text=True,
            timeout=settings.receipt_ocr_timeout_seconds,
            check=False,
        )
    except (OSError, subprocess.SubprocessError) as exc:
        raise ReceiptOcrError("tesseract failed") from exc
    finally:
        temp_path.unlink(missing_ok=True)

    if completed.returncode != 0 and not completed.stdout.strip():
        raise ReceiptOcrError(completed.stderr.strip() or "tesseract failed")

    return completed.stdout


def _build_receipt_source_text(*, note: str | None, amount: Decimal) -> str:
    amount_text = format(amount, "f").rstrip("0").rstrip(".") or "0"
    parts = ["receipt scan"]
    if note:
        parts.append(note)
    parts.append(f"total {amount_text}")
    return ": ".join([parts[0], " ".join(parts[1:])])


def _extract_total(lines: list[str]) -> tuple[Decimal | None, bool]:
    best_amount: Decimal | None = None
    best_score: int | None = None
    strong_match = False

    for index, line in enumerate(lines):
        label_score = _score_total_line(line)
        amounts = _extract_amounts_from_line(line, allow_whole_numbers=label_score > 0)
        for amount in amounts:
            score = label_score + _bottom_bias(index, len(lines)) + min(int(amount), 40)
            if best_score is None or score > best_score or (
                score == best_score and best_amount is not None and amount > best_amount
            ):
                best_score = score
                best_amount = amount
                strong_match = label_score >= 80

    if best_amount is not None:
        return best_amount, strong_match

    fallback_amount: Decimal | None = None
    fallback_score: int | None = None
    for index, line in enumerate(lines):
        for amount in _extract_amounts_from_line(line, allow_whole_numbers=False):
            score = _bottom_bias(index, len(lines)) + min(int(amount), 25)
            if fallback_score is None or score > fallback_score or (
                score == fallback_score
                and fallback_amount is not None
                and amount > fallback_amount
            ):
                fallback_score = score
                fallback_amount = amount

    return fallback_amount, False


def _extract_amounts_from_line(line: str, *, allow_whole_numbers: bool) -> list[Decimal]:
    values: list[Decimal] = []
    for match in DECIMAL_AMOUNT_PATTERN.finditer(line):
        amount = _parse_amount(match.group("amount"))
        if amount is not None and amount > 0:
            values.append(amount)

    if values or not allow_whole_numbers:
        return values

    for match in WHOLE_AMOUNT_PATTERN.finditer(line):
        amount = _parse_amount(match.group("amount"))
        if amount is not None and amount > 0:
            values.append(amount)

    return values


def _parse_amount(value: str) -> Decimal | None:
    normalized = value.replace(",", "").strip()
    try:
        amount = Decimal(normalized)
    except InvalidOperation:
        return None

    if amount > Decimal("100000"):
        return None

    return amount.quantize(Decimal("0.01"))


def _score_total_line(line: str) -> int:
    lowered = line.lower()
    score = 0

    if any(pattern in lowered for pattern in TOTAL_PRIORITY_PATTERNS):
        score += 120
    elif re.search(r"\btotal\b", lowered):
        score += 80

    if "subtotal" in lowered:
        score -= 120
    if "tax" in lowered:
        score -= 70
    if "tip" in lowered or "gratuity" in lowered:
        score -= 45
    if "change" in lowered:
        score -= 100
    if "cash" in lowered:
        score -= 25

    return score


def _bottom_bias(index: int, total_lines: int) -> int:
    if total_lines <= 1:
        return 0
    return int((index / (total_lines - 1)) * 18)


def _extract_merchant(lines: list[str]) -> str | None:
    for line in lines[: min(10, len(lines))]:
        lowered = line.lower()
        if any(pattern in lowered for pattern in NON_MERCHANT_PATTERNS):
            continue

        letters = sum(character.isalpha() for character in line)
        digits = sum(character.isdigit() for character in line)
        if letters < 3 or digits > letters:
            continue

        cleaned = re.sub(r"\s+", " ", line).strip(" -*_:")
        if len(cleaned) < 3:
            continue

        return cleaned[:120]

    return None


def _infer_receipt_category(
    db: Session,
    *,
    user: User,
    merchant: str | None,
    ocr_text: str,
) -> str:
    history_category = _infer_category_from_history(db, user=user, merchant=merchant, ocr_text=ocr_text)
    if history_category is not None:
        return history_category

    searchable_text = " ".join(part for part in [merchant, ocr_text] if part)
    return infer_category_from_text(searchable_text)


def _infer_category_from_history(
    db: Session,
    *,
    user: User,
    merchant: str | None,
    ocr_text: str,
) -> str | None:
    receipt_tokens = _tokenize_for_history(" ".join(part for part in [merchant, ocr_text] if part))
    if not receipt_tokens:
        return None

    for expense in expense_service.list_expenses(db, user_id=user.id, limit=100, offset=0):
        candidate_tokens = _tokenize_for_history(
            " ".join(part for part in [expense.note or "", expense.source_text] if part)
        )
        if not candidate_tokens:
            continue

        overlap = receipt_tokens & candidate_tokens
        if len(overlap) >= min(2, len(receipt_tokens)):
            return expense.category

    return None


def _tokenize_for_history(value: str) -> set[str]:
    tokens = {
        token
        for token in re.findall(r"[a-z0-9]{3,}", value.lower())
        if token not in HISTORY_STOPWORDS
    }
    return tokens


def _normalize_ocr_text(value: str) -> str:
    cleaned_lines = _extract_lines(value)
    return "\n".join(cleaned_lines)


def _extract_lines(value: str) -> list[str]:
    cleaned_lines: list[str] = []
    for line in value.splitlines():
        normalized = re.sub(r"\s+", " ", line).strip()
        if normalized:
            cleaned_lines.append(normalized)
    return cleaned_lines


def _is_supported_image(*, file_name: str, content_type: str | None) -> bool:
    suffix = Path(file_name).suffix.lower()
    if suffix in SUPPORTED_IMAGE_SUFFIXES:
        return True
    if content_type and content_type.lower() in SUPPORTED_IMAGE_CONTENT_TYPES:
        return True
    return False
