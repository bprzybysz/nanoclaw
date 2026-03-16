# Turbo Code Ship: Structured AI Workflow Pattern

> Source: [Stripe's Coding Agents Ship 1,300 PRs EVERY Week](https://www.youtube.com/watch?v=NMWgXvm--to) — Cole Medin
> Screenshots: `/tmp/screenshots/02-turbo-code-ship/`

---

## The Core Insight

**The system controls the agent, not the other way around.**

AI coding agents are powerful but non-deterministic. The pattern that Stripe (Minions), Shopify (Roast), Airbnb, and AWS all converge on: **interweave deterministic gates with agentic nodes** so that validation is *guaranteed*, not *hoped for*.

> "Writing code to deterministically accomplish small decisions we can anticipate saves tokens, and gives the agent a little less opportunity to get things wrong." — Stripe blog

---

## The Pattern (Generic)

```
Entry Point
    |
    v
[DETERMINISTIC] Context Curation
    - Gather docs, tickets, relevant code
    - Select subset of tools for the agent
    |
    v
[AGENTIC] AI Writes Code
    |
    v
[DETERMINISTIC] Lint + Type Check + Tests
    |
    +--FAIL--> [AGENTIC] AI Fixes --> back to gate
    |
    +--PASS
    |
    v
[HUMAN] Review --> Merge
```

Key: **Clouds = agentic** (non-deterministic), **Squares = deterministic** (guaranteed to run).

*See: `01-high-level-pattern-1m45s.png`*

---

## Stripe Minions — Specifics

| Detail | Value |
|--------|-------|
| PRs/week | 1,300+ AI-written (of 8,000+ total) |
| Engineers | ~3,400 |
| Backend | Ruby (uncommon for LLMs) |
| Test suite | 3M+ tests |
| Entry point | Slack thread (also CLI) |
| MCP tools | ~500 in "Tool Shed" server |
| Tools per task | ~15 (curated subset) |
| Execution | Isolated AWS EC2 ("cattle not pets") |
| Max retries | 2 rounds before human escalation |

### Minions Workflow

```
Slack / CLI
    |
    v
[DET] Context Curation
    - MCP tools search tickets + docs
    - Select ~15 tools from 500
    |
    v
[AGENT] Implement (in isolated devbox)
    |
    v
[DET] Lint + Sorbet (type checking)
    |
    +--FAIL--> [AGENT] Fix lint errors --> back
    |
    v
[DET] CI / 3M+ Tests (distributed, <15 min)
    |
    +--FAIL (max 2x)--> [AGENT] Fix --> back
    +--FAIL (3rd)--> escalate to human
    |
    v
[HUMAN] Review --> Merge
```

*See: `04-piv-loop-diagram-14m52s.png`, `05-your-workflow-detail-16m00s.png`*

### Why Isolated Devboxes

- Worktrees/containers on laptops = permissioning hell, doesn't scale
- EC2 instances: preloaded with codebase + lint cache, spin up fast
- One engineer often runs many minions in parallel
- Full permissions in secure isolation

*See: `02-slack-minion-example-5m10s.png`*

---

## The PIV Loop (Your Workflow)

Cole Medin's generalization for any engineer:

### Phase 1: PLANNING
```
GitHub Issue / Feature Request
    |
    v
[AGENT] Plan implementation
    |
    v
[HUMAN] Iterate on plan (validate scope, tests, success criteria)
    |
    v
Plan Artifact (structured doc)
```

### Phase 2: IMPLEMENTATION (fresh context window!)
```
Plan Artifact --> NEW agent session
    |
    v
[AGENT] Implement (plan as context)
    |
    v
[DET] Lint + Types + Tests (ESLint, mypy, pytest, etc.)
    |
    +--FAIL--> [AGENT] Fix --> back to gate
    |
    v
PR Review --> Merge
```

### Critical Details
- **Fresh context window** between planning and implementation — keeps the implementation agent focused
- **Deterministic validation** is enforced by the system, not left to the agent's discretion
- **Human review** of the plan AND the final PR — never vibe coding

*See: `04-piv-loop-diagram-14m52s.png`*

---

## How This Maps to Integra/NanoClaw

We already have most of these pieces:

| Pattern Element | Integra Equivalent |
|---|---|
| Entry point (Slack) | Telegram bot (@nanox113_bot) |
| MCP Tool Shed (~500 tools) | `scripts/mcp_server.py` tools |
| Context curation | `get_daily_context` + CLAUDE.md persona files |
| Deterministic validation | `make quick` (pytest + mypy + ruff) |
| PIV loop | PRP workflow (plan -> implement -> validate) |
| Isolated devbox | NanoClaw containers (Podman) |
| Blueprint/workflow DSL | PRP plans in `.context/PRPs/plans/` |

### What We Could Add
1. **Automated validation gate** — after agent writes code, automatically run `make quick` and feed failures back (currently manual via `/prp-ralph`)
2. **Tool subsetting** — curate which MCP tools NanoClaw gets per task type (currently: all or nothing via `allowedTools`)
3. **Context curation node** — deterministic step before agent that gathers issue details, relevant code, recent changes
4. **Max retry limit** — cap Ralph loops at N iterations before escalating (currently unbounded)

---

## Reference Implementations

- **Shopify Roast** (open source): Ruby DSL for structured AI workflows. "Cogs" = building blocks (LLM calls, shell commands, data processing). Has quickstarts.
  *See: `06-shopify-roast-16m42s.png`*
- **Stripe Minions** (closed source): Blog posts describe the blueprint system in detail.
- **Archon** (Cole Medin, WIP): UI-based workflow builder — "N8N for AI coding". Define agent + deterministic nodes visually, run in parallel, observe logs.

---

## Key Takeaways

1. **System > Agent**: Don't let the agent control the workflow. Build the workflow, plug the agent into specific slots.
2. **Deterministic gates are non-negotiable**: Linting, type checking, testing must ALWAYS run — not optionally via agent tool calls.
3. **Context curation pays for itself**: Curating docs + tools upfront saves tokens and reduces hallucination.
4. **Fresh context per phase**: Planning and implementation should be separate sessions.
5. **Retry with limits**: Loop back on failures, but escalate to human after 2-3 rounds.
6. **Cattle not pets**: Execution environments should be disposable and parallelizable.

---

## Screenshots Index

| File | Timestamp | Content |
|------|-----------|---------|
| `01-high-level-pattern-1m45s.png` | 1:45 | Full Excalidraw: THE PATTERN + STRIPE MINIONS workflow |
| `02-slack-minion-example-5m10s.png` | 5:10 | Blog post: Slack message invoking a minion |
| `03-blueprint-diagram-7m18s.png` | 7:18 | Blog post: Blueprint node diagram (implement, lint, CI) |
| `04-piv-loop-diagram-14m52s.png` | 14:52 | Excalidraw: Both Stripe + YOUR WORKFLOW side by side |
| `05-your-workflow-detail-16m00s.png` | 16:00 | Excalidraw: YOUR WORKFLOW detail (planning + implementation) |
| `06-shopify-roast-16m42s.png` | 16:42 | Shopify Roast GitHub repo (open source reference) |
