from functools import lru_cache
from typing import Literal

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

DEV_JWT_SECRET = "dev-only-insecure-secret-do-not-use-in-prod"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore", case_sensitive=False)

    database_url: str = "sqlite:///./dev.db"
    jwt_secret: str = DEV_JWT_SECRET
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60
    cors_origins: str = ""
    env: Literal["dev", "staging", "prod"] = "dev"

    rate_limit_enabled: bool = True
    contact_rate_limit: str = "5/hour"
    login_rate_limit: str = "10/minute"

    # DNS/MX lookup on the contact form email. Turn off for offline dev and tests.
    email_check_deliverability: bool = True

    @field_validator("database_url")
    @classmethod
    def _normalize_database_url(cls, v: str) -> str:
        # Hosting platforms hand out postgres:// or postgresql:// URLs; we use psycopg 3.
        for prefix in ("postgres://", "postgresql://"):
            if v.startswith(prefix):
                return "postgresql+psycopg://" + v[len(prefix):]
        return v

    @model_validator(mode="after")
    def _check_production_safety(self) -> "Settings":
        if not self.jwt_secret:  # blank line copied from .env.example
            self.jwt_secret = DEV_JWT_SECRET
        if self.env in ("staging", "prod"):
            if self.jwt_secret == DEV_JWT_SECRET or len(self.jwt_secret) < 32:
                raise ValueError("JWT_SECRET must be a random string of 32+ characters")
            if self.database_url.startswith("sqlite"):
                raise ValueError("SQLite is for local development only; use PostgreSQL")
            if not self.cors_origin_list:
                raise ValueError("CORS_ORIGINS must list the landing and admin origins")
        return self

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip().rstrip("/") for o in self.cors_origins.split(",") if o.strip()]

    @property
    def is_prod(self) -> bool:
        return self.env == "prod"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
