from pathlib import Path

from scripts.context_report import Thresholds, build_context_report


def _write(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def test_context_report_resolves_track(tmp_path):
    repo_root = tmp_path
    scrummaster_dir = repo_root / "scrummaster"
    _write(scrummaster_dir / "product.md", "product")
    _write(scrummaster_dir / "tech-stack.md", "stack")
    _write(scrummaster_dir / "workflow.md", "workflow")
    stories_entry = "- [~] **Story: Test**\n*Link: [./scrummaster/stories/t1/](./scrummaster/stories/t1/)*\n"
    _write(scrummaster_dir / "stories.md", stories_entry)

    story_dir = scrummaster_dir / "stories" / "t1"
    _write(story_dir / "spec.md", "spec")
    _write(story_dir / "plan.md", "plan")
    _write(story_dir / "metadata.json", "{}")

    thresholds = Thresholds(1, 3, 10, 20)
    report = build_context_report(repo_root, None, thresholds)

    assert report["story_id"] == "t1"
    assert report["missing"] == []
    assert report["total_bytes"] > 0


def test_context_report_flags_sizes(tmp_path):
    repo_root = tmp_path
    scrummaster_dir = repo_root / "scrummaster"
    _write(scrummaster_dir / "product.md", "x" * 2)
    _write(scrummaster_dir / "tech-stack.md", "x")
    _write(scrummaster_dir / "workflow.md", "x")
    stories_entry = "- [ ] **Story: Test**\n*Link: [./scrummaster/stories/t2/](./scrummaster/stories/t2/)*\n"
    _write(scrummaster_dir / "stories.md", stories_entry)

    story_dir = scrummaster_dir / "stories" / "t2"
    _write(story_dir / "spec.md", "x")
    _write(story_dir / "plan.md", "x")
    _write(story_dir / "metadata.json", "{}")

    thresholds = Thresholds(
        warn_file_bytes=1,
        block_file_bytes=3,
        warn_total_bytes=5,
        block_total_bytes=20,
    )
    report = build_context_report(repo_root, "t2", thresholds)

    statuses = {item.path.name: item.status for item in report["files"]}
    assert statuses["product.md"] == "WARN"
    assert report["total_status"] in {"WARN", "BLOCK", "OK"}
