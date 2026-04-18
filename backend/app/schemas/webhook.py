from pydantic import BaseModel


class WebhookIntakeResponse(BaseModel):
    status: str = "ok"
    processed: int = 0
    duplicates: int = 0
    parse_failed: int = 0
    ignored: int = 0
    errors: int = 0
