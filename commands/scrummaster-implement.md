---
description: Execute tasks from a story's implementation plan
argument-hint: [story_id]
---

# Scrummaster Implement

Implement story: $ARGUMENTS

## 1. Verify Setup

Check these files exist:
- `scrummaster/product.md`
- `scrummaster/tech-stack.md`
- `scrummaster/workflow.md`

If missing, tell user to run `/scrummaster-setup` first.

## 2. Select Story

- If `$ARGUMENTS` provided (story_id), find that story in `scrummaster/epics.md`
- Otherwise, find first incomplete story (`[ ]` or `[~]`) in `scrummaster/epics.md`
- If no stories found, suggest `/scrummaster-newstory`

## 3. Load Context

Read into context:
- `scrummaster/epics/<epic_id>/stories/<story_id>/spec.md`
- `scrummaster/epics/<epic_id>/stories/<story_id>/plan.md`
- `scrummaster/workflow.md`
- This story's ACID ticket states: `fossil sql "SELECT tkt_uuid, acid, status FROM ticket WHERE story_id='<story_id>'"`

## 4. Update Story Status

In `scrummaster/epics.md`, change `## [ ] Story:` to `## [~] Story:` for selected story.

## 5. Execute Tasks

For each incomplete task in plan.md:

### 5.1 Mark In Progress
Change `[ ]` to `[~]` in plan.md

### 5.2 TDD Workflow (if workflow.md specifies)
1. Write failing tests for the task (name them after the ACID they validate)
2. Run tests, confirm they fail
3. Implement minimum code to make tests pass
4. Run tests, confirm they pass
5. Refactor if needed (keep tests passing)

### 5.3 Commit Changes (direct to trunk, Cathedral-style default)
```bash
fossil add .
fossil commit -m "feat(<scope>): <description> (<ACID>)"
```

### 5.4 Close the ACID Ticket
```bash
fossil ticket change <ticket_id> status Closed
```

### 5.5 Update Plan
- Change `[~]` to `[x]` for completed task
- Append first 10 chars of commit hash

### 5.6 Commit Plan Update
```bash
fossil add scrummaster/
fossil commit -m "scrummaster(plan): Mark task '<task name>' complete"
```

## 6. Phase Verification

At end of each phase:
1. Run full test suite
2. Present manual verification steps to user
3. Ask for explicit confirmation: "Does this work as expected?"
4. Create checkpoint commit: `scrummaster(checkpoint): Phase <name> complete`, and attach the verification report as a fossil technote (`printf '%s' "<report>" | fossil wiki create "<hash>: verification report" - -t now --technote-tags "checkin:<hash>" -M text/x-markdown`)

## 7. Story Completion

When all tasks are done:
1. Verify every ACID ticket for this story is `Closed`: `fossil sql "SELECT tkt_uuid, acid, status FROM ticket WHERE story_id='<story_id>'"`
2. Update `scrummaster/epics.md`: change `## [~]` to `## [x]`
3. Ask user: "Story complete. Archive, Delete, or Keep the story folder?"
4. Announce completion

## Status Markers Reference

- `[ ]` - Pending
- `[~]` - In Progress
- `[x]` - Completed
