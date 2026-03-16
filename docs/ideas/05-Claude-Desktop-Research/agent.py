"""
agent.py — pydantic-ai diary agent with structured output integrity + Logfire.
Pattern: output_type=DiaryEntry gives OpenAI-Structured-Outputs-grade guarantees.
Two-stage validation: pydantic schema + custom output_validator.
"""
from __future__ import annotations

import logfire
from pydantic_ai import Agent, RunContext

from config import get_settings
from models import AgentInput, DiaryEntry

cfg = get_settings()

# ── Observability bootstrap ───────────────────────────────────────────────────
# opt-in: only activates when LOGFIRE_TOKEN is set

if cfg.observability_enabled:
    logfire.configure(token=cfg.logfire_token)
    logfire.instrument_pydantic_ai()   # auto-traces all agent runs: spans, tokens, cost

# ── Agent ─────────────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """
You are a personal diary assistant. Given a mood score (1–5) and an optional note,
produce a single warm, honest, one-sentence reflection that captures the emotional
essence of the day. Be concise and personal. Never use generic filler phrases.
""".strip()

diary_agent: Agent[AgentInput, DiaryEntry] = Agent(
    cfg.llm_model,
    output_type=DiaryEntry,
    output_retries=cfg.llm_output_retries,   # retry on schema violation, feedback sent to model
    system_prompt=SYSTEM_PROMPT,
)


# ── Output validator — stage 2 (after pydantic schema) ───────────────────────

@diary_agent.output_validator
async def validate_reflection_quality(
    ctx: RunContext[AgentInput], entry: DiaryEntry
) -> DiaryEntry:
    """
    Custom rules pydantic schema alone can't express.
    Runs after pydantic validation. Retry budget shared with output_retries.
    """
    note_input: str = ctx.deps.note if ctx.deps else ""

    # Reflection must not be a copy of the note
    if note_input and entry.reflection.strip().lower() == note_input.strip().lower():
        from pydantic_ai import ModelRetry
        raise ModelRetry("Reflection must be original — don't echo the note verbatim.")

    # Mood must be preserved from input (agent cannot hallucinate a different score)
    if ctx.deps and entry.mood != ctx.deps.mood:
        from pydantic_ai import ModelRetry
        raise ModelRetry(
            f"mood must be {ctx.deps.mood} as provided — do not change it."
        )

    return entry
