import { describe, expect, it, afterEach } from "vitest";
import { mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { installAgents } from "../src/install-agents.js";

const cleanupDirs: string[] = [];

afterEach(async () => {
	while (cleanupDirs.length > 0) {
		const dir = cleanupDirs.pop();
		if (dir) await rm(dir, { recursive: true, force: true });
	}
});

describe("installAgents", () => {
	it("copies bundled agent markdown files into <project>/.opencode/agent/", async () => {
		const projectRoot = await mkdtemp(join(tmpdir(), "opencode-install-agents-"));
		cleanupDirs.push(projectRoot);

		const copied = await installAgents(projectRoot);

		expect(copied).toBeGreaterThan(0);
		const installedFiles = await readdir(join(projectRoot, ".opencode", "agent"));
		expect(installedFiles).toContain("scrummaster-product-manager.md");
		expect(installedFiles).toContain("scrummaster-software-architect.md");
		expect(installedFiles.every((name) => name.endsWith(".md"))).toBe(true);
	});

	it("is idempotent: running it twice does not duplicate or fail", async () => {
		const projectRoot = await mkdtemp(join(tmpdir(), "opencode-install-agents-"));
		cleanupDirs.push(projectRoot);

		await installAgents(projectRoot);
		const secondRun = await installAgents(projectRoot);
		const installedFiles = await readdir(join(projectRoot, ".opencode", "agent"));

		expect(secondRun).toBe(installedFiles.length);
	});

	it("creates .opencode/agent/ from scratch when the project has none yet", async () => {
		const projectRoot = await mkdtemp(join(tmpdir(), "opencode-install-agents-"));
		cleanupDirs.push(projectRoot);
		await writeFile(join(projectRoot, "README.md"), "hello");

		await installAgents(projectRoot);

		const installedFiles = await readdir(join(projectRoot, ".opencode", "agent"));
		expect(installedFiles.length).toBeGreaterThan(0);
	});
});
