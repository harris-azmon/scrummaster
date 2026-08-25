from __future__ import annotations

import re
import shutil
from pathlib import Path
from typing import TYPE_CHECKING

from .fossil_service import FossilService
from .git_service import GitService
from .models import CapabilityContext, PlatformCapability, TaskStatus
from .parser import MarkdownParser
from .vcs_adapters import JujutsuService

if TYPE_CHECKING:
    from .project_manager import ProjectManager

VcsAdapter = GitService | JujutsuService | FossilService


class TaskRunner:
    def __init__(
        self,
        project_manager: ProjectManager,
        git_service: GitService | None = None,
        capability_context: CapabilityContext | None = None,
    ) -> None:
        self.pm = project_manager
        self.capabilities = capability_context or CapabilityContext()
        self.vcs: VcsAdapter | None

        if git_service is not None:
            self.vcs = git_service
        elif capability_context is not None and not self.capabilities.has_capability(PlatformCapability.VCS):
            self.vcs = None
        else:
            # Discover which VCS system is in use and select appropriate adapter
            self.vcs = self._discover_and_select_vcs_adapter(str(self.pm.base_path))

    @property
    def git(self) -> VcsAdapter | None:
        """Backward compatibility property for git attribute."""
        return self.vcs

    @git.setter
    def git(self, value: VcsAdapter | None) -> None:
        """Backward compatibility setter for git attribute."""
        self.vcs = value

    def _discover_and_select_vcs_adapter(self, repo_path: str) -> VcsAdapter:
        """Discover the VCS system in use and return the appropriate adapter."""
        repo_path_obj = Path(repo_path)

        # Check for Jujutsu first (JJ repo)
        jj_config = repo_path_obj / ".jj"
        if jj_config.exists():
            return JujutsuService(repo_path)

        # Check for Fossil (open checkout marker file) — Scrummaster's default VCS
        fossil_indicator = repo_path_obj / ".fslckout"
        fossil_indicator_alt = repo_path_obj / "_FOSSIL_"
        if fossil_indicator.exists() or fossil_indicator_alt.exists():
            return FossilService(repo_path)

        # Check for Git (standard .git directory or file)
        git_indicator = repo_path_obj / ".git"
        if git_indicator.exists():
            return GitService(repo_path)

        # If no local VCS marker is found, fall through to GitService — its
        # GitPython backend searches parent directories for a repository,
        # which FossilService has no equivalent for.
        return GitService(repo_path)

    def get_story_to_implement(self, description: str | None = None) -> tuple[str, str, str]:
        """Selects a story to implement, either by description or the next pending one."""
        stories_file = self.pm.scrummaster_path / "stories.md"
        if not stories_file.exists():
            raise FileNotFoundError("stories.md not found")

        # Accessing protected member for parsing logic
        active_stories = self.pm._parse_stories_file(stories_file)  # noqa: SLF001
        if not active_stories:
            raise ValueError("No active stories found in stories.md")

        if description:
            # Try to match by description
            for story_id, desc, status_char in active_stories:
                if description.lower() in desc.lower():
                    return story_id, desc, status_char
            raise ValueError(f"No story found matching description: {description}")

        # Return the first one (assuming it's pending/next)
        return active_stories[0]

    def update_story_status(self, story_id: str, status: str) -> None:
        """Updates the status of a story in stories.md (e.g., [ ], [~], [x])."""
        stories_file = self.pm.scrummaster_path / "stories.md"
        content = stories_file.read_text()

        # We need to find the specific story by its link and update the preceding checkbox
        escaped_id = re.escape(story_id)
        # Match from (##|[-]) [ ] (**)Story: ... until the link with story_id
        pattern = rf"((?:##|[-])\s*\[)[ xX~]?(\]\s*(?:\*\*)?Story:.*?\r?\n\*Link:\s*\[.*?/stories/{escaped_id}/\].*?\*)"

        new_content, count = re.subn(pattern, rf"\1{status}\2", content, flags=re.MULTILINE)
        if count == 0:
            raise ValueError(f"Could not find story {story_id} in stories.md to update status")

        stories_file.write_text(new_content)

    def update_task_status(
        self, story_id: str, task_description: str, status: str, commit_sha: str | None = None
    ) -> None:
        """Updates a specific task's status in the story's plan.md."""
        plan_file = self.pm.scrummaster_path / "stories" / story_id / "plan.md"
        if not plan_file.exists():
            raise FileNotFoundError(f"plan.md not found for story {story_id}")

        content = plan_file.read_text()

        # Parse the plan using structured parsing
        plan = MarkdownParser.parse_plan(content)

        # Find and update the task
        task_updated = False
        for phase in plan.phases:
            for task in phase.tasks:
                if task_description.lower() in task.description.lower():
                    # Map status string to TaskStatus enum
                    if status == "x":
                        task.status = TaskStatus.COMPLETED
                    elif status == "~":
                        task.status = TaskStatus.IN_PROGRESS
                    elif status == " ":
                        task.status = TaskStatus.PENDING

                    if commit_sha:
                        task.commit_sha = commit_sha
                    task_updated = True
                    break
            if task_updated:
                break

        if not task_updated:
            raise ValueError(f"Could not find task '{task_description}' in plan.md")

        # Serialize back to markdown
        new_content = MarkdownParser.serialize_plan(plan)
        plan_file.write_text(new_content)

    def checkpoint_phase(self, story_id: str, phase_name: str, commit_sha: str) -> None:
        """Updates a phase with a checkpoint SHA in plan.md."""
        plan_file = self.pm.scrummaster_path / "stories" / story_id / "plan.md"
        if not plan_file.exists():
            raise FileNotFoundError(f"plan.md not found for story {story_id}")

        content = plan_file.read_text()

        # Parse the plan using structured parsing
        plan = MarkdownParser.parse_plan(content)

        # Find and update the phase
        phase_updated = False
        for phase in plan.phases:
            if phase_name.lower() in phase.name.lower():
                phase.checkpoint_sha = commit_sha
                phase_updated = True
                break

        if not phase_updated:
            raise ValueError(f"Could not find phase '{phase_name}' in plan.md")

        # Serialize back to markdown
        new_content = MarkdownParser.serialize_plan(plan)
        plan_file.write_text(new_content)

    def revert_task(self, story_id: str, task_description: str) -> None:
        """Resets a task status to pending in plan.md."""
        self.update_task_status(story_id, task_description, " ")

    def archive_story(self, story_id: str) -> None:
        """Moves a story from stories/ to archive/ and removes it from stories.md."""
        story_dir = self.pm.scrummaster_path / "stories" / story_id
        archive_dir = self.pm.scrummaster_path / "archive"

        if not story_dir.exists():
            raise FileNotFoundError(f"Story directory {story_dir} not found")

        archive_dir.mkdir(parents=True, exist_ok=True)
        target_dir = archive_dir / story_id

        if target_dir.exists():
            shutil.rmtree(target_dir)

        shutil.move(str(story_dir), str(target_dir))

        # Remove from stories.md
        stories_file = self.pm.scrummaster_path / "stories.md"
        content = stories_file.read_text()

        # Support both legacy (## [ ] Story:) and modern (- [ ] **Story:) formats
        # and handle optional separator (---)
        p1 = r"(?ms)^---\r?\n\n\s*(?:##|[-])\s*(\[.*?]\s*(?:\*\*)?Story:.*?)"
        p2 = rf"\r?\n\*Link:\s*\[.*?/stories/{story_id}/.*?\)[\*]*\r?\n?"
        pattern = p1 + p2
        new_content, count = re.subn(pattern, "", content)

        if count == 0:
            # Try without the separator
            p1 = r"(?ms)^\s*(?:##|[-])\s*(\[.*?]\s*(?:\*\*)?Story:.*?)"
            pattern = p1 + p2
            new_content, count = re.subn(pattern, "", content)

        stories_file.write_text(new_content)
