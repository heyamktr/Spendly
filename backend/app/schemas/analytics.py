from decimal import Decimal
from enum import Enum

from pydantic import BaseModel, ConfigDict

from app.schemas.expense import ExpenseResponse


class AnalyticsPeriod(str, Enum):
    day = "day"
    week = "week"
    month = "month"


class AnalyticsSummaryResponse(BaseModel):
    user_id: int
    currency: str
    day_total: Decimal
    week_total: Decimal
    month_total: Decimal


class AnalyticsCategoryItem(BaseModel):
    category: str
    total: Decimal


class AnalyticsByCategoryResponse(BaseModel):
    user_id: int
    period: AnalyticsPeriod
    currency: str
    items: list[AnalyticsCategoryItem]


class AnalyticsRecentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: int
    items: list[ExpenseResponse]
