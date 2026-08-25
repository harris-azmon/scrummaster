---
description: Create a new feature or bug story with an ACID-numbered spec and plan
argument-hint: [description]
---

# Scrummaster New Story

Create a new story for: $ARGUMENTS

## 1. Verify Setup

Check these files exist:
- `scrummaster/product.md`
- `scrummaster/tech-stack.md`
- `scrummaster/workflow.md`

If missing, tell user to run `/scrummaster-setup` first.

## 2. Select or Create Epic

A story always belongs to an epic. Read `scrummaster/epics.md` and ask the user which epic this story belongs to, or offer `/scrummaster-newepic` first if none fits.

## 3. Get Story Description

- If `$ARGUMENTS` provided, use it
- Otherwise ask: "Describe the feature or bug fix you want to implement"

## 4. Generate Spec With ACIDs (Interactive)

Ask 3-5 clarifying questions based on story type:

**Feature**: What does it do? Who uses it? What's the UI? What data is involved?
**Bug**: Steps to reproduce? Expected vs actual behavior? When did it start?

Generate `spec.md` with an Overview, then every requirement expressed as a stable
**ACID** (`<story-name>.<COMPONENT>.<n>[-<sub>]`, e.g. `login-flow.AUTH.1`), grouped
by component — see `vendor/acid-cli/.agents/skills/acai/SKILL.md` for the full
convention. Never renumber an ACID once assigned; mark it `deprecated` instead.
Close with an **Out of Scope** section.

Present for approval, revise if needed.

## 5. Generate Plan

Read `scrummaster/workflow.md` for task structure (TDD, commit strategy).

Generate `plan.md` with phases, tasks, subtasks, each task tagged with the ACID(s) it satisfies:
```markdown
# Implementation Plan

## Phase 1: [Name]
- [ ] Task: [Description] (<ACID>)
  - [ ] Write tests
  - [ ] Implement
- [ ] Task: Scrummaster - Phase Verification

## Phase 2: [Name]
...
```

Present for approval, revise if needed.

## 6. Create Story Artifacts

1. Generate story ID: `shortname_YYYYMMDD` (use today's date)
2. Create directory: `scrummaster/epics/<epic_id>/stories/<story_id>/`
3. Write files:
   - `metadata.json`: `{"story_id": "...", "epic_id": "...", "type": "feature|bug", "status": "new", "created_at": "...", "description": "..."}`
   - `spec.md`
   - `plan.md`

## 7. Create a Fossil Ticket per ACID

For every ACID in `spec.md`: `fossil ticket add type Story epic_id "<epic_id>" story_id "<story_id>" acid "<acid>" status Open title "<short text>"`.

## 8. Update Epics Index

Append the story under its epic's heading in `scrummaster/epics.md`:
```markdown

## [ ] Story: [Description]
*Link: [scrummaster/epics/<epic_id>/stories/<story_id>/](scrummaster/epics/<epic_id>/stories/<story_id>/)*
```
Re-sync the wiki mirror: `fossil wiki commit Epics scrummaster/epics.md`.

## 9. Announce

"Story `<story_id>` created under epic `<epic_id>` with N ACIDs. Run `/scrummaster-implement` to start working on it."
