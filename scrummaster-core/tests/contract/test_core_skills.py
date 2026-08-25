from unittest.mock import MagicMock

import pytest
from scrummaster_core.models import CapabilityContext, PlatformCapability
from scrummaster_core.project_manager import ProjectManager
from scrummaster_core.task_runner import TaskRunner


@pytest.fixture
def mock_pm(tmp_path):
    pm = ProjectManager(tmp_path)
    # Create necessary files for PM to be considered "set up"
    (tmp_path / "scrummaster").mkdir()
    (tmp_path / "scrummaster" / "product.md").write_text("# Product")
    (tmp_path / "scrummaster" / "workflow.md").write_text("# Workflow")
    (tmp_path / "scrummaster" / "stories.md").write_text("# Stories")
    return pm


def test_contract_new_story_logic(mock_pm):
    """Verifies that the core logic for selecting a story works with abstract inputs."""
    # Mocking stories.md content for parsing
    tracks_file = mock_pm.scrummaster_path / "stories.md"
    tracks_file.write_text(
        """# Project Stories
---
## [ ] Story: Test Story
*Link: [./scrummaster/stories/test_20260101/](./scrummaster/stories/test_20260101/)*
"""
    )

    git_mock = MagicMock()
    runner = TaskRunner(mock_pm, git_service=git_mock)

    story_id, desc, status = runner.get_story_to_implement("Test Story")

    assert story_id == "test_20260101"
    assert "Test Story" in desc
    assert status == ""


def test_contract_capability_gate(mock_pm):
    """Verifies that the core respects platform capabilities."""
    git_mock = MagicMock()
    # Host platform with NO terminal capability
    ctx = CapabilityContext(available_capabilities=[PlatformCapability.UI_PROMPT])
    runner = TaskRunner(mock_pm, git_service=git_mock, capability_context=ctx)

    assert runner.capabilities.has_capability(PlatformCapability.TERMINAL) is False
