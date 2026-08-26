from unittest.mock import MagicMock

import pytest
from scrummaster_core.project_manager import ProjectManager
from scrummaster_core.task_runner import TaskRunner


@pytest.fixture
def tr(tmp_path):
    pm = ProjectManager(tmp_path)
    pm.initialize_project("Goal")
    git_mock = MagicMock()
    return TaskRunner(pm, git_service=git_mock)


def test_get_story_to_implement_no_stories_file(tr, tmp_path):
    (tmp_path / "scrummaster" / "stories.md").unlink()
    with pytest.raises(FileNotFoundError, match=r"stories\.md not found"):
        tr.get_story_to_implement()


def test_get_story_to_implement_empty_stories(tr, tmp_path):
    (tmp_path / "scrummaster" / "stories.md").write_text("# Stories")
    with pytest.raises(ValueError, match="No active stories found"):
        tr.get_story_to_implement()


def test_get_story_to_implement_not_found(tr, tmp_path):
    tr.pm.create_story("Real Story")
    with pytest.raises(ValueError, match="No story found matching description"):
        tr.get_story_to_implement("Fake Story")


def test_update_story_status_not_found(tr):
    with pytest.raises(ValueError, match="Could not find story"):
        tr.update_story_status("missing_id", "~")


def test_update_task_status_missing_plan(tr):
    with pytest.raises(FileNotFoundError, match=r"plan\.md not found"):
        tr.update_task_status("any_id", "task", "x")


def test_update_task_status_not_found(tr, tmp_path):
    story_id = tr.pm.create_story("Task Test")
    plan_file = tmp_path / "scrummaster" / "stories" / story_id / "plan.md"
    plan_file.write_text("- [ ] Real Task")
    with pytest.raises(ValueError, match="Could not find task 'Fake Task'"):
        tr.update_task_status(story_id, "Fake Task", "x")


def test_checkpoint_phase_not_found(tr, tmp_path):
    story_id = tr.pm.create_story("Phase Test")
    plan_file = tmp_path / "scrummaster" / "stories" / story_id / "plan.md"
    plan_file.write_text("## Phase 1: Real")
    with pytest.raises(ValueError, match="Could not find phase 'Fake'"):
        tr.checkpoint_phase(story_id, "Fake", "1234567")


def test_checkpoint_phase_missing_plan(tr):
    with pytest.raises(FileNotFoundError, match=r"plan\.md not found"):
        tr.checkpoint_phase("any_id", "Phase 1", "1234567")


def test_archive_story_not_found(tr):
    with pytest.raises(FileNotFoundError, match=r"Story directory .* not found"):
        tr.archive_story("missing_id")


def test_archive_story_already_archived(tr, tmp_path):
    story_id = tr.pm.create_story("Archive Test")
    tr.archive_story(story_id)
    # Try archiving again
    with pytest.raises(FileNotFoundError):
        tr.archive_story(story_id)


def test_archive_story_target_exists(tr, tmp_path):
    story_id = tr.pm.create_story("Collision")
    # Manually create a directory in archive with same name
    (tmp_path / "scrummaster" / "archive" / story_id).mkdir(parents=True)
    tr.archive_story(story_id)  # Should overwrite via shutil.rmtree
    assert not (tmp_path / "scrummaster" / "stories" / story_id).exists()
    assert (tmp_path / "scrummaster" / "archive" / story_id).exists()


def test_archive_story_without_separator(tr, tmp_path):
    story_id = "manual_id_456"
    tracks_file = tmp_path / "scrummaster" / "stories.md"
    (tmp_path / "scrummaster" / "stories" / story_id).mkdir(parents=True)

    # Construct a story without leading separator
    content = chr(10).join(
        [
            "# Project Stories",
            "",
            "- [ ] **Story: Test**",
            f"*Link: [./scrummaster/stories/{story_id}/](./scrummaster/stories/{story_id}/)*",
        ]
    )
    tracks_file.write_text(content)

    tr.archive_story(story_id)
    assert story_id not in tracks_file.read_text()
