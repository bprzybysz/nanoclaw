"""
config.py — Single source of truth for all configuration.
Pattern: pydantic-settings with env validation + fail-fast on startup.
"""
from __future__ import annotations

from functools import lru_cache
from zoneinfo import ZoneInfo

from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    All config lives here. Missing required vars raise ValidationError at import time —
    not buried in runtime stack traces. No secrets in code, no os.getenv() scatter.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="forbid",            # no undeclared vars silently swallowed
    )

    # ── Telegram ──────────────────────────────────────────────────────────────
    bot_token: str = Field(
        ...,
        description="Telegram bot token from @BotFather",
        min_length=40,
    )
    chat_id: int = Field(
        ...,
        description="Your personal Telegram chat ID (integer)",
    )

    # ── Schedule ──────────────────────────────────────────────────────────────
    prompt_hour: int = Field(
        default=21,
        ge=0,
        le=23,
        description="Hour (0–23) to send daily diary prompt",
    )
    prompt_minute: int = Field(
        default=0,
        ge=0,
        le=59,
        description="Minute (0–59) to send daily diary prompt",
    )
    timezone: str = Field(
        default="Europe/Warsaw",
        description="IANA timezone string for schedule",
    )

    # ── LLM ───────────────────────────────────────────────────────────────────
    anthropic_api_key: str = Field(
        ...,
        description="Anthropic API key",
        min_length=20,
    )
    llm_model: str = Field(
        default="anthropic:claude-haiku-4-5",
        description="pydantic-ai model string",
    )
    llm_output_retries: int = Field(
        default=2,
        ge=0,
        le=5,
        description="Max retries for LLM structured output validation",
    )

    # ── Observability ─────────────────────────────────────────────────────────
    logfire_token: str | None = Field(
        default=None,
        description="Logfire write token — observability is opt-in",
    )

    # ── Persistence ───────────────────────────────────────────────────────────
    persistence_path: str = Field(
        default="data/diary.pkl",
        description="Path for PicklePersistence file",
    )

    # ── Validators ────────────────────────────────────────────────────────────

    @field_validator("timezone")
    @classmethod
    def validate_timezone(cls, v: str) -> str:
        try:
            ZoneInfo(v)  # raises ZoneInfoNotFoundError if invalid
        except Exception as exc:
            raise ValueError(f"Invalid IANA timezone '{v}': {exc}") from exc
        return v

    @model_validator(mode="after")
    def validate_logfire_if_present(self) -> "Settings":
        if self.logfire_token is not None and len(self.logfire_token) < 10:
            raise ValueError("LOGFIRE_TOKEN looks malformed (too short)")
        return self

    # ── Derived helpers ───────────────────────────────────────────────────────

    @property
    def tz(self) -> ZoneInfo:
        return ZoneInfo(self.timezone)

    @property
    def observability_enabled(self) -> bool:
        return self.logfire_token is not None


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """
    Cached singleton. Import and call anywhere:
        from config import get_settings
        cfg = get_settings()
    Fails loudly at first call if env is invalid — not silently at runtime.
    """
    return Settings()
