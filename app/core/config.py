from __future__ import annotations

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables or a .env file.
    All fields are strictly typed and validated via Pydantic V2.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── Application ──────────────────────────────────────────────────────────
    APP_NAME: str = "Coaching Center CRM"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False

    # ── Database ─────────────────────────────────────────────────────────────
    DATABASE_URL: str  # e.g. postgresql://user:pass@localhost:5432/ccrm

    # ── JWT ──────────────────────────────────────────────────────────────────
    JWT_SECRET_KEY: str          # Must be set in .env — at least 32 chars
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # ── CORS ─────────────────────────────────────────────────────────────────
    # Stored as a plain comma-separated string so pydantic-settings never
    # tries to JSON-decode it (a breaking behaviour introduced in v2.7).
    # Use the `cors_origins_list` property wherever a List[str] is needed.
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    # ── Email (Resend) ────────────────────────────────────────────────────────
    RESEND_API_KEY: str = ""          # Set in Railway env variables
    RESEND_FROM_EMAIL: str = "noreply@coachingcrm.app"   # Sender address

    @property
    def cors_origins_list(self) -> list[str]:
        """Return CORS_ORIGINS as a list, splitting on commas."""
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    def model_post_init(self, __context: object) -> None:
        """Validate JWT secret length after all fields are populated."""
        if len(self.JWT_SECRET_KEY) < 32:
            raise ValueError("JWT_SECRET_KEY must be at least 32 characters long.")



@lru_cache
def get_settings() -> Settings:
    """
    Returns a cached Settings instance.
    Use as a FastAPI dependency: `settings: Settings = Depends(get_settings)`.
    """
    return Settings()


# Module-level singleton for non-DI usage (e.g. models, security helpers).
settings: Settings = get_settings()
