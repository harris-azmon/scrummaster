---
name: scrummaster
description: Use when the user wants to setup a new project, create a new epic or feature, write a spec, plan a feature, fix a bug with a plan, start a new story, check project status, implement next task, or revert changes. Also use when user mentions "scrummaster", "epic", "story", "ACID", or "spec-driven development". If scrummaster is not yet configured in the project, start with setup.
---

# Scrummaster

Scrummaster is a Context-Driven Development (CDD) framework that transforms AI agents into proactive project managers. The philosophy is "Measure twice, code once" - every feature follows a strict protocol: **Context -> Spec & Plan -> Implement**. Scrummaster runs on **Fossil** (not git), defaulting to Cathedral-style, trunk-oriented development.

## Core Concepts

- **Epic**: A grouping of related stories
- **Story**: A unit of work (feature or bug fix) with its own spec and plan, belonging to an epic
- **ACID**: A stable Acceptance Criteria ID for one requirement in a story's spec (e.g. `login-flow.AUTH.1`) — the unit that gets a fossil ticket
- **Spec**: Detailed, ACID-numbered requirements document (`spec.md`)
- **Plan**: Phased task list with checkboxes (`plan.md`), each task tagged with the ACID(s) it satisfies
- **Workflow**: Rules for task lifecycle, TDD, commits, and quality gates

## Directory Structure

When initialized, Scrummaster creates this structure in the project. Fossil
tickets/wiki/technotes are the source of truth; this directory is a synced,
human-readable mirror of that state:

```text
scrummaster/
├── product.md              # Product vision and goals (mirrors wiki page Product)
├── product-guidelines.md   # UX/brand guidelines
├── tech-stack.md           # Technology choices (mirrors wiki page TechStack)
├── workflow.md             # Development workflow rules (mirrors wiki page Workflow)
├── epics.md                # Master epic -> story index (mirrors wiki page Epics)
├── code_styleguides/       # Language-specific style guides
├── epics/                  # Active epics
│   └── <epic_id>/
│       ├── epic.md
│       └── stories/
│           └── <story_id>/
│               ├── metadata.json
│               ├── spec.md   # ACID-numbered requirements
│               └── plan.md
└── archive/                 # Completed stories
```

## Available Commands

| Command | Purpose |
|---------|---------|
| **Setup** | Initialize Scrummaster in a project (new or existing) |
| **New Epic** | Create a new epic to group related stories |
| **New Story** | Create a new feature/bug story with an ACID-numbered spec and plan |
| **Implement** | Execute tasks from a story's plan following TDD workflow, closing ACID tickets as you go |
| **Status** | Show progress overview of all epics/stories, reconciled against fossil ticket state |
| **Revert** | Fossil-aware forward revert (inverse patch) of stories, phases, or tasks |

## Protocol References

The detailed protocols live in each skill's `SKILL.md` alongside this file:

| Action | Protocol File |
|--------|---------------|
| Setup project | `../scrummaster-setup/SKILL.md` |
| Create new epic | `../scrummaster-new-epic/SKILL.md` |
| Create new story | `../scrummaster-new-story/SKILL.md` |
| Implement tasks | `../scrummaster-implement/SKILL.md` |
| Check status | `../scrummaster-status/SKILL.md` |
| Revert changes | `../scrummaster-revert/SKILL.md` |
| Review completed work | `../scrummaster-review/SKILL.md` |

Fossil's exact command mapping (init/status/diff/revert/etc.) lives in
`templates/vcs_workflows/fossil.md`.

## Task Status Markers

- `[ ]` - Pending
- `[~]` - In Progress
- `[x]` - Completed

## Key Workflow Principles

1. **The Plan is Source of Truth for tasks; fossil tickets are Source of Truth for ACIDs**: `plan.md` tracks task-level progress; fossil tickets (one per ACID) track requirement-level completion
2. **Test-Driven Development**: Write tests before implementing
3. **High Code Coverage**: Target >80% coverage
4. **Commit After Each Task**: Directly to trunk (Cathedral-style default), with a fossil technote for traceability (fossil has no `git notes` equivalent — see `fossil.md`)
5. **Phase Checkpoints**: Manual verification at phase completion

## When to Use Each Protocol

- **"set up scrummaster" or "initialize project"** -> Read `../scrummaster-setup/SKILL.md`
- **"new epic", "group these stories"** -> Read `../scrummaster-new-epic/SKILL.md`
- **"new feature", "new story", "plan a feature"** -> Read `../scrummaster-new-story/SKILL.md`
- **"implement", "start working", "next task"** -> Read `../scrummaster-implement/SKILL.md`
- **"status", "progress", "where are we"** -> Read `../scrummaster-status/SKILL.md`
- **"revert", "undo", "rollback"** -> Read `../scrummaster-revert/SKILL.md`
- **"review", "code review"** -> Read `../scrummaster-review/SKILL.md`

## Assets

- **Code Styleguides**: `../scrummaster-setup/assets/code_styleguides/` (general, go, python, javascript, typescript, html-css)
- **Workflow Template**: `../scrummaster-setup/assets/workflow.md`
- **Fossil Ticket Schema**: `templates/fossil/ticket_schema.sql`

## Critical Rules

1. **Validate every tool call** - If any fails, halt and report to user
2. **Sequential questions** - Ask one question at a time, wait for response
3. **User confirmation required** - Before writing files or making changes
4. **Check setup first** - Verify `scrummaster/` exists before any operation
5. **Agnostic language** - Do not suggest slash commands like `/scrummaster:xxx`. Instead, tell the user to ask you directly (e.g., "to start implementing, just ask me" instead of "run /scrummaster:implement")
