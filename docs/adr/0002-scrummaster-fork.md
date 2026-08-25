# ADR 0002: Fork Conductor into Scrummaster (Fossil-native, ACID-driven)

## Status
Accepted

## Context
Conductor (see [ADR 0001](0001-monorepo-architecture.md)) used git as its
sole VCS, a flat `tracks/` data model, and shipped per-platform adapter
packages (`conductor-gemini`, `conductor-vscode`) alongside the shared core
library. This fork, Scrummaster, changes three things at once:

1. **VCS**: Fossil replaces git as the default backend, defaulting to
   Cathedral-style (trunk-oriented, direct-to-trunk) development. Fossil's
   native tickets, wiki, and technotes become the source of truth; markdown
   files under `scrummaster/` are generated, synced views rather than the
   authoritative record.
2. **Data model**: Flat `tracks/` becomes a two-level `epics/` -> `stories/`
   hierarchy. Every acceptance criterion in a story's `spec.md` gets a stable
   ACID (Acceptance Criteria ID, adopted from `acai-sh/cli`'s spec-driven
   methodology), mapped 1:1 to a Fossil ticket.
3. **Package scope**: `conductor-gemini` and `conductor-vscode` are deleted
   outright rather than renamed — they were coding-agent-specific adapters
   with no path forward given the fossil/epics-stories rewrite. `conductor-core`
   is renamed to `scrummaster-core` and gains a `FossilService` VCS adapter
   alongside the existing `GitService`/`JujutsuService`. `mcp` (VCS-abstraction
   MCP server) and `mcp-server` (unrelated ralph-loop tool) are kept and
   renamed. `vendor/acid-cli` vendors `acai-sh/cli`'s full history, retargeted
   from its hosted SaaS to local Fossil plus a one-way Trello export.
   OpenCode is the intended first CLI-adapter target for a future session, but
   no dedicated package ships in this pass — it already works generically via
   the shared `SKILL.md` Agent Skills path.

`.claude/` (Claude Code's own commands/skills directory) is explicitly
excluded from this fork and remains unrenamed, still describing the
Conductor/git/tracks model, as a deliberate scope boundary.

## Decision
Adopt the above as Scrummaster's architecture: Fossil-native VCS abstraction
(`scrummaster-core`'s `FossilService`, `mcp`'s `FossilVcs`), epics/stories/ACID
as the data model, and a narrower package set (`scrummaster-core`, `mcp`,
`mcp-server`, `vendor/acid-cli`) than Conductor's original adapter-per-platform
layout.

## Consequences
- Pros: A single, coherent identity-and-traceability model (ACID -> Fossil
  ticket) replaces ad hoc markdown checkboxes as the definition of "done";
  Fossil's built-in tickets/wiki/technotes remove the need for bespoke
  tooling Conductor previously approximated with git notes; a smaller
  package surface (no per-platform adapters to keep in sync) is easier to
  maintain going forward.
- Cons: Fossil has smaller ecosystem/tooling support than git (no native
  `git revert` equivalent — implemented as an inverse-patch workaround, see
  `templates/vcs_workflows/fossil.md`); losing `conductor-gemini` and
  `conductor-vscode` means those integrations have no replacement until a
  future OpenCode-first adapter package is built; `.claude/` staying frozen
  means Claude Code users see stale "Conductor" branding until a follow-up
  pass addresses it.
