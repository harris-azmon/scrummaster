# VCS Workflow Definition: Fossil (default)

This file defines the specific shell commands and their expected behaviors for
Scrummaster to use when operating within a Fossil repository. Each command includes
details about its execution, expected successful exit codes, and structured error
handlers for common failure scenarios. This is the **default** VCS workflow for
Scrummaster; see `git.md` for the git-workflow alternative.

Scrummaster defaults to **Cathedral-style, trunk-oriented** development: commits go
directly to `trunk`. There is no `create_branch`/`checkout_and_merge` pair in the
default command set below — everything commits forward on trunk. A project that
wants a branching workflow instead should say so explicitly during setup and switch
this file for a branching variant (out of scope for this pass).

---

## Command Definitions

### initialize_repository
# Purpose: Initializes a new Fossil repository file and opens a checkout in the
# current directory. Fossil separates "repository" (the .fossil database file,
# typically kept outside the working checkout) from "checkout" (the working
# directory) — unlike git's single .git folder, both steps are required.
command: fossil init {{repo_name}}.fossil && fossil open {{repo_name}}.fossil
success_code: 0
error_handlers:
  - exit_code: 1
    stderr_contains: "already exists"
    agent_action: "A Fossil repository file already exists here. Scrummaster will proceed, but no new repository was initialized."
  - exit_code: 1
    stderr_contains: "already open"
    agent_action: "A Fossil checkout is already open in this directory. Scrummaster will proceed without opening a new one."

### get_repository_status
# Purpose: Checks the status of the working checkout to detect uncommitted changes.
# Expected Output: A list of modified/added/deleted/unresolved files (one per line,
# prefixed with a status keyword). Empty (no EDITED/ADDED/etc. lines) if clean.
command: fossil changes
success_code: 0
error_handlers: []

### list_relevant_files
# Purpose: Lists all files tracked by Fossil.
# Expected Output: A list of file paths (one per line).
command: fossil ls
success_code: 0
error_handlers: []

### get_latest_commit_hash
# Purpose: Retrieves the full SHA3 (or SHA1, on older repos) hash of the current
# checkout.
# Expected Output: A single commit hash, parsed from the "checkout:" line of
# `fossil info`.
command: fossil info | awk '/^checkout:/ {print $2}'
success_code: 0
error_handlers:
  - exit_code: "*"
    stderr_contains: "not within an open checkout"
    agent_action: "Not inside an open Fossil checkout. Unable to retrieve a hash."

### get_changed_files_since
# Purpose: Lists all files that have changed between a specified commit and the
# current checkout.
# Placeholders:
#   - {{hash}}: The starting commit hash to compare against.
# Expected Output: A list of file paths that have changed (one per line).
command: fossil diff --from {{hash}} --to current --brief
success_code: 0
error_handlers:
  - exit_code: 1
    stderr_contains: "not found"
    agent_action: "The provided hash '{{hash}}' is not a valid check-in in this repository."

### store_commit_metadata
# Purpose: Attaches a detailed note (task summary or phase verification report) to
# a commit. Fossil has no direct equivalent of `git notes` (a note attached
# in-place to a specific commit); the closest native constructs are technotes
# (timestamped events, not commit-attached) and check-in comments. Scrummaster uses
# a **technote tagged with the commit hash** so the note is still discoverable from
# the commit via `fossil tag find` / `fossil technote list`.
# Placeholders:
#   - {{hash}}: The hash of the commit to annotate.
#   - {{message}}: The detailed summary/report to attach.
command: fossil technote create --mimetype text/x-markdown -m "{{message}}" --tag "checkin:{{hash}}"
success_code: 0
error_handlers:
  - exit_code: "*"
    agent_action: "Failed to create the technote for commit '{{hash}}'. This might indicate the repository isn't open, or a permissions issue."

### get_commit_metadata
# Purpose: Retrieves the technote(s) attached to a specific commit hash via its tag.
# Placeholders:
#   - {{hash}}: The commit hash to search for.
# Expected Output: The technote content if found, otherwise empty.
command: fossil technote list --tag "checkin:{{hash}}"
success_code: 0
error_handlers:
  - exit_code: 1
    agent_action: "No technote found for commit hash '{{hash}}'."

### revert_commit
# Purpose: Undoes the changes introduced by a specific historical commit, as a new
# forward commit. Fossil has **no direct equivalent of `git revert`** — there is no
# porcelain command that takes an arbitrary past check-in and produces a new
# check-in undoing it. (`fossil revert` instead discards *uncommitted* local edits
# back to the last checkout — a different operation entirely.) The supported
# workaround is to generate the inverse diff and apply it as a new commit:
# Placeholders:
#   - {{hash}}: The hash of the commit to revert.
#   - {{parent_hash}}: The hash of {{hash}}'s parent (get via `fossil info {{hash}}`
#     and read the "parent:" line; for a merge commit, ask the user which parent to
#     revert against, mirroring git's `-m` requirement).
command: fossil diff --from {{hash}} --to {{parent_hash}} | fossil patch apply -
success_code: 0
error_handlers:
  - exit_code: 1
    stderr_contains: "does not apply"
    agent_action: "The inverse patch for commit '{{hash}}' did not apply cleanly (the working checkout has diverged too far). Resolve the conflicting hunks manually, then run `fossil commit` to finalize the revert."
  - exit_code: 1
    stderr_contains: "unknown check-in"
    agent_action: "The commit hash '{{hash}}' was not found in the repository history. The revert could not be started."
  - exit_code: "*"
    stderr_contains: "merge"
    agent_action: "The commit '{{hash}}' is a merge check-in. Ask the user which parent to revert against (mirrors git's 'revert -m <parent-number>'), then re-run with the chosen {{parent_hash}}."
# After a successful apply, finalize with: fossil commit -m "revert: <original message>"

### get_commit_history_for_file
# Purpose: Retrieves the commit history for a specific file.
# Placeholders:
#   - {{file}}: The path to the file to get the history for.
# Expected Output: The standard `fossil finfo` output for the specified file.
command: fossil finfo {{file}}
success_code: 0
error_handlers:
  - exit_code: 1
    stderr_contains: "not found"
    agent_action: "The file path '{{file}}' is ambiguous or does not exist in this checkout."

### search_commit_history
# Purpose: Searches the entire commit history for commits whose messages match a
# specific pattern.
# Placeholders:
#   - {{pattern}}: The pattern to search for in commit comments.
# Expected Output: The standard `fossil timeline` output for any matching commits.
command: fossil timeline --grep "{{pattern}}"
success_code: 0
error_handlers: []

### create_ticket
# Purpose: Creates a fossil ticket for one ACID (used by scrummaster-new-story;
# see templates/fossil/ticket_schema.txt for the field schema this assumes).
# Placeholders:
#   - {{epic_id}}, {{story_id}}, {{acid}}, {{title}}
command: fossil ticket add type Story epic_id "{{epic_id}}" story_id "{{story_id}}" acid "{{acid}}" status Open title "{{title}}"
success_code: 0
error_handlers: []

### close_ticket
# Purpose: Marks one ACID's ticket as done (used by scrummaster-implement on task
# completion).
# Placeholders:
#   - {{ticket_id}}
command: fossil ticket change {{ticket_id}} status Closed
success_code: 0
error_handlers: []
