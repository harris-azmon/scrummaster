import git
import pytest
from scrummaster_core.project_manager import ProjectManager
from scrummaster_core.task_runner import TaskRunner


@pytest.fixture
def project(tmp_path):
    pm = ProjectManager(tmp_path)
    pm.initialize_project("Test")
    git.Repo.init(tmp_path)
    return pm


def test_update_task_status_with_commit_sha(project):
    runner = TaskRunner(project)
    story_id = project.create_story("Commit Test")

    plan_file = project.scrummaster_path / "stories" / story_id / "plan.md"
    plan_file.write_text("- [ ] Task A")

    runner.update_task_status(story_id, "Task A", "x", commit_sha="1234567890")

    content = plan_file.read_text()
    assert "- [x] Task A [1234567]" in content


def test_checkpoint_phase_success(project):
    runner = TaskRunner(project)
    story_id = project.create_story("Phase Success")
    plan_file = project.scrummaster_path / "stories" / story_id / "plan.md"
    plan_file.write_text("## Phase 1: Test")
    runner.checkpoint_phase(story_id, "Test", "abcdef123456")
    assert "[checkpoint: abcdef1]" in plan_file.read_text()


def test_checkpoint_phase_not_found_regex(project):
    runner = TaskRunner(project)
    story_id = project.create_story("Phase Regex Test")

    plan_file = project.scrummaster_path / "stories" / story_id / "plan.md"
    plan_file.write_text("## Phase X")

    with pytest.raises(ValueError, match="Could not find phase 'Missing'"):
        runner.checkpoint_phase(story_id, "Missing", "123")


def test_revert_task(project):
    runner = TaskRunner(project)
    story_id = project.create_story("Revert Test")
    plan_file = project.scrummaster_path / "stories" / story_id / "plan.md"
    plan_file.write_text("- [x] Task A")

    runner.revert_task(story_id, "Task A")
    assert "- [ ] Task A" in plan_file.read_text()
