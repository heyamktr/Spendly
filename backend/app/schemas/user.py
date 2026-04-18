from datetime import datetime

from pydantic import BaseModel, ConfigDict


class UserListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    display_name: str | None
    messenger_psid: str
    created_at: datetime
