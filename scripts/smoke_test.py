import os
import shutil
import subprocess
import sys
from pathlib import Path


def run_command(cmd, cwd=None):
    result = subprocess.run(
        cmd,
        shell=True,
        cwd=cwd,
        capture_output=True,
        text=True,
        env={**os.environ, "PYTHONPATH": f"{os.getcwd()}/scrummaster-gemini/src:{os.getcwd()}/scrummaster-core/src"},
        check=False,
    )
    if result.returncode != 0:
        raise RuntimeError(f"Command failed: {cmd}")
    return result.stdout


def run_smoke_test() -> None:
    test_workspace = Path("/tmp/scrummaster_smoke_test")
    if test_workspace.exists():
        shutil.rmtree(test_workspace)
    test_workspace.mkdir(parents=True)

    # 1. Init git
    run_command("git init", cwd=test_workspace)
    run_command("git config user.email 'smoke@test.com'", cwd=test_workspace)
    run_command("git config user.name 'smoke'", cwd=test_workspace)

    # 2. Run Setup
    run_command("python -m scrummaster_gemini.cli setup --goal 'Smoke test project'", cwd=test_workspace)
    assert (test_workspace / "scrummaster" / "product.md").exists()
    assert "Smoke test project" in (test_workspace / "scrummaster" / "product.md").read_text()

    # 3. Run New Story
    run_command("python -m scrummaster_gemini.cli new-story 'Test feature'", cwd=test_workspace)
    tracks_dir = test_workspace / "scrummaster" / "stories"
    assert any(tracks_dir.iterdir())  # Ensure at least one story was created

    # 4. Run Status
    output = run_command("python -m scrummaster_gemini.cli status", cwd=test_workspace)
    assert "Project Status Report" in output


if __name__ == "__main__":
    try:
        run_smoke_test()
    except Exception:
        sys.exit(1)
