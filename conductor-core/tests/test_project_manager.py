import json
import os

import pytest
from conductor_core.models import TrackStatus
from conductor_core.project_manager import ProjectManager


@pytest.fixture
def workspace(tmp_path):
    return tmp_path


def test_initialize_project(workspace):
    manager = ProjectManager(base_path=str(workspace))
    manager.initialize_project(goal="Test project goal")

    conductor_dir = workspace / "conductor"
    assert conductor_dir.exists()
    assert (conductor_dir / "setup_state.json").exists()
    assert (conductor_dir / "product.md").exists()

    product_content = (conductor_dir / "product.md").read_text()
    assert "Test project goal" in product_content


def test_create_track(workspace):
    manager = ProjectManager(base_path=str(workspace))
    manager.initialize_project(goal="Test goal")

    track_id = manager.create_track(description="Test track description")

    track_dir = workspace / "conductor" / "tracks" / track_id
    assert track_dir.exists()
    assert (track_dir / "metadata.json").exists()

    with (track_dir / "metadata.json").open() as f:
        metadata = json.load(f)
        assert metadata["description"] == "Test track description"
        assert metadata["status"] == TrackStatus.NEW


def test_create_track_metadata_fields(workspace):
    manager = ProjectManager(base_path=str(workspace))
    manager.initialize_project(goal="Test goal")

    track_id = manager.create_track(description="Metadata fields")
    track_dir = workspace / "conductor" / "tracks" / track_id
    metadata = json.loads((track_dir / "metadata.json").read_text())

    assert metadata["track_id"] == track_id
    assert metadata["status"] == TrackStatus.NEW
    assert "created_at" in metadata
    assert "updated_at" in metadata

    tracks_md = (workspace / "conductor" / "tracks.md").read_text()
    assert f"/{track_id}/" in tracks_md


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


def test_update_track_metadata_missing_track_raises(workspace):
    manager = ProjectManager(base_path=str(workspace))
    manager.initialize_project(goal="Test goal")

    with pytest.raises(FileNotFoundError, match=r"metadata\.json not found"):
        manager.update_track_metadata("nonexistent_track", {"status": "done"})


def test_update_track_metadata_merges_nested_dicts(workspace):
    manager = ProjectManager(base_path=str(workspace))
    manager.initialize_project(goal="Test goal")
    track_id = manager.create_track(description="Nested metadata")

    track_dir = workspace / "conductor" / "tracks" / track_id
    metadata_path = track_dir / "metadata.json"
    metadata = json.loads(metadata_path.read_text())
    metadata["vcs"] = {"branch": "conductor/track", "worktree": None}
    metadata_path.write_text(json.dumps(metadata, indent=2))

    updated = manager.update_track_metadata(track_id, {"vcs": {"worktree": "worktrees/track"}})

    assert updated["vcs"]["branch"] == "conductor/track"
    assert updated["vcs"]["worktree"] == "worktrees/track"
