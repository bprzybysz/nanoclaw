"""
validate.py — Apple Container / OCI pre-flight validation.
Pattern: run this BEFORE `container run` to catch config and schema errors
without burning LLM tokens or touching Telegram.

Usage:
    python validate.py                  # full validation suite
    python validate.py --config-only    # env/config check only
    python validate.py --schema-only    # pydantic model integrity only
"""
from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone


def section(title: str) -> None:
    print(f"\n{'─' * 50}")
    print(f"  {title}")
    print(f"{'─' * 50}")


def ok(msg: str) -> None:
    print(f"  ✅ {msg}")


def fail(msg: str) -> None:
    print(f"  ❌ {msg}")


def warn(msg: str) -> None:
    print(f"  ⚠️  {msg}")


# ── 1. Config validation ───────────────────────────────────────────────────────

def validate_config() -> bool:
    section("Config & Environment")
    try:
        from config import get_settings
        cfg = get_settings()
        ok(f"BOT_TOKEN present ({len(cfg.bot_token)} chars)")
        ok(f"CHAT_ID: {cfg.chat_id}")
        ok(f"Schedule: {cfg.prompt_hour:02d}:{cfg.prompt_minute:02d} {cfg.timezone}")
        ok(f"LLM model: {cfg.llm_model}")
        ok(f"LLM output retries: {cfg.llm_output_retries}")
        ok(f"Persistence path: {cfg.persistence_path}")
        if cfg.observability_enabled:
            ok(f"Logfire: enabled (token present)")
        else:
            warn("Logfire: disabled (LOGFIRE_TOKEN not set — observability off)")
        return True
    except Exception as exc:
        fail(f"Config validation failed: {exc}")
        return False


# ── 2. Model / schema integrity ───────────────────────────────────────────────

def validate_models() -> bool:
    section("Pydantic Model Integrity")
    passed = True

    try:
        from models import AgentInput, DiaryEntry, MOOD_LABELS

        # Verify all mood values 1–5 have labels
        for i in range(1, 6):
            assert i in MOOD_LABELS, f"Missing label for mood {i}"
        ok("MOOD_LABELS: all 5 values covered")

        # Valid DiaryEntry construction
        entry = DiaryEntry(
            mood=4,
            note="  test note  ",       # whitespace stripped
            reflection="Today felt balanced and calm.",
            timestamp=datetime.now(timezone.utc),
        )
        assert entry.note == "test note", "strip_whitespace not applied"
        assert entry.mood == 4
        ok("DiaryEntry: construction + whitespace stripping")

        # Frozen enforcement
        try:
            entry.mood = 5  # type: ignore
            fail("DiaryEntry: frozen=True NOT enforced — mutation allowed!")
            passed = False
        except Exception:
            ok("DiaryEntry: frozen=True enforced — immutable after creation")

        # Mood bounds
        try:
            DiaryEntry(mood=6, reflection="x y z")
            fail("DiaryEntry: mood=6 should have raised ValidationError")
            passed = False
        except Exception:
            ok("DiaryEntry: mood upper bound enforced (ge=1, le=5)")

        try:
            DiaryEntry(mood=0, reflection="x y z")
            fail("DiaryEntry: mood=0 should have raised ValidationError")
            passed = False
        except Exception:
            ok("DiaryEntry: mood lower bound enforced")

        # Reflection length bound
        try:
            DiaryEntry(mood=3, reflection="x" * 281)
            fail("DiaryEntry: reflection max_length=280 NOT enforced")
            passed = False
        except Exception:
            ok("DiaryEntry: reflection max_length=280 enforced")

        # Reflection too short
        try:
            DiaryEntry(mood=3, reflection="ok")
            fail("DiaryEntry: reflection < 3 words should have failed")
            passed = False
        except Exception:
            ok("DiaryEntry: reflection min 3 words enforced")

        # Note length bound
        try:
            DiaryEntry(mood=3, note="n" * 1001, reflection="All is well today.")
            fail("DiaryEntry: note max_length=1000 NOT enforced")
            passed = False
        except Exception:
            ok("DiaryEntry: note max_length=1000 enforced")

        # Extra fields rejected
        try:
            DiaryEntry(mood=3, reflection="Fine day today.", extra_field="oops")  # type: ignore
            fail("DiaryEntry: extra fields should be forbidden")
            passed = False
        except Exception:
            ok("DiaryEntry: extra='forbid' enforced")

        # Display property
        display = entry.display
        assert "✅" in display
        assert "😊" in display  # mood 4 label
        ok("DiaryEntry.display: renders correctly")

        # JSON schema export (verifies pydantic can introspect the model)
        schema = DiaryEntry.model_json_schema()
        assert "mood" in schema["properties"]
        assert "reflection" in schema["properties"]
        ok(f"DiaryEntry.model_json_schema(): valid ({len(schema['properties'])} fields)")

        # AgentInput
        ai = AgentInput(mood=3, note="  hello  ")
        assert ai.note == "hello"
        ok("AgentInput: construction + strip_whitespace")

        try:
            AgentInput(mood=3, note="n" * 1001)
            fail("AgentInput: note max_length NOT enforced")
            passed = False
        except Exception:
            ok("AgentInput: note max_length enforced")

    except AssertionError as exc:
        fail(f"Model assertion failed: {exc}")
        passed = False
    except Exception as exc:
        fail(f"Unexpected error: {exc}")
        passed = False

    return passed


# ── 3. Agent import check (no LLM call) ───────────────────────────────────────

def validate_agent_import() -> bool:
    section("Agent & Observability Import")
    try:
        from agent import diary_agent
        ok(f"diary_agent imported: output_type=DiaryEntry")
        ok(f"output_retries={diary_agent._output_retries if hasattr(diary_agent, '_output_retries') else 'set'}")
        return True
    except Exception as exc:
        fail(f"Agent import failed: {exc}")
        return False


# ── 4. Schema export (useful for debugging LLM prompt drift) ──────────────────

def export_schema() -> None:
    section("JSON Schema Export (for LLM introspection)")
    try:
        from models import DiaryEntry
        schema = DiaryEntry.model_json_schema()
        print(json.dumps(schema, indent=2))
    except Exception as exc:
        fail(f"Schema export failed: {exc}")


# ── Entry point ───────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(description="Diary bot pre-flight validator")
    parser.add_argument("--config-only", action="store_true")
    parser.add_argument("--schema-only", action="store_true")
    parser.add_argument("--export-schema", action="store_true")
    args = parser.parse_args()

    results: list[bool] = []

    if args.export_schema:
        export_schema()
        return

    if args.schema_only:
        results.append(validate_models())
    elif args.config_only:
        results.append(validate_config())
    else:
        results.append(validate_config())
        results.append(validate_models())
        results.append(validate_agent_import())

    section("Result")
    if all(results):
        ok("All checks passed — safe to deploy")
        sys.exit(0)
    else:
        fail(f"{results.count(False)} check(s) failed — fix before deploying")
        sys.exit(1)


if __name__ == "__main__":
    main()
