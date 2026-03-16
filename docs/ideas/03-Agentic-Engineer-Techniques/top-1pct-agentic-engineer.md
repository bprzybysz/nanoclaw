# Top 1% Agentic Engineer: 5 Meta-Skills That Compound

> Source: [The 5 Techniques Separating Top Agentic Engineers Right Now](https://www.youtube.com/watch?v=ttdWPDmBN_4) — Cole Medin
> Diagram: [GitHub](https://github.com/coleam00/habit-tracker/blob/main/Top1%25AgenticEngineering.png)
> Screenshots: `/tmp/screenshots/03-agentic-engineer-techniques/`

---

## The Core Insight

It's not about the tools — it's about **process and workflows**. These 5 meta-skills compound over time and make you genuinely dangerous with AI coding tools.

*See: `00-overview-0m30s.png` — full Excalidraw with all 5 techniques*

---

## 1. PRD-First Development

**Document before you code. Your PRD becomes the source of truth for every AI conversation and each granular feature.**

```
                 ┌─── Auth
                 ├─── API
PRD.md ──────────┼─── UI
                 └─── Tests
```

### When to use
- **New projects**: Full PRD with features broken into phases
- **Brownfield**: Document existing code + what comes next

### Without it
- AI makes assumptions
- Context drifts
- You fight the tool

### How to write one
- Features broken into granular phases
- Success criteria for each phase
- Tech stack + constraints upfront
- The PRD is the handoff artifact between planning and implementation

*See: `01-prd-first-0m45s.png`*

### Integra/NanoClaw mapping
We already do this: **PRP plans** in `.context/PRPs/plans/` serve the same role. Each PRP has scope, validation gates, and success criteria. The `/prp-plan` skill generates them.

---

## 2. Modular Rules Architecture

**Stop dumping everything in one massive file for your rules. Split by concern, load only what's relevant (on-demand context).**

```
AGENTS.md (root)
    │
    │  References:
    │  components.md
    │  api.md
    │  ...
    │
    ├── .agents/
    │     ├── reference/
    │     │     ├── components.md    ACTIVE
    │     │     ├── documentation.md
    │     │     ├── api.md
    │     │     └── deploy.md
    │     └── ...
    └── ...
```

### The principle
- Working on frontend? Load `components.md` only
- Working on API? Load `api.md` only
- Context stays lean — no irrelevant rules polluting your agent

### Anti-pattern
One giant CLAUDE.md with everything. Agent gets overwhelmed, follows the wrong rules, wastes tokens on irrelevant context.

*See: `02-modular-rules-4m19s.png`*

### Integra/NanoClaw mapping
Partially implemented:
- **NanoClaw**: `groups/global/CLAUDE.md` (persona) + `groups/telegram_main/CLAUDE.md` (user context) — split by concern
- **Integra**: Single `CLAUDE.md` at root — could benefit from splitting into `.claude/` modules (driver rules, testing rules, MCP rules)
- **PRP skills** already modular — each skill is a separate prompt loaded on-demand

---

## 3. Command-ify Everything

**If you do something more than twice, make it a command. Your workflows become reusable, shareable tools.**

```
repetitive ──CAPTURE──> reusable!

    /commit
    /review
    /test
```

### Examples
- `/commit` — stage + commit with convention
- `/review-pr` — review PR against project standards
- `/generate-tests` — generate tests for changed code
- `/refactor` — refactor with project patterns
- `/fix-types` — fix type errors

### Why
- Each command saves thousands of keystrokes
- Makes your system for AI coding **reliable + repeatable**
- Workflows become shareable across team

*See: `03-commandify-7m31s.png`*

### Integra/NanoClaw mapping
Heavily adopted:
- PRP skills: `/prp-plan`, `/prp-implement`, `/prp-ralph`, `/prp-commit`, `/prp-review`, `/prp-pr`
- Utility skills: `/simplify`, `/update-context`, `/prune_and_align`
- Each skill = a command that encodes a repeatable workflow

---

## 4. The Context Reset

**Planning and execution are SEPARATE conversations. Context window degradation is real — fresh starts are important.**

```
┌──────────┐      ┌──────────┐      ┌──────────┐
│   PLAN   │ ──>  │   DOC    │ ──>  │   EXEC   │
│          │      │          │      │          │
│ Research,│      │All context│     │Clean ctx, │
│ design,  │      │ captured │      │may better │
│create doc│      │Fresh start│     │ results   │
└──────────┘      └──────────┘      └──────────┘
```

### Why?
After many messages, coding agents get overwhelmed and repeat mistakes/bad assumptions.
**Fresh start = sharp focus.** Context window degradation is real.

### The flow
1. **Plan session**: Research, design, create plan document
2. **Clear conversation**: Fresh start
3. **Exec session**: Feed plan as context into new session → implement

*See: `04-context-reset-9m23s.png`*

### Integra/NanoClaw mapping
This IS the PRP workflow:
- `/prp-plan` = planning session → produces plan artifact
- `/prp-implement` = fresh session, plan as input → code changes
- `/prp-ralph` = autonomous execution loop with plan as context
- Context reset happens naturally between Claude Code conversations

---

## 5. System Evolution Mindset

**Every bug is an opportunity to evolve your SYSTEM for AI coding.**

```
BUG! ──> "What to fix...?" ──> + RULE
```

### Examples
- Bug: AI uses wrong import style → New rule in global config
- Bug: AI forgets to run tests → Update command to include test step
- Bug: AI doesn't understand auth flow → Add reference doc

### What you can fix
- **Global rules** — add to CLAUDE.md / agents config
- **On-demand context** — add reference docs
- **Commands/workflows** — improve existing or create new ones

### THE GOAL
Every time you develop a new feature, your coding agent gets smarter.

*See: `05-system-evolution-11m46s.png`*

### Integra/NanoClaw mapping
Already embedded in the culture:
- **CLAUDE.md evolves** with every PRP — lessons learned, new patterns, updated conventions
- **Memory system** — `MEMORY.md` + memory files capture decisions and lessons across sessions
- **`.context/memory/MEMORY.md`** — project memory (stable patterns, decisions, known gaps)
- Each PRP's "Lessons Learned" section feeds back into the system

---

## Summary: The Compound Effect

These 5 skills don't work in isolation — they **compound**:

```
PRD (plan) ──> Modular Rules (context) ──> Commands (workflow)
                                                │
                Context Reset ◄─────────────────┘
                     │
              System Evolution (every bug makes you better)
                     │
                     ▼
              NEXT PROJECT IS FASTER
```

| Technique | Core Principle | Time Investment | Payoff |
|-----------|---------------|----------------|--------|
| PRD-First | Document before code | 10-30 min upfront | Eliminates drift and rework |
| Modular Rules | Split by concern | One-time setup | Clean context, fewer hallucinations |
| Command-ify | Capture repeatable work | 5 min per command | Thousands of keystrokes saved |
| Context Reset | Fresh sessions | Zero cost | Better code quality per session |
| System Evolution | Learn from every bug | 2 min per rule | Agent gets smarter over time |

---

## Screenshots Index

| File | Timestamp | Content |
|------|-----------|---------|
| `00-overview-0m30s.png` | 0:30 | Full Excalidraw overview — all 5 techniques at a glance |
| `01-prd-first-0m45s.png` | 0:45 | PRD.md branching to Auth/API/UI/Tests + new vs brownfield |
| `02-modular-rules-4m19s.png` | 4:19 | AGENTS.md with .agents/ directory, on-demand context loading |
| `03-commandify-7m31s.png` | 7:31 | Repetitive -> CAPTURE -> /commit, /review, /test commands |
| `04-context-reset-9m23s.png` | 9:23 | PLAN -> DOC -> clear conversation -> EXEC flow |
| `05-system-evolution-11m46s.png` | 11:46 | BUG -> "What to fix?" -> + RULE feedback loop |
