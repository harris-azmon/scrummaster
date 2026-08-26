# Tech Stack

## Programming Languages

- **Python 3.9+** — Primary language for `scrummaster-core`. Used for protocol logic, Pydantic models, VCS adapters (Fossil, Git, Jujutsu), and prompt templates. 100% test coverage required. Source: `scrummaster-core/`, `skills/scrummaster/SKILL.md`, `tests/`.

- **Node.js 18+ / TypeScript** — Used for MCP servers (`mcp`, `mcp-server`). Provides the VCS-abstraction layer and agent-loop hooks (`ralph_start`/`ralph_end`). Source: `mcp/`, `mcp-server/`, `package.json`.

- **Bash / PowerShell** — Installer scripts and CLI utilities. `install.sh` (Unix/macOS), `install.ps1` (Windows), `scripts/` containing utility bash scripts. Source: `install.sh`, `install.ps1`, `scripts/`.

## Frameworks & Libraries

- **Pydantic** — Data validation and settings management for Python. Used extensively in `scrummaster-core` for model definitions, ACID schemas, and protocol state. Source: `scrummaster-core/` imports and models.

- **Commander** — CLI framework for Node.js. Listed as a dependency in `package.json` (`"commander": "^12.0.0"`). Used for command-line argument parsing in the conductor package.

- **Fossil SCM** — The default Version Control System for Scrummaster. Provides native tickets, wiki pages, and technotes for requirement traceability (ACIDs). This repo currently uses Git, but the protocol is VCS-agnostic with Fossil-first design. Source: `skills/scrummaster/references/workflows.md`, `templates/fossil/ticket_schema.sql`.

- **Git / Jujutsu adapters** — VCS abstraction layers enabling the protocol to work across Fossil, Git, and Jujutsc. The `scrummaster-core` Python library implements adapters for all three VCS platforms. Source: `scrummaster-core/vcs/` adapter implementations.

## Databases & Storage

- **SQLite** — Embedded relational database. Used internally by Fossil SCM as the repo database backend. Also the implied storage for Fossil tickets and wiki content. Source: Fossil's internal architecture.

- **JSON / flat-file** — `metadata.json` per story directory (`<Stories Directory>/<story_id>/metadata.json`), `spec.md` and `plan.md` files stored alongside. Used for per-story artifact persistence outside of VCS. Source: `skills/scrummaster-new-story/assets/catalog.md` and artifact generation protocol.

- **Fossil internal database** — The single source of truth combining repository state + tickets + wiki pages + technotes. All ACIDs are mapped 1:1 to Fossil ticket IDs. Source: `templates/fossil/ticket_schema.sql`, `acid` CLI integration.

## Packaging & Distribution

- **npm** — Node.js package distribution (`package.json`, `"test": "echo ..."`, bin `conductor` entry point).
- **PyPI** — Python package distribution for `scrummaster-core`. Source: `environment.yml`, `setup.cfg`, `VERSION`.
- **mise** — Cross-platform package manager configuration (`mise.toml`). Used for tool version management.
- **Homebrew** — macOS/Linux formula (`HOMEBREW.md`).
- **Chocolatey** — Windows package (`chocolatey/tools/chocolateyinstall.ps1`, `chocolatey/scrummaster.nuspec`).
- **Scoop** — Windows slice-based installer (`scoop/`).
- **Smithery** — Modern package registry (`smithery.toml`).

## Project Structure (Monorepo Layout)

- **`skills/`** — Portable, platform-agnostic protocol logic (`SKILL.md`), rule definitions, and skill-specific assets (setup, implement, new-epic, new-story, revert, review).
- **`rules/`** — Platform-specific operational rules that ship as the Scrummaster plugin.
- **`scrummaster-core/`** — Python 3.9+ core library with protocol logic, Pydantic models, VCS adapters (Fossil/Git/Jujutsu), and prompt templates.
- **`mcp/`** — MCP server for VCS-abstraction; TypeScript-based.
- **`mcp-server/`** — Small MCP server exposing agent-loop hooks (`ralph_start`/`ralph_end`).
- **`vendor/acid-cli`** — Vendored, fossil-retargeted fork of `acai-sh/cli` providing the `acid` CLI for ACID tracking and one-way Trello export.
- **`conductor/`** — Legacy "tracks" model directory (flat tracks vs. Scrummaster's epics/stories). Contains older integration archives and code style guides.
- **`commands/`** — OpenCode command implementations (setup, new-epic, new-story, implement, revert, status, info).
- **`templates/`** — Reusable templates: code style guides (python.md, javascript.md, etc.), fossil ticket schema, platform guides, project guides, VCS workflows (fossil.md, git.md).
- **`skills/scrummaster-setup/assets/`** — Setup assets: workflow.md, code styleguides (cpp.md, csharp.md, dart.md, general.md, go.md, html-css.md, javascript.md, python.md, ruby.md, typescript.md), catalog.md, resume.py.
- **`skills/scrummaster-new-story/assets/`** — Story generation assets: catalog.md.
- **`tests/`** — Test directory (enforcing 100% test coverage requirement for `scrummaster-core`).

## VCS Support

- **Fossil** (default) — Cathedral-style trunk development, native tickets/wiki/technotes, ACID tracking.
- **Git** — Distributed VCS adapter (this repo uses Git; Scrummaster markdown files are synced local copies; Fossil tickets can be layered on via `acid` CLI).
- **Jujutsu** — Modern Git-like VCS adapter supported by `scrummaster-core`.

## Design Principles

- **Context as code:** Project context (product, guidelines, tech stack, workflow) is a managed artifact alongside source code. The `scrummaster/` directory is the source of truth; Fossil wiki is the synced view.
- **100% test coverage** — Enforced for `scrummaster-core` Python library.
- **Traceable requirements** — Every acceptance criterion gets a stable ACID, mapped 1:1 to a Fossil ticket.
- **Smart revert** — Fossil-aware revert command that understands logical units of work (epics, stories, phases, tasks).
- **High quality bar** — 100% test coverage requirement for core; linting via pre-commit config.