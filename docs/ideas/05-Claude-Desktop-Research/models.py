"""
models.py — Data contracts. One file, one truth. Frozen after creation.
Pattern: Pydantic v2 BaseModel with structural integrity matching OpenAI Structured Outputs guarantees.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, field_validator


# ── Mood scale ────────────────────────────────────────────────────────────────

MOOD_LABELS: dict[int, str] = {
    1: "😞 Rough",
    2: "😐 Meh",
    3: "🙂 Okay",
    4: "😊 Good",
    5: "🤩 Great",
}

MoodScore = Annotated[int, Field(ge=1, le=5, description="Mood score 1–5")]
BoundedNote = Annotated[
    str,
    Field(
        default="",
        max_length=1000,
        strip_whitespace=True,
        description="Optional free-text note, max 1000 chars",
    ),
]
BoundedReflection = Annotated[
    str,
    Field(
        max_length=280,
        strip_whitespace=True,
        description="One-sentence LLM reflection, Telegram-safe length",
    ),
]


# ── Core immutable record ─────────────────────────────────────────────────────

class DiaryEntry(BaseModel):
    """
    Immutable diary record. Created once at COMMIT, never mutated.
    Frozen = True enforces this at the Python level.
    All fields validated on construction — no invalid state possible.
    """

    model_config = ConfigDict(
        frozen=True,                    # immutable after save
        str_strip_whitespace=True,
        validate_assignment=True,
        extra="forbid",                 # no surprise fields
    )

    mood: MoodScore
    note: BoundedNote = ""
    reflection: BoundedReflection
    timestamp: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="UTC timestamp of entry creation",
    )

    @field_validator("reflection")
    @classmethod
    def reflection_must_be_sentence(cls, v: str) -> str:
        if not v:
            raise ValueError("reflection cannot be empty")
        if len(v.split()) < 3:
            raise ValueError("reflection must be at least 3 words")
        return v

    @property
    def mood_label(self) -> str:
        return MOOD_LABELS[self.mood]

    @property
    def display(self) -> str:
        """Telegram-ready summary string for final message edit."""
        lines = [
            f"✅ Entry saved",
            f"{self.mood_label}",
        ]
        if self.note:
            lines.append(f"📝 {self.note[:80]}{'…' if len(self.note) > 80 else ''}")
        lines.append(f"💬 {self.reflection}")
        return "\n".join(lines)


# ── LLM input contract ────────────────────────────────────────────────────────

class AgentInput(BaseModel):
    """
    What we pass to diary_agent.run_async().
    Validated before the LLM ever sees it.
    """

    model_config = ConfigDict(
        extra="forbid",
        str_strip_whitespace=True,
    )

    mood: MoodScore
    note: BoundedNote = ""
