import shutil
import subprocess
from pathlib import Path

import pytest
from scrummaster_core.fossil_service import FossilService
from scrummaster_core.git_service import GitService
from scrummaster_core.project_manager import ProjectManager
from scrummaster_core.task_runner import TaskRunner
from scrummaster_core.vcs_adapters import JujutsuService
from git import Repo

FOSSIL_PATH = shutil.which("fossil")


@pytest.fixture
def project(tmp_path):
    pm = ProjectManager(tmp_path)
    pm.initialize_project("Test project")
    Repo.init(tmp_path)
    return pm


def test_select_next_story(project):
    project.create_story("Story 1")
    project.create_story("Story 2")

    runner = TaskRunner(project)
    _story_id, desc, status = runner.get_story_to_implement()

    assert desc == "Story 1"
    assert status == ""  # Empty because it's [ ]


def test_select_specific_story(project):
    project.create_story("Feature A")
    project.create_story("Feature B")

    runner = TaskRunner(project)
    _story_id, desc, _status = runner.get_story_to_implement("Feature B")

    assert desc == "Feature B"


def test_update_story_status(project):
    story_id = project.create_story("Story to update")
    runner = TaskRunner(project)

    runner.update_story_status(story_id, "~")

    tracks_file = project.scrummaster_path / "stories.md"
    assert "- [~] **Story: Story to update**" in tracks_file.read_text()


def test_update_task_status_in_progress(project):
    story_id = project.create_story("Story with a task")
    track_dir = project.scrummaster_path / "stories" / story_id
    (track_dir / "plan.md").write_text("## Phase 1\n- [ ] Do the thing\n")

    runner = TaskRunner(project)
    runner.update_task_status(story_id, "Do the thing", "~")

    plan_content = (track_dir / "plan.md").read_text()
    assert "[~]" in plan_content or "in_progress" in plan_content.lower()


def test_git_property_setter_backward_compat(project):
    runner = TaskRunner(project)
    fake_vcs = GitService(str(project.base_path))

    runner.git = fake_vcs

    assert runner.vcs is fake_vcs
    assert runner.git is fake_vcs


def test_discover_vcs_adapter_selects_jujutsu_when_jj_dir_present(tmp_path):
    pm = ProjectManager(tmp_path)
    pm.initialize_project("Test project")
    (tmp_path / ".jj").mkdir()

    runner = TaskRunner(pm)

    assert isinstance(runner.vcs, JujutsuService)


def test_discover_vcs_adapter_selects_fossil_when_checkout_present(tmp_path):
    if FOSSIL_PATH is None:
        pytest.skip("fossil executable not found")

    pm = ProjectManager(tmp_path)
    pm.initialize_project("Test project")
    subprocess.run(  # noqa: S603
        [FOSSIL_PATH, "init", "--admin-user", "test", str(tmp_path / "test.fossil")], cwd=tmp_path, check=True
    )
    subprocess.run(  # noqa: S603
        [FOSSIL_PATH, "open", str(tmp_path / "test.fossil"), "--keep"], cwd=tmp_path, check=True
    )

    runner = TaskRunner(pm)

    assert isinstance(runner.vcs, FossilService)


def test_discover_vcs_adapter_defaults_to_git_when_no_local_vcs_dir():
    # Neither .jj nor .git exists directly in this project directory, but it's
    # nested inside this repository's own working tree, so GitPython's
    # search_parent_directories can still find a real .git to attach to -
    # exercising the "fall through to GitService" default branch.
    repo_root = Path(__file__).resolve().parents[2]
    project_dir = repo_root / ".tmp_test_vcs_fallback"
    project_dir.mkdir(exist_ok=True)
    try:
        pm = ProjectManager(project_dir)
        pm.initialize_project("Test project")

        runner = TaskRunner(pm)

        assert isinstance(runner.vcs, GitService)
    finally:
        shutil.rmtree(project_dir, ignore_errors=True)


def test_archive_story(project, tmp_path):
    story_id = project.create_story("Story to archive")
    track_dir = project.scrummaster_path / "stories" / story_id
    (track_dir / "plan.md").write_text("# Plan")

    runner = TaskRunner(project)
    runner.archive_story(story_id)

    assert not track_dir.exists()
    assert (project.scrummaster_path / "archive" / story_id).exists()
    assert (project.scrummaster_path / "archive" / story_id / "plan.md").exists()
    assert "Story to archive" not in (project.scrummaster_path / "stories.md").read_text()
