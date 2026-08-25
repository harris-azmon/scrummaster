import shutil
import subprocess
from unittest.mock import patch

import pytest
from scrummaster_core.fossil_service import FossilError, FossilService

FOSSIL_PATH = shutil.which("fossil")


@pytest.fixture
def temp_repo(tmp_path):
    if FOSSIL_PATH is None:
        pytest.skip("fossil executable not found")
    repo_dir = tmp_path / "repo"
    repo_dir.mkdir()
    repo_file = repo_dir / "test.fossil"
    subprocess.run(  # noqa: S603
        [FOSSIL_PATH, "init", "--admin-user", "test", str(repo_file)], cwd=repo_dir, check=True
    )
    subprocess.run([FOSSIL_PATH, "open", str(repo_file)], cwd=repo_dir, check=True)  # noqa: S603
    subprocess.run([FOSSIL_PATH, "user", "default", "test"], cwd=repo_dir, check=True)  # noqa: S603
    return repo_dir


def test_fossil_service_status(temp_repo):
    service = FossilService(repo_path=str(temp_repo))
    assert not service.is_dirty()

    (temp_repo / "test.txt").write_text("hello")
    assert service.is_dirty()


def test_fossil_service_commit(temp_repo):
    service = FossilService(repo_path=str(temp_repo))
    (temp_repo / "test.txt").write_text("hello")
    service.add("test.txt")
    sha = service.commit("feat: Test commit")
    assert len(sha) == 40
    assert not service.is_dirty()


def test_fossil_service_get_head_sha(temp_repo):
    service = FossilService(repo_path=str(temp_repo))
    (temp_repo / "test.txt").write_text("hello")
    service.add("test.txt")
    sha = service.commit("feat: Test commit")
    assert service.get_head_sha() == sha


def test_fossil_service_get_latest_hash(temp_repo):
    service = FossilService(repo_path=str(temp_repo))
    (temp_repo / "test.txt").write_text("hello")
    service.add("test.txt")
    sha = service.commit("feat: Test commit")
    assert service.get_latest_hash() == sha


def test_fossil_service_get_status(temp_repo):
    service = FossilService(repo_path=str(temp_repo))
    (temp_repo / "test.txt").write_text("hello")
    service.add("test.txt")
    status = service.get_status()
    assert "test.txt" in status


def test_fossil_service_get_log(temp_repo):
    service = FossilService(repo_path=str(temp_repo))
    (temp_repo / "test.txt").write_text("hello")
    service.add("test.txt")
    service.commit("feat: Test commit")
    log = service.get_log(5)
    assert "Test commit" in log


def test_fossil_service_create_branch(temp_repo):
    service = FossilService(repo_path=str(temp_repo))
    (temp_repo / "main.txt").write_text("main")
    service.add("main.txt")
    service.commit("feat: Main commit")

    service.create_branch("feature")
    (temp_repo / "feat.txt").write_text("feat")
    service.add("feat.txt")
    sha = service.commit("feat: Feature commit")
    assert sha


def test_fossil_service_checkout_create(temp_repo):
    service = FossilService(repo_path=str(temp_repo))
    (temp_repo / "main.txt").write_text("main")
    service.add("main.txt")
    service.commit("feat: Main commit")

    service.checkout("feature", create=True)
    (temp_repo / "feat.txt").write_text("feat")
    service.add("feat.txt")
    service.commit("feat: Feature commit")
    assert (temp_repo / "feat.txt").exists()


def test_fossil_service_checkout_and_merge(temp_repo):
    service = FossilService(repo_path=str(temp_repo))
    (temp_repo / "main.txt").write_text("main")
    service.add("main.txt")
    service.commit("feat: Main commit")

    service.checkout("feature", create=True)
    (temp_repo / "feat.txt").write_text("feat")
    service.add("feat.txt")
    service.commit("feat: Feature commit")

    service.checkout("trunk")
    service.checkout_and_merge("feature")
    assert (temp_repo / "feat.txt").exists()


def test_fossil_service_create_worktree(temp_repo, tmp_path):
    service = FossilService(repo_path=str(temp_repo))
    (temp_repo / "main.txt").write_text("main")
    service.add("main.txt")
    service.commit("feat: Main commit")

    worktree_dir = tmp_path / "worktree"
    worktree_dir.mkdir()
    service.create_worktree(str(worktree_dir), "trunk")
    assert (worktree_dir / "main.txt").exists()


def test_fossil_service_add_note(temp_repo):
    service = FossilService(repo_path=str(temp_repo))
    (temp_repo / "main.txt").write_text("main")
    service.add("main.txt")
    sha = service.commit("feat: Main commit")

    service.add_note(sha, "This is a detailed note about the commit.")
    export = subprocess.run(  # noqa: S603
        [FOSSIL_PATH, "wiki", "export", "-t", f"checkin:{sha}", "-"],
        cwd=temp_repo,
        capture_output=True,
        text=True,
        check=True,
    )
    assert "detailed note" in export.stdout


def test_fossil_service_missing_repo(tmp_path):
    with pytest.raises(FossilError):
        FossilService(repo_path=str(tmp_path))


def test_fossil_service_commit_failure_raises(temp_repo):
    service = FossilService(repo_path=str(temp_repo))
    # Nothing staged and nothing changed: `fossil commit` refuses.
    with pytest.raises(FossilError, match="fossil commit failed"):
        service.commit("feat: nothing to commit", stage_all=False)


def test_fossil_service_merge(temp_repo):
    service = FossilService(repo_path=str(temp_repo))
    (temp_repo / "main.txt").write_text("main")
    service.add("main.txt")
    service.commit("feat: Main commit")

    service.create_branch("feature")
    (temp_repo / "feat.txt").write_text("feat")
    service.add("feat.txt")
    service.commit("feat: Feature commit")

    service.checkout("trunk")
    service.merge("feature")
    assert (temp_repo / "feat.txt").exists()


def test_fossil_service_checkout_hash_not_found(temp_repo):
    service = FossilService(repo_path=str(temp_repo))
    empty_result = subprocess.CompletedProcess([], 0, stdout="", stderr="")
    with (
        patch.object(service, "_run", return_value=empty_result),
        pytest.raises(FossilError, match="Could not determine current checkout hash"),
    ):
        service.get_latest_hash()


def test_fossil_service_create_worktree_no_repo_db(temp_repo, tmp_path):
    service = FossilService(repo_path=str(temp_repo))
    empty_result = subprocess.CompletedProcess([], 0, stdout="", stderr="")
    with (
        patch.object(service, "_run", return_value=empty_result),
        pytest.raises(FossilError, match="Could not determine repository file"),
    ):
        service.create_worktree(str(tmp_path / "worktree"), "trunk")


def test_fossil_service_current_branch_fallback(temp_repo):
    service = FossilService(repo_path=str(temp_repo))
    with patch.object(service, "_run", return_value=subprocess.CompletedProcess([], 0, stdout="", stderr="")):
        assert service._current_branch() == "trunk"  # noqa: SLF001
