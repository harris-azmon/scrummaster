---
description: Display current Scrummaster project progress
---

# Scrummaster Status

Show the current status of this Scrummaster project.

## 1. Check Setup

If `scrummaster/epics.md` doesn't exist, tell user to run `/scrummaster-setup` first.

## 2. Read State

- Refresh from fossil first — it is authoritative: `fossil ticket list`
- Read `scrummaster/epics.md`
- List all story directories: `scrummaster/epics/*/stories/*/`
- Read each `scrummaster/epics/<epic_id>/stories/<story_id>/plan.md`

## 3. Calculate Progress

For each story:
- Count total tasks (lines with `- [ ]`, `- [~]`, `- [x]`)
- Count completed `[x]`
- Count in-progress `[~]`
- Count pending `[ ]`
- Calculate percentage: (completed / total) * 100
- Cross-check against this story's ACID tickets: `fossil ticket list story_id "<story_id>"` — count `Closed` vs total

## 4. Present Summary

Format the output like this:

```
## Scrummaster Status

**Active Story:** [story name] ([completed]/[total] tasks - [percent]%, [acids_closed]/[acids_total] ACIDs)
**Overall Status:** In Progress | Complete | No Active Stories

### Epics
- Epic: [name] — [x]/[total] stories
  - [x] Story: ... (100% complete)
  - [~] Story: ... (45% complete) ← ACTIVE
  - [ ] Story: ... (0% - not started)

### Current Task
[The task marked with [~] in the active story's plan.md]

### Next Action
[The next task marked with [ ] in the active story's plan.md]

### Recent Completions
[Last 3 tasks marked [x] with their commit hashes]
```

## 5. Suggestions

Based on status:
- If no stories: "Run `/scrummaster-newstory` to create your first story"
- If no epics: "Run `/scrummaster-newepic` to create your first epic"
- If story in progress: "Run `/scrummaster-implement` to continue"
- If all complete: "All stories complete! Run `/scrummaster-newstory` for new work"
