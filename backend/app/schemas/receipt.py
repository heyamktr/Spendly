from decimal import Decimal

from pydantic import BaseModel, Field, field_validator

from app.schemas.parser import ParserConfidence


class ReceiptScanRequest(BaseModel):
    user_id: int = Field(gt=0)
    file_name: str = Field(min_length=1, max_length=255)
    content_type: str | None = Field(default=None, max_length=100)
    image_base64: str = Field(min_length=1, max_length=10_000_000)

    @field_validator("file_name")
    @classmethod
    def normalize_file_name(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("file_name cannot be blank")
        return normalized

    @field_validator("content_type")
    @classmethod
    def normalize_content_type(cls, value: str | None) -> str | None:
        if value is None:
            return None

        normalized = value.strip().lower()
        return normalized or None

    @field_validator("image_base64")
    @classmethod
    def normalize_image_base64(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("image_base64 cannot be blank")
        return normalized


class ReceiptScanResponse(BaseModel):
    success: bool
    amount: Decimal | None = None
    currency: str = "USD"
    category: str | None = None
    note: str | None = None
    source_text: str | None = None
    confidence: ParserConfidence | None = None
    reason: str | None = None
    ocr_text: str | None = None
