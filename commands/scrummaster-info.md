---
name: scrummaster
description: Context-driven development methodology on Fossil. Understands projects set up with Scrummaster (via Gemini CLI or Claude Code). Use when working with scrummaster/ directories, epics, stories, ACIDs, specs, plans, or when user mentions context-driven development.
license: Apache-2.0
compatibility: Works with Claude Code, Gemini CLI, and any Agent Skills compatible CLI
metadata:
  version: "0.1.0"
  author: "Gemini CLI Extensions"
  repository: "https://github.com/gemini-cli-extensions/scrummaster"
  keywords:
    - context-driven-development
    - specs
    - plans
    - epics
    - stories
    - acid
    - fossil
    - tdd
    - workflow
---

# Scrummaster: Context-Driven Development

Measure twice, code once.

## Overview

Scrummaster enables context-driven development by:
1. Establishing project context (product vision, tech stack, workflow)
2. Organizing work into "epics" containing "stories" (features, bugs, improvements)
3. Creating ACID-numbered specs and phased implementation plans
4. Executing with TDD practices, fossil ticket tracking, and progress tracking

Scrummaster runs on **Fossil** (not git), defaulting to Cathedral-style,
trunk-oriented development: commits land directly on trunk. Fossil's native
tickets, wiki, and technotes are the source of truth for project state; the
`scrummaster/` directory is a synced, human-readable mirror of that state.

**Interoperability:** This skill understands scrummaster projects created by either:
- Gemini CLI extension (`/scrummaster:setup`, `/scrummaster:newstory`, etc.)
- Claude Code commands (`/scrummaster-setup`, `/scrummaster-newstory`, etc.)

Both tools use the same `scrummaster/` directory structure.

## When to Use This Skill

Automatically engage when:
- Project has a `scrummaster/` directory
- User mentions specs, plans, epics, stories, ACIDs, or context-driven development
- User asks about project status or implementation progress
- Files like `scrummaster/epics.md`, `scrummaster/product.md` exist
- User wants to organize development work

## Slash Commands

Users can invoke these commands directly:

| Command | Description |
|---------|-------------|
| `/scrummaster-setup` | Initialize project with product.md, tech-stack.md, workflow.md |
| `/scrummaster-newepic [desc]` | Create a new epic to group related stories |
| `/scrummaster-newstory [desc]` | Create new feature/bug story with an ACID-numbered spec and plan |
| `/scrummaster-implement [id]` | Execute tasks from story's plan |
| `/scrummaster-status` | Display progress overview |
| `/scrummaster-revert` | Fossil-aware forward revert of work |

## Scrummaster Directory Structure

When you see this structure, the project uses Scrummaster:

```
scrummaster/
├── product.md              # Product vision, users, goals (mirrors wiki page Product)
├── product-guidelines.md   # Brand/style guidelines (optional)
├── tech-stack.md           # Technology choices (mirrors wiki page TechStack)
├── workflow.md             # Development standards - TDD, fossil commits, coverage (mirrors wiki page Workflow)
├── epics.md                # Master epic -> story index (mirrors wiki page Epics)
├── setup_state.json        # Setup progress tracking
├── code_styleguides/       # Language-specific style guides
└── epics/
    └── <epic_id>/          # Format: shortname_YYYYMMDD
        ├── epic.md         # Epic goal and scope
        └── stories/
            └── <story_id>/ # Format: shortname_YYYYMMDD
                ├── metadata.json   # Story type, status, dates, epic_id
                ├── spec.md         # ACID-numbered requirements and acceptance criteria
                └── plan.md         # Phased task list with status, tagged by ACID
```

Fossil tickets (one per ACID, fields `epic_id`/`story_id`/`acid`/`status`) are the
authoritative record of completion.

## Status Markers

Throughout scrummaster files:
- `[ ]` - Pending/New
- `[~]` - In Progress
- `[x]` - Completed (often followed by a commit hash)

## Reading Scrummaster Context

When working in a Scrummaster project:

1. **Read `scrummaster/product.md`** - Understand what we're building and for whom
2. **Read `scrummaster/tech-stack.md`** - Know the technologies and constraints
3. **Read `scrummaster/workflow.md`** - Follow the development methodology (usually TDD, on Fossil)
4. **Read `scrummaster/epics.md`** - See all epics, their stories, and status
5. **For active work:** Read the current story's `spec.md` and `plan.md`, and its ACID ticket states (`fossil ticket list story_id "<story_id>"`)

## Workflow Integration

When implementing tasks, follow `scrummaster/workflow.md` which typically specifies:

1. **TDD Cycle:** Write failing test → Implement → Pass → Refactor
2. **Coverage Target:** Usually >80%
3. **Commit Strategy:** Conventional commits (`feat:`, `fix:`, `test:`, etc.), direct to trunk
4. **Task Updates:** Mark `[~]` when starting, `[x]` when done + commit hash; close the ACID's fossil ticket
5. **Phase Verification:** Manual user confirmation at phase end, verification report attached as a fossil technote

## Gemini CLI Compatibility

Projects set up with Gemini CLI's Scrummaster extension use identical structure.
The only differences are command syntax:

| Gemini CLI | Claude Code |
|------------|-------------|
| `/scrummaster:setup` | `/scrummaster-setup` |
| `/scrummaster:newepic` | `/scrummaster-newepic` |
| `/scrummaster:newstory` | `/scrummaster-newstory` |
| `/scrummaster:implement` | `/scrummaster-implement` |
| `/scrummaster:status` | `/scrummaster-status` |
| `/scrummaster:revert` | `/scrummaster-revert` |

Files, workflows, and state management are fully compatible.

## Example: Recognizing Scrummaster Projects

When you see `scrummaster/epics.md` with content like:

```markdown
## [ ] Epic: User Accounts
*Link: [scrummaster/epics/accounts_20260825/](scrummaster/epics/accounts_20260825/)*

## [~] Story: Add user authentication
*Link: [scrummaster/epics/accounts_20260825/stories/auth_20260825/](scrummaster/epics/accounts_20260825/stories/auth_20260825/)*
```

You know:
- This is a Scrummaster project
- There's an epic "User Accounts" with an in-progress story for authentication
- Spec and plan are in `scrummaster/epics/accounts_20260825/stories/auth_20260825/`
- Follow the workflow in `scrummaster/workflow.md`

## References

For detailed workflow documentation, see [references/workflows.md](references/workflows.md).
