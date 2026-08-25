---
description: Initialize project with Scrummaster context-driven development on Fossil
---

# Scrummaster Setup

Initialize this project with context-driven development on Fossil. Follow this workflow:

## 1. Check Existing Setup

- If `scrummaster/setup_state.json` exists with `"last_successful_step": "complete"`, inform user setup is done
- If partial state, offer to resume or restart

## 2. Detect Project Type

**Brownfield** (existing project): Has an open Fossil checkout (`fossil info` succeeds), `package.json`, `requirements.txt`, `go.mod`, or `src/`
**Greenfield** (new project): Empty or only README.md

## 3. For Brownfield Projects

1. Announce: "Existing project detected"
2. Analyze: README.md, package.json/requirements.txt/go.mod, directory structure
3. Infer: tech stack, architecture, project goals
4. Present findings for confirmation

## 4. For Greenfield Projects

1. Ask: "What do you want to build?"
2. Initialize Fossil if needed: `fossil init project.fossil && fossil open project.fossil`, then apply the ticket schema: `fossil sql < templates/fossil/ticket_schema.sql`

## 5. Create Scrummaster Directory

```bash
mkdir -p scrummaster/code_styleguides scrummaster/epics
```

## 6. Generate Context Files (Interactive)

For each file, ask 2-3 targeted questions, then generate and publish to the fossil wiki (source of truth) with a synced local copy:

- **product.md** - Product vision, users, goals, features
- **tech-stack.md** - Languages, frameworks, databases, tools
- **workflow.md** - Use the default Fossil/Cathedral-style TDD workflow from `skills/scrummaster-setup/assets/workflow.md`

```bash
fossil wiki create Product scrummaster/product.md
fossil wiki create TechStack scrummaster/tech-stack.md
fossil wiki create Workflow scrummaster/workflow.md
```

Copy relevant code styleguides from `templates/code_styleguides/` based on tech stack.

## 7. Initialize Epics Index

Create `scrummaster/epics.md`:
```markdown
# Project Epics

This file indexes all epics. Each epic groups related stories; each story has its own spec and plan.

---
```
```bash
fossil wiki create Epics scrummaster/epics.md
```

## 8. Generate Initial Epic and Story

1. Based on project context, propose an initial epic (MVP for greenfield, first feature area for brownfield) and create it using the newepic workflow
2. On approval, create its first story using the newstory workflow

## 9. Finalize

1. Write `scrummaster/setup_state.json`: `{"last_successful_step": "complete"}`
2. Commit directly to trunk (Cathedral-style default): `fossil add scrummaster && fossil commit -m "scrummaster(setup): Initialize scrummaster"`
3. Announce: "Setup complete. Run `/scrummaster-implement` to start."
