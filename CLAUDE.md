# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Conductor is an **agent plugin** (installable into Antigravity and Claude Code) that enables Spec-Driven Development. It transforms your coding agent into a project manager that follows a strict protocol: **Context → Spec & Plan → Implement**.

The plugin is defined in `plugin.json` and `.claude-plugin/marketplace.json`, and provides its protocol logic through `SKILL.md` files in `skills/conductor-*/`.

## Architecture

### Plugin Structure
- `plugin.json` - Plugin manifest (name, description)
- `.claude-plugin/marketplace.json` - Claude Code plugin marketplace listing
- `skills/conductor-*/SKILL.md` - Protocol logic for each command, portable across Agent-Skills-compatible clients
- `rules/` - Platform-specific operational rules (e.g. Antigravity)

### Commands (in `skills/conductor-*/`)
| Command | Skill | Purpose |
|---------|------|---------|
| `/conductor:conductor-setup` | `conductor-setup` | Initialize project with product.md, tech-stack.md, workflow.md, and first track |
| `/conductor:conductor-new-track` | `conductor-new-track` | Create new feature/bug track with spec.md and plan.md |
| `/conductor:conductor-implement` | `conductor-implement` | Execute tasks from current track's plan following TDD workflow |
| `/conductor:conductor-status` | `conductor-status` | Display progress overview from tracks.md |
| `/conductor:conductor-revert` | `conductor-revert` | Git-aware revert of tracks, phases, or tasks |
| `/conductor:conductor-review` | `conductor-review` | Review completed work against guidelines and the plan |

### Generated Artifacts (in user projects)
When users run Conductor, it creates:
```
conductor/
├── product.md           # Product vision and goals
├── product-guidelines.md # Brand/style guidelines
├── tech-stack.md        # Technology choices
├── workflow.md          # Development workflow (TDD, commits)
├── tracks.md            # Master track list with status
├── setup_state.json     # Resume state for setup
├── code_styleguides/    # Language-specific style guides
└── tracks/
    └── <track_id>/
        ├── metadata.json
        ├── spec.md      # Requirements
        └── plan.md      # Phased task list
```

### Templates (in `templates/`)
- `workflow.md` - Default workflow template (TDD, >80% coverage, git notes)
- `code_styleguides/*.md` - Style guides for Python, TypeScript, JavaScript, Go, HTML/CSS

## Key Concepts

### Tracks
A track is a logical unit of work (feature or bug fix). Each track has:
- Unique ID format: `shortname_YYYYMMDD`
- Status markers: `[ ]` new, `[~]` in progress, `[x]` completed
- Own directory with spec, plan, and metadata

### Task Workflow (TDD)
1. Select task from plan.md
2. Mark `[~]` in progress
3. Write failing tests (Red)
4. Implement to pass (Green)
5. Refactor
6. Verify >80% coverage
7. Commit with message format: `<type>(<scope>): <description>`
8. Attach summary via `git notes`
9. Update plan.md with commit SHA

### Phase Checkpoints
At phase completion:
- Run test suite
- Manual verification with user
- Create checkpoint commit
- Attach verification report via git notes

## Claude Code Implementation

A Claude Code implementation is available in `.claude/`:

### Slash Commands (User-Invoked)
```
/conductor-setup              # Initialize project
/conductor-newtrack [desc]    # Create feature/bug track
/conductor-implement [id]     # Execute track tasks
/conductor-status             # Show progress
/conductor-revert             # Git-aware revert
```

### Skill (Model-Invoked)
The skill in `.claude/skills/conductor/` automatically activates when Claude detects a `conductor/` directory or related context.

### Installation
Copy `.claude/` to any project to enable Conductor commands, or copy commands to `~/.claude/commands/` for global access.

### Interoperability
Antigravity and Claude Code both consume the same `conductor/` directory structure. Projects set up with either tool work with both.

## Development Notes

- Commands are `SKILL.md` files with embedded prompts - no build step required
- The plugin relies on the host agent's (Antigravity/Claude Code) tool calling capabilities
- State is tracked in JSON files (setup_state.json, metadata.json)
- Git notes are used extensively for audit trails
- Commands always validate setup before executing
