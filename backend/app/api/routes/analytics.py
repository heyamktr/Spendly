from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.analytics import (
    AnalyticsByCategoryResponse,
    AnalyticsPeriod,
    AnalyticsRecentResponse,
    AnalyticsSummaryResponse,
)
from app.services import analytics_service, user_service

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("/summary", response_model=AnalyticsSummaryResponse)
def get_summary(
    user_id: Annotated[int, Query(gt=0)],
    db: Session = Depends(get_db),
) -> AnalyticsSummaryResponse:
    _ensure_user_exists(db, user_id)
    try:
        return analytics_service.get_summary(db, user_id=user_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.get("/by-category", response_model=AnalyticsByCategoryResponse)
def get_by_category(
    user_id: Annotated[int, Query(gt=0)],
    period: AnalyticsPeriod = Query(default=AnalyticsPeriod.month),
    db: Session = Depends(get_db),
) -> AnalyticsByCategoryResponse:
    _ensure_user_exists(db, user_id)
    try:
        return analytics_service.get_by_category(db, user_id=user_id, period=period)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.get("/recent", response_model=AnalyticsRecentResponse)
def get_recent(
    user_id: Annotated[int, Query(gt=0)],
    limit: Annotated[int, Query(ge=1, le=50)] = 10,
    db: Session = Depends(get_db),
) -> AnalyticsRecentResponse:
    _ensure_user_exists(db, user_id)
    return analytics_service.get_recent(db, user_id=user_id, limit=limit)


def _ensure_user_exists(db: Session, user_id: int) -> None:
    user = user_service.get_user_by_id(db, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="user not found")
