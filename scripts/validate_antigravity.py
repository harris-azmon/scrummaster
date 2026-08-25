import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).parent.parent
PYTHONPATH = f"{ROOT}/scrummaster-core/src"


def run_command(cmd, cwd=None, env=None):
    process_env = {**os.environ, "PYTHONPATH": PYTHONPATH, "MPLBACKEND": "Agg"}
    if env:
        process_env.update(env)

    return subprocess.run(
        cmd, shell=True, cwd=cwd or ROOT, capture_output=True, text=True, env=process_env, check=False
    )


def test_step(name) -> None:
    pass


def main() -> None:
    all_passed = True

    # 1. Run Skill Sync Unit Test
    test_step("Running Antigravity skill sync unit tests")
    python = sys.executable
    res = run_command(f'"{python}" -m pytest scrummaster-core/tests/test_sync_skills_antigravity.py')
    if res.returncode == 0:
        pass
    else:
        all_passed = False

    # 2. Verify .antigravity/skills structure
    test_step("Verifying .antigravity/skills structure")
    ag_skills_dir = ROOT / ".antigravity" / "skills"
    if ag_skills_dir.exists() and any(ag_skills_dir.iterdir()):
        pass
    else:
        all_passed = False

    if all_passed:
        sys.exit(0)
    else:
        sys.exit(1)


if __name__ == "__main__":
    main()
