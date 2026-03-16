# Agent Skills: Progressive Disclosure for ANY Framework

> Source: [Claude Skills Aren't Just for Claude - Here's How to Build Them for ANY Agent](https://www.youtube.com/watch?v=-iTNOaCmLcw) — Cole Medin
> Source code: [github.com/coleam00/custom-agent-with-skills](https://github.com/coleam00/custom-agent-with-skills)
> Claude docs: [Agent Skills best practices](https://docs.claude.com/en/docs/agents-and-tools/agent-skills/best-practices)
> Screenshots: `/tmp/screenshots/04-agent-skills-pattern/`

---

## The Core Insight

Claude Skills (Agent Skills) use **progressive disclosure** — a 3-layer system where the agent only loads what it needs, when it needs it. This saves massive tokens and keeps context clean. But the pattern is **not Claude-specific**. You can implement it with Pydantic AI, LangChain, CrewAI, Ango, or no framework at all.

> "Skills are just files. The loading mechanism is so simple you can bring progressive disclosure anywhere."

---

## The 3-Layer Architecture

```
Layer 1: METADATA (~5% of total skill content)
    ~100 tokens per skill
    - Name + brief description in YAML front matter
    - Always in agent's context (like global rules/system prompt)
    - Agent decides which skill MIGHT be relevant

         │
         ▼  (agent calls load_skill() when it thinks skill is relevant)

Layer 2: FULL SKILL.md (~30% of total skill content)
    Complete instructions
    - ~300-500 lines detailed instructions
    - Loaded ONLY when agent thinks it needs the capability
    - Contains the "how to" for the skill

         │
         ▼  (agent calls read_ref() to load specific references)

Layer 3: REFERENCE FILES (~65% of total skill content)
    Scripts, Docs, Templates
    - Unlimited depth
    - Agent loads selectively per task
    - Only loaded when instructions reference them
```

### Why It Matters — Token Savings

| Approach | Token Cost |
|----------|-----------|
| MCP / Upfront (load everything) | ~10-50k tokens |
| Skills / On-Demand (progressive) | ~1-5k tokens |
| **Savings** | **10x context reduction** |

*See: `01-power-simplicity-0m30s.png` — full architecture diagram*

---

## Skill File Structure

### YAML Front Matter (Layer 1 — always loaded)
```yaml
---
name: research_assistant
description: >
  Helps users research topics by searching the web, summarizing findings,
  and providing structured reports with citations.
---
```
~50-100 words. This is ALL the agent sees at startup.

### SKILL.md Body (Layer 2 — loaded on demand)
The full instructions below the front matter. Loaded via `load_skill()` tool when the agent decides this skill is relevant.

### references/ Directory (Layer 3 — loaded on demand)
```
skills/
    weather/
        SKILL.md
    research_assistant/
        SKILL.md
        references/
    code_review/
        SKILL.md
        references/
    recipes/
        SKILL.md
        references/
    world_clock/
        SKILL.md
```

*See: `03-strategy-any-agent-5m54s.png` — GitHub repo structure*

---

## Two Tools for the Agent

The entire skill system needs only **two tools**:

### 1. `load_skill(skill_name)`
- Reads full SKILL.md content (Layer 2)
- Returns the complete instructions
- Agent calls this when it thinks a skill is relevant based on Layer 1 metadata

### 2. `read_ref(skill_name, ref_path)`
- Reads a specific reference file (Layer 3)
- Returns the file content
- Agent calls this when SKILL.md instructions reference external files

That's it. Two tools. Framework-agnostic.

---

## Dynamic System Prompt

At startup, the agent's system prompt is built dynamically:

1. Collect all YAML front matter from all skills
2. Inject as a "capabilities" section in the system prompt
3. Agent sees ~100 tokens per skill (just name + description)
4. Total overhead for 10 skills: ~1000 tokens instead of ~50,000

```python
# Pseudocode
def build_system_prompt():
    base = load("prompts/system.md")
    skills_metadata = []
    for skill_dir in glob("skills/*/SKILL.md"):
        front_matter = parse_yaml_front_matter(skill_dir)
        skills_metadata.append(front_matter)
    return base + "\n\nAvailable Skills:\n" + format(skills_metadata)
```

---

## Anthropic's Best Practices (from Claude Docs)

*See: `02-claude-guide-3m13s.png`, `05-custom-skill-yaml-17m33s.png`*

### Core Principles
- **Concise is key** — context window is a public good; every token competes with system prompt, conversation history, other skills metadata, and the user's actual request
- **Set appropriate degrees of freedom** — don't over-constrain, don't under-constrain
- **Test with all models you plan to use**

### Skill Structure
- Naming conventions (clear, descriptive)
- Writing effective descriptions (the 50-100 word summary IS the routing mechanism)
- Progressive disclosure patterns (the 3 layers)
- Avoid deeply nested references
- Structure longer reference files with table of contents

### Workflows and Feedback Loops
- Use workflows for complex tasks (multi-step skills)
- Implement feedback loops (skill can tell agent to retry/adjust)

### Content Guidelines
- Avoid time-sensitive content in skills
- Use consistent formatting
- Template patterns for common skill types

---

## Testing with Evals

*See: `06-evals-18m41s.png` — test directory structure*

The production pipeline includes **evals** — automated tests that verify skill reliability:

```
tests/
    evals/
        __init__.py
        evaluators.py        # LLM-as-judge evaluation functions
        new_skills.yaml      # Test cases for new skills
        response_quality.yaml # Test cases for response quality
        run_evals.py         # Eval runner
        skill_loading.yaml   # Test cases for skill loading
    test_agent.py
    test_skill_loader.py
    test_skill_tools.py
```

### Eval Pattern
- Define test cases in YAML (input, expected behavior)
- Use LLM-as-judge for fuzzy matching (not exact string comparison)
- Test both skill loading (does the right skill activate?) and response quality (is the output useful?)
- Run evals after every skill change

### Production Observability with Logfire
- Pydantic's observability platform
- Traces every agent run, tool call, and skill load
- See which skills are used, how often, and how they perform

---

## Implementation in Pydantic AI

*See: `04-code-dive-12m10s.png` — project structure and README*

### Key Files
```
src/
    __init__.py
    agent.py           # Main agent with skill-aware system prompt
    cli.py             # CLI interface
    dependencies.py    # Dependency injection
    http_tools.py      # HTTP tools for web skills
    prompts.py         # Dynamic system prompt builder
    providers.py       # LLM provider config
    settings.py        # Settings
    skill_loader.py    # YAML front matter parser + file reader
    skill_tools.py     # load_skill() and read_ref() tool definitions
    skill_toolset.py   # Toolset registration
```

### Key Features
- **Progressive Disclosure**: Skills load instructions and resources on-demand
- **Framework Agnostic**: Works with any AI framework, not locked to a specific vendor
- **Type Safe**: Full Pydantic models and type hints
- **Extensible**: Easy to add new skills by following directory structure
- **Production Ready**: Comprehensive testing patterns and examples

---

## How This Maps to Integra/NanoClaw

| Skills Pattern | Integra Equivalent |
|---|---|
| YAML front matter (Layer 1) | Skill `description` in skill definition header |
| SKILL.md (Layer 2) | Skill prompt body (loaded when `/skill-name` invoked) |
| references/ (Layer 3) | Not yet implemented — skills don't reference external files |
| `load_skill()` tool | Skill tool invocation (automatic in Claude Code) |
| `read_ref()` tool | Not implemented |
| Dynamic system prompt | NanoClaw CLAUDE.md files (auto-loaded by Claude SDK) |
| Evals | PRP validation gates (`make quick`, persona E2E tests) |
| Logfire observability | Langfuse (already integrated) |

### What We Could Add
1. **Reference files for PRP skills** — skills like `/prp-plan` could reference templates, examples, or schema docs via Layer 3
2. **Dynamic MCP tool description** — NanoClaw's `allowedTools` could inject only relevant tool descriptions (like Stripe's Tool Shed subsetting)
3. **Skill evals** — YAML test cases for each PRP skill: "given this input, does the skill produce the right structure?"
4. **Token-aware skill loading** — measure actual token cost of each NanoClaw CLAUDE.md section, prune aggressively

---

## Key Takeaways

1. **Progressive disclosure saves 10x tokens** — don't dump everything upfront. Layer: metadata → instructions → references.
2. **Two tools is all you need** — `load_skill()` and `read_ref()`. The agent decides when to call them.
3. **Skills are just files** — no framework lock-in. YAML front matter + markdown body + reference directory.
4. **The description IS the router** — the 50-100 word YAML description is what the agent uses to decide relevance. Write it carefully.
5. **Test with evals, not vibes** — YAML test cases + LLM-as-judge for fuzzy matching. Run after every skill change.
6. **Observe in production** — trace every skill load, tool call, and response quality.

---

## Screenshots Index

| File | Timestamp | Content |
|------|-----------|---------|
| `01-power-simplicity-0m30s.png` | 0:30 | Full Excalidraw: 3-layer architecture, token savings, directory structure |
| `02-claude-guide-3m13s.png` | 3:13 | Claude API Docs: Skill authoring best practices page |
| `03-strategy-any-agent-5m54s.png` | 5:54 | GitHub repo: custom-agent-with-skills directory structure |
| `04-code-dive-12m10s.png` | 12:10 | VS Code: README + project structure with progressive disclosure docs |
| `05-custom-skill-yaml-17m33s.png` | 17:33 | Claude Docs: best practices TOC (core principles, structure, workflows) |
| `06-evals-18m41s.png` | 18:41 | VS Code: tests/evals/ directory + skills/ directory expanded |
