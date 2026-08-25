# Setup & New Story UX Guide

This guide documents the canonical setup and new-story experience across adapters.

## Setup (Greenfield)

1. Run setup:
   - Gemini/Qwen: `/scrummaster:setup`
   - Claude/Codex/OpenCode: `/scrummaster-setup` or `$scrummaster-setup`
2. Scrummaster creates:
   - `scrummaster/product.md`, `product-guidelines.md`, `tech-stack.md`
   - `scrummaster/workflow.md`, `scrummaster/epics.md`, `scrummaster/setup_state.json`
   - `scrummaster/epics/<epic_id>/stories/<story_id>/{spec.md,plan.md,metadata.json,index.md}`
   - A Fossil ticket per ACID

## Setup (Brownfield)

Scrummaster detects existing code, scans relevant files, and documents the existing tech stack without proposing changes.

## New Epic and New Story

Example:
```bash
/scrummaster:newepic "Billing"
/scrummaster:newstory "Add billing dashboard"
```

Expected artifacts:
- `scrummaster/epics/<epic_id>/stories/<story_id>/spec.md`
- `scrummaster/epics/<epic_id>/stories/<story_id>/plan.md`
- `scrummaster/epics/<epic_id>/stories/<story_id>/metadata.json`
- `scrummaster/epics/<epic_id>/stories/<story_id>/index.md`
- Story entry appended to `scrummaster/epics.md`
- One Fossil ticket per ACID in `spec.md`

## Metadata Fields

```json
{
  "story_id": "<story_id>",
  "epic_id": "<epic_id>",
  "type": "feature",
  "status": "new",
  "created_at": "YYYY-MM-DDTHH:MM:SSZ",
  "updated_at": "YYYY-MM-DDTHH:MM:SSZ",
  "description": "Add billing dashboard"
}
```

## Adapter Command Mapping

See `docs/skill-command-syntax.md` for the per-tool command syntax.

## Troubleshooting

- **Setup resumes unexpectedly:** Check `scrummaster/setup_state.json` and reset `last_successful_step` if you need to restart.
- **Story ID collision:** If a short name already exists, choose a different description or resume the existing story.
- **Missing metadata.json:** Ensure the story directory is writable and re-run `/scrummaster:newstory`.
- **Files not appearing in UI:** Verify the adapter's workflow/skill location and rerun sync scripts.
- **Fossil ticket not created:** Confirm the repo has an open Fossil checkout (`fossil info`) and that `templates/fossil/ticket_schema.sql` has been applied.
