from __future__ import annotations

import argparse
import re
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class Thresholds:
    warn_file_bytes: int
    block_file_bytes: int
    warn_total_bytes: int
    block_total_bytes: int


@dataclass(frozen=True)
class ContextFile:
    path: Path
    size_bytes: int
    status: str


def _default_thresholds() -> Thresholds:
    return Thresholds(
        warn_file_bytes=250 * 1024,
        block_file_bytes=1024 * 1024,
        warn_total_bytes=2 * 1024 * 1024,
        block_total_bytes=5 * 1024 * 1024,
    )


def _resolve_story_id(tracks_md: Path) -> str | None:
    if not tracks_md.exists():
        return None
    content = tracks_md.read_text(encoding="utf-8")
    pattern = r"(?:##|[-])\s*\[\s*([ xX~]?)\s*\]\s*(?:\*\*)?Story:.*?\r?\n" r"\*Link:\s*\[.*?/stories/(.*?)/\].*?\*"
    matches: list[tuple[str, str]] = []
    for match in re.finditer(pattern, content):
        status_char, story_id = match.groups()
        matches.append((status_char.strip(), story_id.strip()))
    if not matches:
        return None
    for status, story_id in matches:
        if status == "~":
            return story_id
    return matches[0][1]


def _file_status(size_bytes: int, thresholds: Thresholds) -> str:
    if size_bytes >= thresholds.block_file_bytes:
        return "BLOCK"
    if size_bytes >= thresholds.warn_file_bytes:
        return "WARN"
    return "OK"


def build_context_report(repo_root: Path, story_id: str | None, thresholds: Thresholds) -> dict:
    scrummaster_dir = repo_root / "scrummaster"
    required_files = [
        scrummaster_dir / "product.md",
        scrummaster_dir / "tech-stack.md",
        scrummaster_dir / "workflow.md",
        scrummaster_dir / "stories.md",
    ]
    optional_files = [
        scrummaster_dir / "product-guidelines.md",
    ]

    code_styleguides = []
    style_dir = scrummaster_dir / "code_styleguides"
    if style_dir.exists():
        code_styleguides = sorted(p for p in style_dir.glob("*") if p.is_file())

    resolved_track = story_id
    if resolved_track is None:
        resolved_track = _resolve_story_id(scrummaster_dir / "stories.md")

    track_files: list[Path] = []
    if resolved_track:
        story_dir = scrummaster_dir / "stories" / resolved_track
        track_files = [
            story_dir / "spec.md",
            story_dir / "plan.md",
            story_dir / "metadata.json",
            story_dir / "index.md",
        ]

    files = []
    missing = []
    for path in required_files + optional_files + code_styleguides + track_files:
        if path.exists():
            size_bytes = path.stat().st_size
            files.append(ContextFile(path=path, size_bytes=size_bytes, status=_file_status(size_bytes, thresholds)))
        elif path in required_files or (path in track_files and path.name in {"spec.md", "plan.md", "metadata.json"}):
            missing.append(path)

    total_bytes = sum(item.size_bytes for item in files)
    total_status = "OK"
    if total_bytes >= thresholds.block_total_bytes:
        total_status = "BLOCK"
    elif total_bytes >= thresholds.warn_total_bytes:
        total_status = "WARN"

    return {
        "story_id": resolved_track,
        "files": files,
        "missing": missing,
        "total_bytes": total_bytes,
        "total_status": total_status,
    }


def _format_bytes(size: int) -> str:
    return f"{size / 1024:.1f} KB"


def main() -> int:
    parser = argparse.ArgumentParser(description="Report Scrummaster context size and key files.")
    parser.add_argument("--story-id", help="Story id to report (defaults to first in-progress story).")
    parser.add_argument("--warn-file-kb", type=int, default=250)
    parser.add_argument("--block-file-kb", type=int, default=1024)
    parser.add_argument("--warn-total-kb", type=int, default=2048)
    parser.add_argument("--block-total-kb", type=int, default=5120)
    args = parser.parse_args()

    thresholds = Thresholds(
        warn_file_bytes=args.warn_file_kb * 1024,
        block_file_bytes=args.block_file_kb * 1024,
        warn_total_bytes=args.warn_total_kb * 1024,
        block_total_bytes=args.block_total_kb * 1024,
    )

    repo_root = Path(__file__).resolve().parents[1]
    report = build_context_report(repo_root, args.story_id, thresholds)

    track_label = report["story_id"] or "none"
    print(f"Context report (story: {track_label})")
    for item in report["files"]:
        rel_path = item.path.relative_to(repo_root)
        print(f"{item.status}  {_format_bytes(item.size_bytes)}  {rel_path}")

    print(f"TOTAL  {_format_bytes(report['total_bytes'])}  {report['total_status']}")

    if report["missing"]:
        print("Missing required context files:")
        for path in report["missing"]:
            print(f"- {path.relative_to(repo_root)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
