# Artifact Validation Troubleshooting

## Common Drift Cases

### Missing SKILL.md outputs
- Run `python3 scripts/sync_skills.py` to regenerate `skills/` and `.antigravity/skills/`.

### Antigravity workflows mismatched
- Regenerate workflows with `python3 scripts/sync_skills.py`.
- For global workflows, re-run `python3 scripts/install_local.py --sync-workflows`.

### Platform mapping drift (Claude/Gemini/Qwen)
- Re-sync from core templates: `python3 scripts/validate_platforms.py --sync`.
- Note: `.claude/` is intentionally excluded from this sync — it stays untouched.

### Global Antigravity checks fail in CI
- Global workflow checks are optional. Use `--check-global` only on machines with `~/.gemini/antigravity/global_workflows/` configured.
