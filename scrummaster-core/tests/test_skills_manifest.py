import json
from pathlib import Path

from scrummaster_core.models import PlatformCapability, SkillManifest


def _repo_root():
    return Path(__file__).resolve().parents[2]


def test_valid_skill_manifest():
    manifest = SkillManifest(
        id="test-skill",
        name="Test Skill",
        description="A test skill",
        version="1.0.0",
        engine_compatibility=">=0.1.0",
        triggers=["test", "demo"],
        commands={"claude": "/test-skill", "vscode": "@scrummaster /test"},
        capabilities=[PlatformCapability.UI_PROMPT, PlatformCapability.FILE_SYSTEM],
    )
    assert manifest.id == "test-skill"
    assert "test" in manifest.triggers
    assert manifest.commands["claude"] == "/test-skill"


def test_skills_manifest_entries_have_matching_skill_files():
    """skills/*/SKILL.md files are canonical, hand-authored content (adopted from
    upstream's agent-plugin format), not generated from scrummaster-core's Jinja
    templates. This previously asserted render_skill(...) byte-for-byte matched
    skills/scrummaster-setup/SKILL.md, which stopped being true once that file (and
    scrummaster-implement/revert/status) became upstream-authored content instead of
    a local-generator artifact. What's still a real invariant: every skill listed
    in the manifest has a corresponding SKILL.md on disk.
    """
    repo_root = _repo_root()
    manifest_path = repo_root / "skills" / "manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))

    for skill in manifest["skills"]:
        skill_file = repo_root / "skills" / skill["name"] / "SKILL.md"
        assert skill_file.exists(), f"Missing SKILL.md for {skill['name']}"
