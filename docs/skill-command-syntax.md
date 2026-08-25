# Command Syntax by Tool

This document summarizes the command invocation style and artifact type used by each tool.
The canonical schema is `skills/manifest.schema.json`, and the data source is `skills/manifest.json`.

## Tool Matrix (Generated)

<!-- BEGIN: TOOL-MATRIX -->
| Tool | Artifact Type / Location | Command Style | Example |
| --- | --- | --- | --- |
| gemini | `commands/scrummaster/*.toml` | `slash-colon` | `/scrummaster:setup` |
| qwen | `commands/scrummaster/*.toml` | `slash-colon` | `/scrummaster:setup` |
| claude | `.claude/commands/*.md and .claude-plugin/*` | `slash-dash` | `/scrummaster-setup` |
| codex | `~/.codex/skills/<skill>/SKILL.md` | `dollar-dash` | `$scrummaster-setup` |
| opencode | `~/.config/opencode/skills/<skill>/SKILL.md` | `slash-dash` | `/scrummaster-setup` |
| antigravity | `.agent/workflows/<skill>.md and ~/.gemini/antigravity/global_workflows/<skill>.md` | `at-mention + slash` | `@scrummaster /setup` |
| copilot | `~/.config/github-copilot/scrummaster.md` | `slash-dash` | `/scrummaster-setup` |
| aix | `~/.config/aix/scrummaster.md` | `slash-dash` | `/scrummaster-setup` |
| skillshare | `~/.config/skillshare/skills/<skill>/SKILL.md` | `slash-dash` | `/scrummaster-setup` |
<!-- END: TOOL-MATRIX -->
## Notes

- The single source of truth for command syntax is `skills/manifest.json`.
- If a tool behaves differently in your environment, update the manifest and regenerate outputs.
- The tool matrix above is generated via `scripts/render_command_matrix.py`.
- Antigravity workflows are the default output; optional skills output can be emitted to `.agent/skills/<skill>/SKILL.md` and `~/.gemini/antigravity/skills/<skill>/SKILL.md` via `--emit-skills`.
