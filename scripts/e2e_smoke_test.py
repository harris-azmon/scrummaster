#!/usr/bin/env python3
"""End-to-end smoke test for the Scrummaster <-> vendor/acid-cli integration.

Scrummaster's skills (commands/*.md) are AI-agent-executed prompts, not
deterministic code, so this can't literally run an LLM through them. Instead
it executes the exact fossil commands and file formats those command files
document - setup, new-epic, new-story, implement, status - against a real
fossil checkout, then cross-checks that vendor/acid-cli's `acid` CLI (a
second, independently-implemented tool reading/writing the same fossil
ticket schema) sees exactly the same state.

This is the class of bug unit tests inside any one package can't catch:
each package's own test suite passes, but the two codebases silently drift
apart at the boundary where they share data. It exists because two real
gaps of exactly this shape were found and fixed in the same session that
added this test:
  - `acid push` only recognized the (pre-fork) acai-sh/cli
    features/*.feature.yaml convention, so it silently created zero tickets
    for a real Scrummaster project (which generates spec.md, never
    .feature.yaml).
  - `acid feature`'s per-ACID status only ever read the separate
    `acai_status` column, so a ticket closed via `/scrummaster-implement`'s
    own `fossil ticket change ... status Closed` (fossil's built-in status
    field) silently showed as `null` - even though `acid features`'
    completion counts, checking the built-in status directly, counted it
    as done. Two commands in the same tool disagreeing about one ticket.

Run directly: python scripts/e2e_smoke_test.py
Wired into: scripts/scrummaster_dev.py verify, .github/workflows/ci.yml
"""

from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TICKET_SCHEMA = ROOT / "templates" / "fossil" / "ticket_schema.sql"
ACID_CLI_ENTRY = ROOT / "vendor" / "acid-cli" / "src" / "index.ts"

PRODUCT_NAME = "e2e-product"
EPIC_ID = "auth_20260101"
STORY_ID = "login_flow_20260101"


class SmokeTestFailure(Exception):
    pass


def run(
    cmd: list[str],
    cwd: Path,
    env: dict[str, str],
    input_text: str | None = None,
) -> subprocess.CompletedProcess[str]:
    result = subprocess.run(
        cmd,
        cwd=cwd,
        env=env,
        input=input_text,
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        raise SmokeTestFailure(
            f"Command failed ({result.returncode}): {' '.join(cmd)}\n"
            f"cwd: {cwd}\nstdout:\n{result.stdout}\nstderr:\n{result.stderr}"
        )
    return result


def step(name: str) -> None:
    print(f"\n=== {name} ===", flush=True)


def check(condition: bool, message: str) -> None:
    if not condition:
        raise SmokeTestFailure(message)


def acid_json(args: list[str], cwd: Path, env: dict[str, str]) -> dict:
    result = run(["bun", str(ACID_CLI_ENTRY), *args, "--json"], cwd, env)
    return json.loads(result.stdout)


def main() -> int:
    if shutil.which("fossil") is None:
        print("fossil executable not found; skipping e2e smoke test.")
        return 0
    if shutil.which("bun") is None:
        print("bun executable not found; skipping e2e smoke test.")
        return 0

    workdir = Path(tempfile.mkdtemp(prefix="scrummaster-e2e-"))
    repo_path = workdir / "repo.fossil"
    checkout = workdir / "checkout"
    checkout.mkdir()
    env = {**os.environ, "USER": os.environ.get("USER") or "scrummaster-e2e"}

    try:
        step("/scrummaster-setup (simulated): fossil init/open + ticket schema")
        run(["fossil", "init", str(repo_path), "--project-name", PRODUCT_NAME], workdir, env)
        run(["fossil", "open", str(repo_path)], checkout, env)
        run(["fossil", "sql"], checkout, env, input_text=TICKET_SCHEMA.read_text())

        (checkout / "scrummaster" / "code_styleguides").mkdir(parents=True)
        (checkout / "scrummaster" / "epics").mkdir(parents=True)
        (checkout / "scrummaster" / "product.md").write_text("# Product\nE2E smoke test product.\n")
        (checkout / "scrummaster" / "tech-stack.md").write_text("# Tech Stack\n")
        (checkout / "scrummaster" / "workflow.md").write_text("# Workflow\n")

        step("/scrummaster-newepic (simulated)")
        epic_dir = checkout / "scrummaster" / "epics" / EPIC_ID
        (epic_dir / "stories").mkdir(parents=True)
        (epic_dir / "epic.md").write_text("# Epic: Auth\n\n## Goal\nAuthentication.\n")
        epics_md = checkout / "scrummaster" / "epics.md"
        epics_md.write_text(
            f"# Epics\n\n---\n\n## [ ] Epic: Auth\n"
            f"*Link: [scrummaster/epics/{EPIC_ID}/](scrummaster/epics/{EPIC_ID}/)*\n"
        )

        step("/scrummaster-newstory (simulated): spec.md + raw fossil ticket add per ACID")
        story_dir = epic_dir / "stories" / STORY_ID
        story_dir.mkdir(parents=True)
        (story_dir / "metadata.json").write_text(
            json.dumps(
                {
                    "story_id": STORY_ID,
                    "epic_id": EPIC_ID,
                    "type": "feature",
                    "status": "new",
                    "created_at": "2026-01-01",
                    "description": "Login flow",
                }
            )
        )
        # Exact canonical bullet format from commands/scrummaster-newstory.md.
        acid_1 = f"{STORY_ID}.AUTH.1"
        acid_2 = f"{STORY_ID}.AUTH.2"
        (story_dir / "spec.md").write_text(
            "# Login Flow\n\n"
            "## Overview\nUsers can log in with email + password.\n\n"
            "## AUTH\n"
            f"- `{acid_1}` — a user can authenticate with email + password\n"
            f"- `{acid_2}` — legacy magic link [deprecated: replaced by AUTH.1's password flow]\n\n"
            "## Out of Scope\n- SSO\n"
        )
        (story_dir / "plan.md").write_text(
            "# Implementation Plan\n\n"
            f"## Phase 1: Core\n- [ ] Task: Implement login form ({acid_1})\n"
            "  - [ ] Write tests\n  - [ ] Implement\n"
        )
        # Step 7 of commands/scrummaster-newstory.md: one `fossil ticket add`
        # call per ACID, run directly (this is what an agent actually does -
        # not through acid-cli).
        run(
            [
                "fossil", "ticket", "add", "type", "Story",
                "epic_id", EPIC_ID, "story_id", STORY_ID, "acid", acid_1,
                "status", "Open", "title", "a user can authenticate with email + password",
            ],
            checkout, env,
        )
        run(
            [
                "fossil", "ticket", "add", "type", "Story",
                "epic_id", EPIC_ID, "story_id", STORY_ID, "acid", acid_2,
                "status", "Open", "title", "legacy magic link", "deprecated", "1",
            ],
            checkout, env,
        )
        epics_md.write_text(
            epics_md.read_text()
            + f"\n\n## [ ] Story: Login Flow\n"
            f"*Link: [scrummaster/epics/{EPIC_ID}/stories/{STORY_ID}/]"
            f"(scrummaster/epics/{EPIC_ID}/stories/{STORY_ID}/)*\n"
        )

        step("cross-check: acid features / acid feature see the skill's raw-fossil tickets")
        features = acid_json(
            ["features", "--product", PRODUCT_NAME, "--impl", "trunk"], checkout, env
        )
        feature_names = [f["feature_name"] for f in features["data"]["features"]]
        check(
            STORY_ID in feature_names,
            f"acid features did not see story {STORY_ID!r} created via raw fossil ticket add: {feature_names}",
        )

        feature_ctx = acid_json(
            ["feature", STORY_ID, "--product", PRODUCT_NAME, "--impl", "trunk"], checkout, env
        )
        acids_by_id = {entry["acid"]: entry for entry in feature_ctx["data"]["acids"]}
        check(acid_1 in acids_by_id, f"acid feature did not see {acid_1}")
        check(acid_2 in acids_by_id, f"acid feature did not see {acid_2}")

        step("cross-check: acid push --all discovers scrummaster/epics/*/stories/*/spec.md")
        push_result = acid_json(["push", "--all"], checkout, env)
        story_result = next(
            (r for r in push_result["results"] if r["productName"] == PRODUCT_NAME), None
        )
        check(
            story_result is not None,
            f"acid push --all found nothing for product {PRODUCT_NAME!r}: {push_result}",
        )
        check(
            story_result["specsUpdated"] == 2,
            f"expected acid push --all to recognize both existing ACIDs as updates, got: {story_result}",
        )

        step("/scrummaster-implement (simulated): close one ACID ticket directly via fossil")
        sql = run(
            ["fossil", "sql", "--readonly"], checkout, env,
            input_text=f".mode json\nSELECT tkt_uuid FROM ticket WHERE acid='{acid_1}';",
        )
        ticket_uuid = json.loads(sql.stdout)[0]["tkt_uuid"]
        run(["fossil", "ticket", "change", ticket_uuid, "status", "Closed"], checkout, env)

        step("cross-check: acid feature reflects the ticket closed via raw fossil, same as /scrummaster-status's own fossil sql would")
        status_sql = run(
            ["fossil", "sql", "--readonly"], checkout, env,
            input_text=f".mode json\nSELECT acid, status FROM ticket WHERE story_id='{STORY_ID}';",
        )
        fossil_status_by_acid = {row["acid"]: row["status"] for row in json.loads(status_sql.stdout)}
        check(fossil_status_by_acid[acid_1] == "Closed", "raw fossil ticket close did not take effect")

        feature_after = acid_json(
            ["feature", STORY_ID, "--product", PRODUCT_NAME, "--impl", "trunk"], checkout, env
        )
        acids_after = {entry["acid"]: entry for entry in feature_after["data"]["acids"]}
        check(
            acids_after[acid_1]["state"]["status"] == "completed",
            "acid feature did not reflect a ticket closed via fossil's built-in status field "
            f"(the /scrummaster-implement path, not acid set-status): got {acids_after[acid_1]['state']}",
        )

        features_after = acid_json(
            ["features", "--product", PRODUCT_NAME, "--impl", "trunk"], checkout, env
        )
        story_summary = next(
            f for f in features_after["data"]["features"] if f["feature_name"] == STORY_ID
        )
        check(
            story_summary["completed_count"] == 1,
            f"acid features completed_count did not match acid feature's per-ACID state: {story_summary}",
        )

        print("\nAll cross-checks passed.")
        return 0
    finally:
        shutil.rmtree(workdir, ignore_errors=True)


if __name__ == "__main__":
    try:
        sys.exit(main())
    except SmokeTestFailure as error:
        print(f"\n❌ e2e smoke test failed: {error}", file=sys.stderr)
        sys.exit(1)
