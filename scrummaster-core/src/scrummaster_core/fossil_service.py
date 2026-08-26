from __future__ import annotations

import subprocess


class FossilError(RuntimeError):
    pass


class FossilService:
    """
    Fossil VCS adapter implementing the VCSService protocol (see
    vcs_adapters.py). Scrummaster's default VCS backend is Fossil (Cathedral-
    style, trunk-oriented) rather than Git; this mirrors GitService's shape
    but shells out to the `fossil` CLI, since there is no Python fossil
    binding equivalent to GitPython.

    Like JujutsuService, this does not implement the protocol's `repo`
    property — that property's return type (GitPython's `Repo`) is a
    git-specific implementation detail with no Fossil equivalent.
    """

    def __init__(self, repo_path: str) -> None:
        self.path = repo_path
        info = self._run(["info"])
        # `fossil info` returns exit code 0 even outside an open checkout
        # (it just prints config-db/binary/version info) — the presence of
        # a "checkout:" line is what actually distinguishes an open checkout.
        if info.returncode != 0 or "checkout:" not in info.stdout:
            raise FossilError(f"Not a Fossil checkout: {repo_path}\n{info.stderr}")

    def _run(self, args: list[str]) -> subprocess.CompletedProcess[str]:
        return subprocess.run(
            ["fossil", *args],  # noqa: S607
            cwd=self.path,
            capture_output=True,
            text=True,
            check=False,
        )

    def get_status(self) -> str:
        return self._run(["changes"]).stdout

    def commit(self, message: str, stage_all: bool = True) -> str:
        if stage_all:
            self._run(["add", "."])
        result = self._run(["commit", "-m", message, "--no-warnings"])
        if result.returncode != 0:
            raise FossilError(f"fossil commit failed: {result.stderr}")
        return self.get_latest_hash()

    def get_latest_hash(self) -> str:
        return self._checkout_hash()

    def get_head_sha(self) -> str:
        return self._checkout_hash()

    def _checkout_hash(self) -> str:
        info = self._run(["info"]).stdout
        for line in info.splitlines():
            if line.startswith("checkout:"):
                # "checkout:     <hash> <date> UTC"
                parts = line.split(None, 2)
                if len(parts) >= 2:
                    return parts[1]
        raise FossilError("Could not determine current checkout hash.")

    def add(self, file_path: str) -> None:
        self._run(["add", file_path])

    def is_dirty(self) -> bool:
        # `fossil changes` only reports already-tracked edits/adds — a brand
        # new untracked file needs `fossil extras` (mirrors GitService's
        # `is_dirty() or len(untracked_files) > 0`).
        return bool(self.get_status().strip()) or bool(self._run(["extras"]).stdout.strip())

    def checkout(self, branch_name: str, create: bool = False) -> None:
        if create:
            # Fossil branches take effect at the next commit, not
            # immediately like `git checkout -b` — there is no direct
            # equivalent of an instant branch-and-switch. Record the branch
            # so it applies to the next commit on this checkout.
            self._run(["branch", "new", branch_name, "current"])
        self._run(["update", branch_name])

    def checkout_and_merge(self, branch_name: str) -> None:
        current = self._current_branch()
        self._run(["update", branch_name])
        self._run(["update", current])
        self._run(["merge", branch_name])

    def create_branch(self, branch_name: str) -> None:
        self._run(["branch", "new", branch_name, "current"])

    def create_worktree(self, path: str, branch: str) -> None:
        # Fossil has no worktree concept — each checkout directory is bound
        # 1:1 to a repository via `fossil open`. Emulate a worktree by
        # opening a second checkout of the same repository database at the
        # target path, then switching it to the requested branch.
        info = self._run(["info"]).stdout
        repo_db = next(
            (line.split(None, 1)[1].strip() for line in info.splitlines() if line.startswith("repository:")),
            None,
        )
        if not repo_db:
            raise FossilError("Could not determine repository file for worktree creation.")
        subprocess.run(
            ["fossil", "open", repo_db, branch],  # noqa: S607
            cwd=path,
            capture_output=True,
            text=True,
            check=False,
        )

    def merge(self, branch_name: str) -> None:
        self._run(["merge", branch_name])

    def get_log(self, n: int = 10) -> str:
        return self._run(["timeline", "-n", str(n)]).stdout

    def add_note(self, commit_hash: str, message: str) -> None:
        # Fossil has no `git notes` equivalent — the closest construct is a
        # technote tagged with the commit hash, created via `fossil wiki
        # create` with `-t` (there is no dedicated `fossil technote`
        # subcommand). Content is piped via stdin, not a -m flag.
        subprocess.run(
            [  # noqa: S607
                "fossil",
                "wiki",
                "create",
                f"{commit_hash}: note",
                "-",
                "-t",
                "now",
                "--technote-tags",
                f"checkin:{commit_hash}",
                "-M",
                "text/x-markdown",
            ],
            cwd=self.path,
            input=message,
            capture_output=True,
            text=True,
            check=False,
        )

    def _current_branch(self) -> str:
        info = self._run(["info"]).stdout
        for line in info.splitlines():
            if line.startswith("tags:"):
                return line.split(None, 1)[1].strip().split(",")[0].strip()
        return "trunk"
