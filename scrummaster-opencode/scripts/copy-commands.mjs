#!/usr/bin/env node
// Bundles this monorepo's shared commands/scrummaster-*.md files into
// scrummaster-opencode/commands/ so the published npm package is
// self-contained (it ships without the rest of the monorepo). Run before
// `tsc` via the "prebuild" script. Source of truth stays commands/*.md at
// the repo root; this is a build-time copy, not a second place to edit.
import { cp, mkdir, readdir, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const monorepoRoot = dirname(packageRoot);
const sourceDir = join(monorepoRoot, "commands");
const destDir = join(packageRoot, "commands");

await rm(destDir, { recursive: true, force: true });
await mkdir(destDir, { recursive: true });

const entries = await readdir(sourceDir, { withFileTypes: true });
let copied = 0;
for (const entry of entries) {
	if (!entry.isFile() || !entry.name.startsWith("scrummaster-") || !entry.name.endsWith(".md")) {
		continue;
	}
	await cp(join(sourceDir, entry.name), join(destDir, entry.name));
	copied += 1;
}

if (copied === 0) {
	throw new Error(`No commands/scrummaster-*.md files found under ${sourceDir}`);
}

console.log(`Copied ${copied} command file(s) into ${destDir}`);
