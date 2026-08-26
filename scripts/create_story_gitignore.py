#!/usr/bin/env python3
"""Auto-create .gitignore for new scrummaster stories.

This script generates .gitignore files for scrummaster story directories
with appropriate patterns for common development artifacts.
"""

import sys
from pathlib import Path

# Standard .gitignore patterns for scrummaster stories
TRACK_GITIGNORE = """# Scrummaster Story Artifacts
*.pyc
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
build/
develop-eggs/
dist/
downloads/
eggs/
.eggs/
lib/
lib64/
parts/
sdist/
var/
wheels/
*.egg-info/
.installed.cfg
*.egg

# Virtual environments
venv/
ENV/
env/
.venv

# IDE
.idea/
.vscode/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db

# Test artifacts
.pytest_cache/
.coverage
htmlcov/
.tox/

# Story-specific
*.log
*.tmp
.cache/

# Scrummaster state
setup_state.json
*.local.md
"""


def create_story_gitignore(story_dir: Path) -> Path:
    """Create .gitignore file in story directory.

    Args:
        story_dir: Path to story directory

    Returns:
        Path to created .gitignore file
    """
    gitignore_path = story_dir / ".gitignore"

    if gitignore_path.exists():
        print(f"[SKIP] {story_dir} - .gitignore already exists")
        return gitignore_path

    gitignore_path.write_text(TRACK_GITIGNORE)
    print(f"[CREATE] {story_dir}/.gitignore")

    return gitignore_path


def find_tracks(base_dir: Path) -> list[Path]:
    """Find all story directories.

    Args:
        base_dir: Base directory to search (scrummaster/stories)

    Returns:
        List of story directory paths
    """
    # Check for stories in base_dir
    if (base_dir / "stories").exists():
        tracks_dir = base_dir / "stories"
    elif base_dir.name == "stories":
        tracks_dir = base_dir
    else:
        tracks_dir = base_dir

    # Find all directories with plan.md (indicator of a story)
    stories = [item for item in tracks_dir.iterdir() if item.is_dir() and (item / "plan.md").exists()]

    # Also check archive subdirectory
    archive_dir = tracks_dir / "archive"
    if archive_dir.exists():
        stories.extend(item for item in archive_dir.iterdir() if item.is_dir() and (item / "plan.md").exists())

    return stories


def main() -> int:
    """Main entry point."""
    import argparse

    parser = argparse.ArgumentParser(description="Auto-create .gitignore files for scrummaster stories")
    parser.add_argument(
        "--dir",
        type=Path,
        default=Path("scrummaster/stories"),
        help="Base stories directory (default: scrummaster/stories)",
    )
    parser.add_argument(
        "--story",
        type=Path,
        help="Specific story directory to add .gitignore to",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be created without actually creating",
    )

    args = parser.parse_args()

    print("=" * 60)
    print("Auto-create .gitignore for Scrummaster Stories")
    print("=" * 60)

    # Single story mode if given, otherwise find all stories
    stories = [args.story] if args.story else find_tracks(args.dir)

    print(f"Stories directory: {args.dir}")
    print(f"Found {len(stories)} stories")
    print(f"Dry run: {args.dry_run}")
    print("=" * 60)

    if args.dry_run:
        print("\n[DRY RUN] Would create .gitignore for:")
        for story in stories:
            if not (story / ".gitignore").exists():
                print(f"  - {story}")
        return 0

    # Create .gitignore for each story
    created = 0
    skipped = 0

    for story in stories:
        if (story / ".gitignore").exists():
            skipped += 1
        else:
            create_story_gitignore(story)
            created += 1

    print("\n" + "=" * 60)
    print(f"Summary: Created {created} .gitignore files, Skipped {skipped} (already exist)")
    print("=" * 60)

    return 0


if __name__ == "__main__":
    sys.exit(main())
