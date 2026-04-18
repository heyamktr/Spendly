from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.user import User


def list_users(db: Session) -> list[User]:
    statement = select(User).order_by(User.created_at.desc(), User.id.desc())
    return list(db.scalars(statement))


def get_user_by_id(db: Session, user_id: int) -> User | None:
    return db.get(User, user_id)


def get_user_by_messenger_psid(db: Session, messenger_psid: str) -> User | None:
    statement = select(User).where(User.messenger_psid == messenger_psid)
    return db.scalar(statement)


def get_or_create_user_by_messenger_psid(
    db: Session,
    *,
    messenger_psid: str,
    display_name: str | None = None,
) -> User:
    user = get_user_by_messenger_psid(db, messenger_psid)
    if user is None:
        user = User(
            messenger_psid=messenger_psid,
            display_name=display_name,
        )
        db.add(user)
        db.flush()
        return user

    if display_name and not user.display_name:
        user.display_name = display_name
        db.flush()

    return user
