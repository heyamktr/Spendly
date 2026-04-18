from decimal import Decimal
from enum import Enum

from pydantic import BaseModel


class ParserConfidence(str, Enum):
    high = "high"
    medium = "medium"


class ParseFailureReason(str, Enum):
    empty_text = "empty_text"
    no_amount = "no_amount"
    non_positive_amount = "non_positive_amount"


class ParsedExpenseResult(BaseModel):
    success: bool
    amount: Decimal | None = None
    category: str | None = None
    note: str | None = None
    source_text: str
    confidence: ParserConfidence | None = None
    reason: ParseFailureReason | None = None
