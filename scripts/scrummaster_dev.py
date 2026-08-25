import os
import subprocess
import sys
from pathlib import Path

import click

ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "scrummaster-core" / "src"))


@click.group()
def cli() -> None:
    """Scrummaster Developer CLI."""


@cli.command()
def sync() -> None:
    """Synchronize all platform artifacts and skills."""
    from scripts.sync_all import main as sync_main

    sys.exit(sync_main())


@cli.command()
def verify() -> None:
    """Run all validation and verification scripts."""
    print("--- Running Platform Validations ---")
    python = sys.executable
    env = os.environ.copy()
    env["PYTHONPATH"] = str(ROOT / "scrummaster-core" / "src")

    cmds = [
        [python, "scripts/validate_platforms.py"],
        [python, "scripts/validate_antigravity.py"],
        [python, "scripts/check_skills_sync.py"],
        [python, "scripts/e2e_smoke_test.py"],
    ]

    all_passed = True
    for cmd in cmds:
        print(f"Running: {' '.join(cmd)}")
        res = subprocess.run(cmd, env=env, check=False)
        if res.returncode != 0:
            all_passed = False
            print(f"❌ Failed: {' '.join(cmd)}")

    if all_passed:
        print("✅ All verifications passed.")
        sys.exit(0)
    else:
        sys.exit(1)


@cli.command()
def build() -> None:
    """Build core."""
    print("--- Building Scrummaster ---")

    # Build core
    print("Building core...")
    subprocess.run(
        ["bash", "scripts/build_core.sh"] if os.name != "nt" else ["powershell", "scripts/build_core.sh"], check=True
    )

    print("✅ Build complete.")


@cli.command()
def doctor() -> None:
    """Check local environment for health and consistency."""
    print("--- Scrummaster Doctor ---")

    checks = {
        "Product Definition": ROOT / "scrummaster/product.md",
        "Tech Stack": ROOT / "scrummaster/tech-stack.md",
        "Workflow": ROOT / "scrummaster/workflow.md",
        "Stories": ROOT / "scrummaster/stories.md",
        "Scrummaster Core": ROOT / "scrummaster-core/src/scrummaster_core",
        "MCP VCS Server": ROOT / "mcp/src",
        "MCP Server": ROOT / "mcp-server/src",
    }

    all_ok = True
    for name, path in checks.items():
        if path.exists():
            print(f"✅ {name}: Found")
        else:
            print(f"❌ {name}: Missing ({path})")
            all_ok = False

    # Check dependencies
    try:
        import jinja2

        print(f"✅ jinja2: {jinja2.__version__}")
    except ImportError:
        print("❌ jinja2: Not installed")
        all_ok = False

    if all_ok:
        print("\n🩺 Your Scrummaster environment looks healthy!")
    else:
        print("\n🩺 Issues found. Please check your environment setup.")
        sys.exit(1)


@cli.command()
def version() -> None:
    """Show Scrummaster version."""
    # Unified versioning (hardcoded for now, should read from pyproject.toml)
    print("Scrummaster Suite v0.2.0")


if __name__ == "__main__":
    cli()
