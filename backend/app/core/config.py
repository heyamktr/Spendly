from functools import lru_cache
from pathlib import Path
from urllib.parse import quote_plus

from pydantic_settings import BaseSettings, SettingsConfigDict

REPO_ROOT = Path(__file__).resolve().parents[3]


class Settings(BaseSettings):
    app_name: str = "Spendly API"
    environment: str = "development"
    frontend_url: str = "http://localhost:3000"
    messenger_verify_token: str = "spendly-dev-verify-token"
    messenger_reply_mode: str = "stub"
    messenger_page_access_token: str | None = None
    messenger_api_base_url: str = "https://graph.facebook.com/v22.0"
    messenger_request_timeout_seconds: float = 10.0
    tesseract_path: str | None = None
    receipt_ocr_timeout_seconds: float = 20.0

    database_host: str = "localhost"
    database_port: int = 5432
    database_name: str = "spendly"
    database_user: str = "spendly"
    database_password: str = "spendly"
    database_echo: bool = False

    model_config = SettingsConfigDict(
        env_file=REPO_ROOT / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def database_url(self) -> str:
        user = quote_plus(self.database_user)
        password = quote_plus(self.database_password)
        return (
            f"postgresql+psycopg://{user}:{password}"
            f"@{self.database_host}:{self.database_port}/{self.database_name}"
        )


@lru_cache
def get_settings() -> Settings:
    return Settings()
