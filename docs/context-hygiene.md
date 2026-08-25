# Context Hygiene & Memory Safety

This guide defines a minimal, repeatable context bundle for Scrummaster projects and safe practices to prevent context drift.

## Canonical Context Bundle

Include these files by default:
- `scrummaster/product.md`
- `scrummaster/product-guidelines.md` (if present)
- `scrummaster/tech-stack.md`
- `scrummaster/workflow.md`
- `scrummaster/epics.md`
- `scrummaster/code_styleguides/*` (only active languages)
- Current story:
  - `scrummaster/epics/<epic_id>/stories/<story_id>/spec.md`
  - `scrummaster/epics/<epic_id>/stories/<story_id>/plan.md`
  - `scrummaster/epics/<epic_id>/stories/<story_id>/metadata.json`

## Default Exclusions

Exclude these unless explicitly needed:
- `scrummaster/epics/*/stories/archive/**`
- `.fslckout`, `_FOSSIL_`, `.git/**`, `.hg/**`, `.svn/**`
- `.agent/**` (generated workflows/skills)
- `node_modules/**`, `dist/**`, `build/**`, `.venv/**`, `.tox/**`, `.mypy_cache/**`
- Large lockfiles or dependency caches

## Size Thresholds (Guidance)

- **Warn:** file > 250 KB, total bundle > 2 MB
- **Block:** file > 1 MB, total bundle > 5 MB

## Safe Memory Practices

- Prefer linking to large files rather than inlining them in context.
- Keep the active story small; move completed work to `archive/`.
- Summarize long discussions into story notes or concise bullet lists, and
  attach the summary as a Fossil technote for the story.
- Avoid committing generated artifacts to the context bundle.

## Tooling

Run the context report to spot oversized files:

```bash
python scripts/context_report.py
```

You can override thresholds:

```bash
python scripts/context_report.py --warn-file-kb 200 --warn-total-kb 1500
```
