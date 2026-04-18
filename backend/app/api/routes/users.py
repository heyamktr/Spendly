from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.user import UserListItem
from app.services import user_service

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("", response_model=list[UserListItem])
def list_users(db: Session = Depends(get_db)) -> list[UserListItem]:
    return user_service.list_users(db)
