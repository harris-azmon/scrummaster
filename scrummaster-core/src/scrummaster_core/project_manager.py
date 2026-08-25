from __future__ import annotations

import contextlib
import hashlib
import json
import os
import re
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from .models import Story, StoryStatus


class ProjectManager:
    def __init__(self, base_path: str | Path = ".") -> None:
        self.base_path = Path(base_path)
        self.scrummaster_path = self.base_path / "scrummaster"

    def initialize_project(self, goal: str) -> None:
        """Initializes the scrummaster directory and base files."""
        if not self.scrummaster_path.exists():
            self.scrummaster_path.mkdir(parents=True)

        state_file = self.scrummaster_path / "setup_state.json"
        if not state_file.exists():
            state_file.write_text(json.dumps({"last_successful_step": ""}))

        product_file = self.scrummaster_path / "product.md"
        if not product_file.exists():
            product_file.write_text(f"# Product Context\n\n## Initial Concept\n{goal}\n")

        stories_file = self.scrummaster_path / "stories.md"
        if not stories_file.exists():
            stories_file.write_text("# Project Stories\n\nThis file indexes all stories for the project.\n")

        # Create basic placeholders for other required files if they don't exist
        for filename in ["tech-stack.md", "workflow.md"]:
            f = self.scrummaster_path / filename
            if not f.exists():
                f.write_text(f"# {filename.split('.')[0].replace('-', ' ').title()}\n")

    def create_story(self, description: str) -> str:
        """Initializes a new story directory and metadata."""
        if not self.scrummaster_path.exists():
            self.scrummaster_path.mkdir(parents=True)

        stories_file = self.scrummaster_path / "stories.md"
        if not stories_file.exists():
            stories_file.write_text("# Project Stories\n\nThis file indexes all stories for the project.\n")

        # Robust ID generation: sanitized description + short hash of desc and timestamp
        sanitized = re.sub(r"[^a-z0-9]", "_", description.lower())[:30].strip("_")
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        hash_input = f"{description}{timestamp}".encode()
        # Use sha256 for security compliance, or md5 with noqa if speed is critical
        short_hash = hashlib.sha256(hash_input).hexdigest()[:8]

        story_id = f"{sanitized}_{short_hash}"

        story_dir = self.scrummaster_path / "stories" / story_id
        story_dir.mkdir(parents=True, exist_ok=True)

        story = Story(
            story_id=story_id,
            description=description,
            status=StoryStatus.NEW,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )

        (story_dir / "metadata.json").write_text(story.model_dump_json(indent=2))

        # Append to stories.md with separator and modern format
        with stories_file.open("a", encoding="utf-8") as f:
            f.write(f"\n---\n\n- [ ] **Story: {description}**\n")
            f.write(f"*Link: [./scrummaster/stories/{story_id}/](./scrummaster/stories/{story_id}/)*\n")
        return story_id

    def acquire_lock(self, timeout: int = 30) -> bool:
        """Acquire a file-based lock to prevent concurrent access."""
        lock_file = self.scrummaster_path / ".lock"
        start_time = time.time()

        while time.time() - start_time < timeout:
            try:
                # Try to create the lock file exclusively
                fd = os.open(lock_file, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
                try:
                    # Write PID and timestamp to the lock file
                    os.write(fd, f"{os.getpid()}\n{time.time()}".encode())
                    os.close(fd)
                    return True
                except Exception:
                    os.close(fd)
                    # Clean up the file if write failed
                    with contextlib.suppress(OSError):
                        os.unlink(lock_file)
                    return False
            except OSError:
                # Lock file already exists, wait and retry
                time.sleep(0.1)

        # Timeout reached
        return False

    def release_lock(self) -> bool:
        """Release the file-based lock."""
        lock_file = self.scrummaster_path / ".lock"
        try:
            lock_file.unlink()
            return True
        except OSError:
            # Lock file doesn't exist or can't be removed
            return False

    def is_locked(self) -> bool:
        """Check if the project is currently locked."""
        lock_file = self.scrummaster_path / ".lock"
        return lock_file.exists()

    def get_status_report(self) -> str:
        """Generates a detailed status report of all stories."""
        stories_file = self.scrummaster_path / "stories.md"
        if not stories_file.exists():
            raise FileNotFoundError("Project stories file not found.")

        active_stories = self._parse_stories_file(stories_file)
        archived_stories = self._get_archived_stories()

        report = [
            "## Project Status Report",
            f"Date: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')} UTC",
            "",
            "### Active Stories",
        ]

        total_tasks = 0
        completed_tasks = 0

        if not active_stories:
            report.append("No active stories.")
        for story_id, desc, status_char in active_stories:
            story_report, t, c = self._get_story_summary(story_id, desc, is_archived=False, status_char=status_char)
            report.append(story_report)
            total_tasks += t
            completed_tasks += c

        report.append("\n### Archived Stories")
        if not archived_stories:
            report.append("No archived stories.")
        for story_id, desc in archived_stories:
            story_report, t, c = self._get_story_summary(story_id, desc, is_archived=True)
            report.append(story_report)
            total_tasks += t
            completed_tasks += c

        percentage = (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0

        summary_header = [
            "\n---",
            "### Overall Progress",
            f"Tasks: {completed_tasks}/{total_tasks} ({percentage:.1f}%)",
            "",
        ]

        return "\n".join(report + summary_header)

    def update_story_metadata(self, story_id: str, updates: dict[str, Any]) -> dict[str, Any]:
        """Merge updates into a story's metadata.json and return the result."""
        story_dir = self.scrummaster_path / "stories" / story_id
        metadata_path = story_dir / "metadata.json"
        if not metadata_path.exists():
            raise FileNotFoundError(f"metadata.json not found for story {story_id}")

        metadata = json.loads(metadata_path.read_text(encoding="utf-8"))

        def _merge(target: dict[str, Any], incoming: dict[str, Any]) -> dict[str, Any]:
            for key, value in incoming.items():
                if isinstance(value, dict) and isinstance(target.get(key), dict):
                    target[key] = _merge(target[key], value)
                else:
                    target[key] = value
            return target

        metadata = _merge(metadata, updates)
        metadata["updated_at"] = datetime.now(timezone.utc).isoformat()
        metadata_path.write_text(json.dumps(metadata, indent=2))
        return metadata

    def _parse_stories_file(self, stories_file: Path) -> list[tuple[str, str, str]]:
        """Parses stories.md for active stories."""
        content = stories_file.read_text(encoding="utf-8")
        stories: list[tuple[str, str, str]] = []
        # Flexible pattern for legacy (## [ ] Story:) and modern (- [ ] **Story:) formats
        # Link line format: *Link: [./scrummaster/stories/story_id/](./scrummaster/stories/story_id/)*
        pattern = r"(?:##|[-])\s*\[\s*([ xX~]?)\s*\]\s*(?:\*\*)?Story:\s*(.*?)\r?\n\*Link:\s*\[.*?/stories/(.*?)/\].*?\*"
        for match in re.finditer(pattern, content):
            status_char, desc, story_id = match.groups()
            stories.append((story_id.strip(), desc.strip().strip("*"), status_char.strip()))
        return stories

    def _get_archived_stories(self) -> list[tuple[str, str]]:
        """Lists stories in the archive directory."""
        archive_dir = self.scrummaster_path / "archive"
        if not archive_dir.exists():
            return []

        archived: list[tuple[str, str]] = []
        for d in archive_dir.iterdir():
            if d.is_dir():
                metadata_file = d / "metadata.json"
                if metadata_file.exists():
                    try:
                        meta = json.loads(metadata_file.read_text(encoding="utf-8"))
                        archived.append((d.name, meta.get("description", d.name)))
                    except json.JSONDecodeError:
                        archived.append((d.name, d.name))
        return archived

    def _get_story_summary(
        self, story_id: str, description: str, *, is_archived: bool = False, status_char: str | None = None
    ) -> tuple[str, int, int]:
        """Returns (formatted_string, total_tasks, completed_tasks) for a story."""
        base = "archive" if is_archived else "stories"
        plan_file = self.scrummaster_path / base / story_id / "plan.md"

        if not plan_file.exists():
            return f"- **{description}** ({story_id}): No plan.md found", 0, 0

        content = plan_file.read_text(encoding="utf-8")
        tasks = 0
        completed = 0

        # Match - [ ] or - [x] or - [~]
        for line in content.splitlines():
            if re.match(r"^\s*-\s*\[.\]", line):
                tasks += 1
                if "[x]" in line or "[X]" in line or "[~]" in line:
                    completed += 1

        percentage = (completed / tasks * 100) if tasks > 0 else 0
        full_percentage = 100

        if status_char:
            status = "COMPLETED" if status_char.lower() == "x" else "IN_PROGRESS" if status_char == "~" else "PENDING"
        else:
            status = "COMPLETED" if percentage == full_percentage else "IN_PROGRESS" if completed > 0 else "PENDING"

        return (
            f"- **{description}** ({story_id}): {completed}/{tasks} tasks completed ({percentage:.1f}%) [{status}]",
            tasks,
            completed,
        )
