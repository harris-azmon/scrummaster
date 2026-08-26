---
description: Create a new epic to group related stories
argument-hint: [description]
---

# Scrummaster New Epic

Create a new epic for: $ARGUMENTS

## 1. Verify Setup

Check these files exist:

- `scrummaster/product.md`
- `scrummaster/tech-stack.md`
- `scrummaster/workflow.md`

If missing, tell user to run `/scrummaster-setup` first.

## 2. Get Epic Description

- If `$ARGUMENTS` provided, use it
- Otherwise ask: "What area of work does this epic cover?"

## 3. Draft Epic Overview

Ask 2-3 questions (goal, scope, out-of-scope boundary, rough anticipated stories). Generate `epic.md` with: Goal, Scope, Out of Scope, Anticipated Stories.

Present for approval, revise if needed.

## 4. Create Epic Artifacts

1. Generate epic ID: `shortname_YYYYMMDD` (use today's date)
2. Create directory: `scrummaster/epics/<epic_id>/stories/`
3. Write `scrummaster/epics/<epic_id>/epic.md`

## 5. Update Epics Index

Append to `scrummaster/epics.md`:

```markdown

---

## [ ] Epic: [Description]
*Link: [scrummaster/epics/<epic_id>/](scrummaster/epics/<epic_id>/)*
```

Re-sync the wiki mirror: `fossil wiki commit Epics scrummaster/epics.md`.

## 6. Announce

"Epic `<epic_id>` created. Run `/scrummaster-newstory` to add its first story."
