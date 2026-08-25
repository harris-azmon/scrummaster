import os
import sys

from scrummaster_core.validation import ValidationService


def sync_platforms() -> None:
    base_dir = os.getcwd()
    core_templates = os.path.join(base_dir, "scrummaster-core/src/scrummaster_core/templates")
    service = ValidationService(core_templates)

    # Gemini TOMLs
    gemini_mappings = {
        "commands/scrummaster/scrummaster.toml": "scrummaster.j2",
        "commands/scrummaster/setup.toml": "setup.j2",
        "commands/scrummaster/newstory.toml": "new_story.j2",
        "commands/scrummaster/implement.toml": "implement.j2",
        "commands/scrummaster/status.toml": "status.j2",
        "commands/scrummaster/revert.toml": "revert.j2",
    }

    # NOTE: .claude/ is intentionally excluded from sync — it stays untouched
    # and still "conductor"-branded by explicit product decision; it must
    # never be overwritten with scrummaster templates.

    for path, template in gemini_mappings.items():
        service.synchronize_gemini_toml(path, template)


def run_validation() -> None:
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument("--sync", action="store_true", help="Synchronize platform files from core templates")
    args = parser.parse_args()

    base_dir = os.getcwd()
    core_templates = os.path.join(base_dir, "scrummaster-core/src/scrummaster_core/templates")
    service = ValidationService(core_templates)

    # Gemini TOMLs
    gemini_mappings = {
        "commands/scrummaster/scrummaster.toml": "scrummaster.j2",
        "commands/scrummaster/setup.toml": "setup.j2",
        "commands/scrummaster/newstory.toml": "new_story.j2",
        "commands/scrummaster/implement.toml": "implement.j2",
        "commands/scrummaster/status.toml": "status.j2",
        "commands/scrummaster/revert.toml": "revert.j2",
    }

    # NOTE: .claude/ is intentionally excluded from sync — it stays untouched
    # and still "conductor"-branded by explicit product decision; it must
    # never be overwritten with scrummaster templates.

    all_valid = True

    for path, template in gemini_mappings.items():
        if args.sync:
            _success, _msg = service.synchronize_gemini_toml(path, template)
        else:
            valid, _msg = service.validate_gemini_toml(path, template)
            if not valid:
                all_valid = False

    if not all_valid:
        sys.exit(1)
    else:
        pass


if __name__ == "__main__":
    run_validation()
