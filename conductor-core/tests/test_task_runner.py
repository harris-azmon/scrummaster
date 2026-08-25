import shutil
from pathlib import Path

import pytest
from conductor_core.git_service import GitService
from conductor_core.project_manager import ProjectManager
from conductor_core.task_runner import TaskRunner
from conductor_core.vcs_adapters import JujutsuService
from git import Repo


@pytest.fixture
def project(tmp_path):
    pm = ProjectManager(tmp_path)
    pm.initialize_project("Test project")
    Repo.init(tmp_path)
    return pm


def test_select_next_track(project):
    project.create_track("Track 1")
    project.create_track("Track 2")

    runner = TaskRunner(project)
    _track_id, desc, status = runner.get_track_to_implement()

    assert desc == "Track 1"
    assert status == ""  # Empty because it's [ ]


def test_select_specific_track(project):
    project.create_track("Feature A")
    project.create_track("Feature B")

    runner = TaskRunner(project)
    _track_id, desc, _status = runner.get_track_to_implement("Feature B")

    assert desc == "Feature B"


def test_update_track_status(project):
    track_id = project.create_track("Track to update")
    runner = TaskRunner(project)

    runner.update_track_status(track_id, "~")

    tracks_file = project.conductor_path / "tracks.md"
    assert "- [~] **Track: Track to update**" in tracks_file.read_text()


def test_update_task_status_in_progress(project):
    track_id = project.create_track("Track with a task")
    track_dir = project.conductor_path / "tracks" / track_id
    (track_dir / "plan.md").write_text("## Phase 1\n- [ ] Do the thing\n")

    runner = TaskRunner(project)
    runner.update_task_status(track_id, "Do the thing", "~")

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


def test_archive_track(project, tmp_path):
    track_id = project.create_track("Track to archive")
    track_dir = project.conductor_path / "tracks" / track_id
    (track_dir / "plan.md").write_text("# Plan")

    runner = TaskRunner(project)
    runner.archive_track(track_id)

    assert not track_dir.exists()
    assert (project.conductor_path / "archive" / track_id).exists()
    assert (project.conductor_path / "archive" / track_id / "plan.md").exists()
    assert "Track to archive" not in (project.conductor_path / "tracks.md").read_text()
