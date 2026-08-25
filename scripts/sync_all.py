import sys
from pathlib import Path

ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "conductor-core" / "src"))

from scripts.sync_skills import sync_skills  # noqa: E402 - must follow sys.path setup above
from scripts.validate_platforms import sync_platforms  # noqa: E402 - must follow sys.path setup above


def main() -> int:
    print("--- Phase 1: Synchronizing Global & Platform Skills ---")
    try:
        sync_skills()
        print("✅ Skills synchronized successfully.")
    except Exception as e:
        print(f"❌ Error synchronizing skills: {e}")
        return 1

    print("\n--- Phase 2: Synchronizing Repository-Local Platform Files ---")
    try:
        sync_platforms()
        print("✅ Platform files synchronized successfully.")
    except Exception as e:
        print(f"❌ Error synchronizing platform files: {e}")
        return 1

    print("\n🎉 Conductor Synchronization Complete!")
    return 0


if __name__ == "__main__":
    sys.exit(main())
