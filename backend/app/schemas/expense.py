from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class ExpenseCreate(BaseModel):
    user_id: int = Field(gt=0)
    amount: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    currency: str = Field(default="USD", min_length=3, max_length=3)
    category: str = Field(min_length=1, max_length=100)
    note: str | None = Field(default=None, max_length=1000)
    source_text: str | None = Field(default=None, max_length=2000)
    occurred_at: datetime | None = None

    @field_validator("currency")
    @classmethod
    def normalize_currency(cls, value: str) -> str:
        normalized = value.strip().upper()
        if len(normalized) != 3 or not normalized.isalpha():
            raise ValueError("currency must be a 3-letter code")
        return normalized

    @field_validator("category")
    @classmethod
    def normalize_category(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("category cannot be blank")
        return normalized

    @field_validator("note", "source_text")
    @classmethod
    def normalize_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return None

        normalized = value.strip()
        return normalized or None


class ExpenseResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    amount: Decimal
    currency: str
    category: str
    note: str | None
    source_text: str
    occurred_at: datetime
    created_at: datetime
