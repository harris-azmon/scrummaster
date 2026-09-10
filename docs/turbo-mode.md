# Turbo Mode

Turbo Mode is an opt-in switch, set per-project in `scrummaster/workflow.md`,
that replaces every point where a Scrummaster skill would stop and ask the
human user a question with spawning a subagent instead. The subagent's
answer is treated exactly as the human's would be, and Scrummaster keeps
going without waiting.

Default: **Disabled**. Everything in this document only applies when it's
turned on.

## Why two roles, not one

Scrummaster's "ask the user" moments split cleanly into two kinds of
decision, so there are two subagents rather than one generic
question-answerer:

- **`scrummaster-product-manager`** — scope, priority, and lifecycle
  decisions: which epic a story belongs to, turning a vague feature request
  into a concrete story, sign-off on a drafted spec/plan at the product
  level, archive/delete/keep on story completion, picking a revert target.
- **`scrummaster-software-architect`** — technical decisions: is a drafted
  spec/plan technically sound and buildable, running and judging phase
  verification (tests, coverage), tech-stack deviation requests, resolving
  implementation-detail ambiguity the spec left open.

Both are defined at `agents/scrummaster-product-manager.md` and
`agents/scrummaster-software-architect.md` at the monorepo root — read those
files for the exact decision boundaries and source-of-truth files each one
consults (`scrummaster/product.md` etc. for the PM, `scrummaster/tech-stack.md`
and test/coverage output for the architect). They intentionally have no
file-write access; they decide, the calling skill acts.

## Turning it on

1. Install the two agents for your platform (see the table below).
2. During `/scrummaster setup`, answer yes when asked "Enable Turbo Mode?"
   — or edit the `Turbo Mode:` marker at the top of your project's
   `scrummaster/workflow.md` directly and re-run setup.
3. Every subsequent `/scrummaster *` command reads that marker and redirects
   its "ask the user" steps accordingly (see the "Turbo Mode" section of
   `skills/scrummaster/references/workflows.md`).

## Platform support

| Platform | Subagent format | Install |
| --- | --- | --- |
| OpenCode | `.opencode/agents/*.md` (file-based, proven convention) | `npx scrummaster-opencode-install-agents` |
| Claude Code | `.claude/agents/*.md` (file-based, same shape minus OpenCode's `mode`/`permission` frontmatter) | copy `agents/scrummaster-*.md` into `.claude/agents/` manually for now — no dedicated installer yet |
| Others (Gemini, Qwen, Codex, Antigravity, Copilot, Aix, Skillshare) | No proven file-based subagent convention in this ecosystem yet | Turbo Mode stays unavailable; `/scrummaster setup` won't offer the question |

If your host agent can't spawn subagents at all, leave Turbo Mode disabled —
every workflow still works, it just asks you directly as before.

## What Turbo Mode does not change

- The underlying epics/stories/ACID/fossil-ticket data model is identical.
- Nothing about implementation, testing, or commit conventions changes —
  the software architect subagent enforces the same `workflow.md` rules a
  human reviewer would.
- Turbo Mode never grants file-write or unrestricted shell access to either
  subagent; they can read context and (the architect) run verification
  commands, nothing more.
