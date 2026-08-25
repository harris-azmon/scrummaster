---
description: Fossil-aware revert of stories, phases, or tasks (forward inverse-patch commits)
argument-hint: [story|phase|task]
---

# Scrummaster Revert

Revert Scrummaster work: $ARGUMENTS

Fossil treats synced history as append-only — there is no `git reset --hard`
equivalent. Every revert below is a **new forward commit** built from an inverse
patch (see `templates/vcs_workflows/fossil.md` → `revert_commit`).

## 1. Check Setup

If `scrummaster/epics.md` doesn't exist, tell user to run `/scrummaster-setup` first.

## 2. Identify Target

**If `$ARGUMENTS` provided:**
- Parse to identify story, phase, or task name
- Find it in `scrummaster/epics.md` or relevant `plan.md`

**If no arguments:**
Show menu of recent revertible items:

```
## What would you like to revert?

### In Progress Items
1. [~] Task: "Add user authentication" (story: auth_20260825)
2. [~] Phase: "Backend API" (story: auth_20260825)

### Recently Completed
3. [x] Task: "Create login form" (a1b2c3d4e5)
4. [x] Task: "Add validation" (f6a7b8c9d0)

Enter number or describe what to revert:
```

Prioritize showing in-progress items first, then recently completed.

## 3. Find Associated Commits and ACID Tickets

For the selected item:

1. Read the relevant `plan.md` file
2. Extract commit hashes from completed tasks (the hash after `[x]`)
3. Find implementation commits
4. Find corresponding plan-update commits
5. Identify the ACID ticket(s) tied to this item (`fossil ticket list story_id "<story_id>"`) — they'll be reopened

**For story revert:** Also find the commit that added the story to `epics.md` (`fossil finfo scrummaster/epics.md`)

## 4. Present Revert Plan

```
## Revert Plan

**Target:** [Task/Phase/Story] - "[Description]"

**Commits to revert (newest first, inverse patch each):**
1. f6a7b8c9d0 - scrummaster(plan): Mark task complete
2. a1b2c3d4e5 - feat(auth): Add login form

**ACID tickets to reopen:** <ticket_id> (<acid>)

**Action:** For each commit, generate an inverse patch and apply it as a new commit

Proceed? (yes/no)
```

Wait for explicit user confirmation.

## 5. Execute Revert

For each commit, newest to oldest:
```bash
fossil diff --from <hash> --to <parent_of_hash> | fossil patch apply -
fossil commit -m "revert: <original message>"
```

Then reopen affected tickets:
```bash
fossil ticket change <ticket_id> status Open
```

**If a patch fails to apply cleanly:**
1. Stop and inform user
2. Show conflicting files
3. Guide through manual resolution, then `fossil commit` once resolved

## 6. Update Plan State

After successful revert:
- Change `[x]` back to `[ ]` for reverted tasks
- Change `[~]` back to `[ ]` if reverting in-progress items
- Remove commit hashes from reverted task lines

## 7. Announce Completion

"Reverted [target]. Plan updated, ACID tickets reopened. Status markers reset to pending."
