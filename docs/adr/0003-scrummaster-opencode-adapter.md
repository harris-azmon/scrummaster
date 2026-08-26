# ADR 0003: Add a dedicated `scrummaster-opencode` adapter package

## Status

Accepted

## Context

[ADR 0002](0002-scrummaster-fork.md) deferred a dedicated OpenCode adapter
package: OpenCode was already able to discover Scrummaster generically via
the shared `SKILL.md` Agent Skills path, so no adapter shipped in that pass.

Two problems surfaced once this was picked back up:

1. The generic path's documented install location
   (`~/.opencode/skill/<skill>/SKILL.md`, in `skills/manifest.json`,
   `docs/skill-command-syntax.md`, and `skill/scripts/install.sh`) was never
   verified against OpenCode's actual behavior — an internal audit
   (`conductor/archive/skills_setup_review_20251231/gaps.md`) had flagged
   this explicitly. OpenCode's real skill search path is
   `~/.config/opencode/skills/<skill>/SKILL.md` (project-local
   `.opencode/skills/*/SKILL.md`, `.claude/skills/*/SKILL.md`, and
   `.agents/skills/*/SKILL.md` also work). `skill/scripts/install.sh` was
   additionally broken outright: its own repo-detection check
   (`commands/scrummaster/setup.toml`) pointed at a path that has never
   existed post-rename, so the installer failed immediately for every
   target, not just OpenCode.
2. OpenCode's real plugin system (`@opencode-ai/plugin`) supports more than
   passive skill discovery — plugins can register native tools the agent
   calls directly, and OpenCode has a first-class custom-commands mechanism
   (`.opencode/commands/*.md`) independent of Agent Skills.

## Decision

1. Fix the verified-wrong OpenCode paths in `skill/scripts/install.sh`
   (including its unrelated but blocking repo-detection bug) and
   `skills/manifest.json` (regenerating `docs/skill-command-syntax.md` from
   it via `scripts/render_command_matrix.py`).
2. Add `scrummaster-opencode/`, a small TypeScript package distributed as an
   OpenCode plugin (`@opencode-ai/plugin`'s `Plugin`/`tool` API). It ships:
   - Two read-only tools, `scrummaster_status` (epic → story → ACID
     completion rollup from the Fossil ticket table) and
     `scrummaster_context` (the local synced `product.md` /
     `product-guidelines.md` / `tech-stack.md` / `workflow.md` copies),
     both shelling out to the real `fossil` binary the same way
     `vendor/acid-cli`'s `fossil-client.ts` does.
   - A `scrummaster-opencode-install` bin that copies the monorepo's
     `commands/scrummaster-*.md` files (bundled into the package at build
     time by `scripts/copy-commands.mjs`, not duplicated by hand) into a
     project's `.opencode/commands/`, so the slash commands exist as real
     OpenCode commands rather than depending on skill auto-discovery.
   Deliberately *not* a `postinstall` hook — writing into a consumer's
   project tree on every `npm install` is surprising and commonly blocked by
   `ignore-scripts`, so installing the commands is an explicit, user-run
   step.
3. Wire `scrummaster-opencode`'s build + typecheck + test into the root
   `.github/workflows/ci.yml`.

## Consequences

- Pros: OpenCode users get structured, agent-callable status/context data
  instead of the agent composing its own `fossil sql` calls from prose
  instructions; slash commands are guaranteed present rather than dependent
  on OpenCode's skill-discovery heuristics; the generic Agent Skills
  install path (`skill/scripts/install.sh`) now actually works, for every
  target, not just OpenCode.
- Cons: A second place (`scrummaster-opencode/commands/`, generated) exists
  alongside `commands/*.md` (source of truth) — mitigated by generating it
  at build time rather than hand-maintaining it; the plugin's tools assume
  the Fossil ticket schema has already been applied (`/scrummaster-setup`'s
  job) and degrade to a guidance message rather than an error when it
  hasn't.
