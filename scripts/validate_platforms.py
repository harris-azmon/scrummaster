import os
import sys

from conductor_core.validation import ValidationService


def sync_platforms() -> None:
    base_dir = os.getcwd()
    core_templates = os.path.join(base_dir, "conductor-core/src/conductor_core/templates")
    service = ValidationService(core_templates)

    # Gemini CLI TOML commands (commands/conductor/*.toml) and the Claude Code
    # .claude/commands/*.md mirror were retired when this repo adopted upstream's
    # agent-plugin restructure: skills/*/SKILL.md is now the single portable
    # source of command content, not something synchronized per-tool from these
    # core templates. Both mapping tables are intentionally empty.
    gemini_mappings: dict[str, str] = {}
    claude_mappings: dict[str, str] = {}

    for path, template in gemini_mappings.items():
        service.synchronize_gemini_toml(path, template)

    for path, template in claude_mappings.items():
        service.synchronize_claude_md(path, template)


def run_validation() -> None:
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument("--sync", action="store_true", help="Synchronize platform files from core templates")
    args = parser.parse_args()

    base_dir = os.getcwd()
    core_templates = os.path.join(base_dir, "conductor-core/src/conductor_core/templates")
    service = ValidationService(core_templates)

    # Gemini CLI TOML commands (commands/conductor/*.toml) and the Claude Code
    # .claude/commands/*.md mirror were retired when this repo adopted upstream's
    # agent-plugin restructure: skills/*/SKILL.md is now the single portable
    # source of command content, not something synchronized per-tool from these
    # core templates. Both mapping tables are intentionally empty.
    gemini_mappings: dict[str, str] = {}
    claude_mappings: dict[str, str] = {}

    all_valid = True

    for path, template in gemini_mappings.items():
        if args.sync:
            _success, _msg = service.synchronize_gemini_toml(path, template)
        else:
            valid, _msg = service.validate_gemini_toml(path, template)
            if not valid:
                all_valid = False

    for path, template in claude_mappings.items():
        if args.sync:
            _success, _msg = service.synchronize_claude_md(path, template)
        else:
            valid, _msg = service.validate_claude_md(path, template)
            if not valid:
                all_valid = False

    if not all_valid:
        sys.exit(1)
    else:
        pass


if __name__ == "__main__":
    run_validation()
