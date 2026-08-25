from conductor_core.vcs_adapters import JujutsuService


def test_jujutsu_service_placeholder_methods():
    service = JujutsuService("fake-repo-path")

    assert service.path == "fake-repo-path"
    assert service.get_status() == "jj status placeholder"
    assert service.commit("message") == "jj_commit_hash_placeholder"
    assert service.get_latest_hash() == "jj_latest_hash_placeholder"
    assert service.add("file.txt") is None
    assert service.is_dirty() is False
    assert service.checkout_and_merge("branch") is None
    assert service.create_branch("branch") is None
    assert service.create_worktree("some/worktree/path", "branch") is None
    assert service.get_head_sha() == "jj_head_hash_placeholder"
    assert service.checkout("branch") is None
    assert service.checkout("branch", create=True) is None
    assert service.merge("branch") is None
    assert service.get_log() == "jj log placeholder for last 10 commits"
    assert service.get_log(n=5) == "jj log placeholder for last 5 commits"
    assert service.add_note("abc123", "note text") is None
