# Product Definition

## Overview
Scrummaster is a plugin for AI coding agents that enables **Context-Driven Development**. It turns your agent into a proactive project manager that follows a strict protocol to specify, plan, and implement software features and bug fixes.

## Target Users
- Individual developers using AI coding assistants (Claude Code, OpenCode, Codex, Antigravity) who want spec-driven, traceable workflows

## Core Scope
- **Context → Spec & Plan → Implement lifecycle:** The full workflow from analyzing project context to generating detailed specifications and implementation plans, then guiding implementation.
- **Epics + Stories organization:** Group related stories into epics, each with stable Acceptance Criteria IDs (ACIDs) for traceability.
- **Workflow enforcement:** Enforce test coverage thresholds, commit frequency (after each task or phase), and automated review triggers at story completion.

## Key Features
- **Auto-generating spec.md + plan.md** per story, with task breakdown and test-first sub-tasks per workflow (e.g., "Write Tests" → "Implement Feature").
- **Managing epics** that group stories, each with stable ACIDs tracked in the project's issue/VCS system.
- **Workflow enforcement:** Required test coverage, commit-after-each-task-or-phase, automated review at story completion, and git notes or commit messages for task summaries.

## Code Style Guides
- **Python:** PEP conventions, docstring standards, and formatting.
- **TypeScript/JavaScript:** Airbnb/Standard/Prettier conventions, import ordering, and linting rules.

## Project Workflow
- **Current git-based process:** Direct-to-trunk (Cathedral-style) development using git. Commits after each task. 80% test coverage required. Git Notes used for task summaries. Automated review triggered at end of each story.

## Acceptance Criteria & ACIDs
- Every story and task has associated Acceptance Criteria IDs (ACIDs), mapped 1:1 to Fossil tickets (or issue tracker entries). ACIDs provide traceable requirements that persist across AI interactions and enable smart reverts when logical units of work change.

## Artifacts Directory
- `scrummaster/product.md` — Product definition (this file)
- `scrummaster/product-guidelines.md` — Design guidelines, prose style, brand messaging
- `scrummaster/tech-stack.md` — Languages, frameworks, databases, tools
- `scrummaster/workflow.md` — Development workflow configuration
- `scrummaster/code_styleguides/` — Copied code style guide files
- `scrummaster/epics.md` — Index of all epics
- `scrummaster/index.md` — Project context index (generated at setup finalization)