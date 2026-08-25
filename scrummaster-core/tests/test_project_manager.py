import json
import os

import pytest
from scrummaster_core.models import StoryStatus
from scrummaster_core.project_manager import ProjectManager


@pytest.fixture
def workspace(tmp_path):
    return tmp_path


def test_initialize_project(workspace):
    manager = ProjectManager(base_path=str(workspace))
    manager.initialize_project(goal="Test project goal")

    scrummaster_dir = workspace / "scrummaster"
    assert scrummaster_dir.exists()
    assert (scrummaster_dir / "setup_state.json").exists()
    assert (scrummaster_dir / "product.md").exists()

    product_content = (scrummaster_dir / "product.md").read_text()
    assert "Test project goal" in product_content


def test_create_story(workspace):
    manager = ProjectManager(base_path=str(workspace))
    manager.initialize_project(goal="Test goal")

    story_id = manager.create_story(description="Test story description")

    track_dir = workspace / "scrummaster" / "stories" / story_id
    assert track_dir.exists()
    assert (track_dir / "metadata.json").exists()

    with (track_dir / "metadata.json").open() as f:
        metadata = json.load(f)
        assert metadata["description"] == "Test story description"
        assert metadata["status"] == StoryStatus.NEW


def test_create_story_metadata_fields(workspace):
    manager = ProjectManager(base_path=str(workspace))
    manager.initialize_project(goal="Test goal")

    story_id = manager.create_story(description="Metadata fields")
    track_dir = workspace / "scrummaster" / "stories" / story_id
    metadata = json.loads((track_dir / "metadata.json").read_text())

    assert metadata["story_id"] == story_id
    assert metadata["status"] == StoryStatus.NEW
    assert "created_at" in metadata
    assert "updated_at" in metadata

    tracks_md = (workspace / "scrummaster" / "stories.md").read_text()
    assert f"/{story_id}/" in tracks_md


def test_acquire_and_release_lock(workspace):
    manager = ProjectManager(base_path=str(workspace))
    manager.initialize_project(goal="Test goal")

    assert manager.is_locked() is False
    assert manager.acquire_lock() is True
    assert manager.is_locked() is True
    assert manager.release_lock() is True
    assert manager.is_locked() is False


def test_acquire_lock_times_out_when_already_locked(workspace):
    manager = ProjectManager(base_path=str(workspace))
    manager.initialize_project(goal="Test goal")

    assert manager.acquire_lock() is True
    other_manager = ProjectManager(base_path=str(workspace))
    assert other_manager.acquire_lock(timeout=0.2) is False

    manager.release_lock()


def test_acquire_lock_cleans_up_and_returns_false_on_write_failure(workspace, monkeypatch):
    manager = ProjectManager(base_path=str(workspace))
    manager.initialize_project(goal="Test goal")

    def failing_write(_fd, _data):
        raise OSError("disk full")

    monkeypatch.setattr(os, "write", failing_write)

    assert manager.acquire_lock() is False
    assert manager.is_locked() is False


def test_release_lock_when_not_locked_returns_false(workspace):
    manager = ProjectManager(base_path=str(workspace))
    manager.initialize_project(goal="Test goal")

    assert manager.release_lock() is False


def test_update_story_metadata_missing_track_raises(workspace):
    manager = ProjectManager(base_path=str(workspace))
    manager.initialize_project(goal="Test goal")

    with pytest.raises(FileNotFoundError, match=r"metadata\.json not found"):
        manager.update_story_metadata("nonexistent_track", {"status": "done"})


def test_update_story_metadata_merges_nested_dicts(workspace):
    manager = ProjectManager(base_path=str(workspace))
    manager.initialize_project(goal="Test goal")
    story_id = manager.create_story(description="Nested metadata")

    track_dir = workspace / "scrummaster" / "stories" / story_id
    metadata_path = track_dir / "metadata.json"
    metadata = json.loads(metadata_path.read_text())
    metadata["vcs"] = {"branch": "scrummaster/story", "worktree": None}
    metadata_path.write_text(json.dumps(metadata, indent=2))

    updated = manager.update_story_metadata(story_id, {"vcs": {"worktree": "worktrees/story"}})

    assert updated["vcs"]["branch"] == "scrummaster/story"
    assert updated["vcs"]["worktree"] == "worktrees/story"
