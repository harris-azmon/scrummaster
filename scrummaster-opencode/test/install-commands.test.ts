import { describe, expect, it, afterEach } from "vitest";
import { mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { installCommands } from "../src/install-commands.js";

const cleanupDirs: string[] = [];

afterEach(async () => {
	while (cleanupDirs.length > 0) {
		const dir = cleanupDirs.pop();
		if (dir) await rm(dir, { recursive: true, force: true });
	}
});

describe("installCommands", () => {
	it("copies bundled command markdown files into <project>/.opencode/commands/", async () => {
		const projectRoot = await mkdtemp(join(tmpdir(), "opencode-install-"));
		cleanupDirs.push(projectRoot);

		const copied = await installCommands(projectRoot);

		expect(copied).toBeGreaterThan(0);
		const installedFiles = await readdir(join(projectRoot, ".opencode", "commands"));
		expect(installedFiles).toContain("scrummaster-setup.md");
		expect(installedFiles.every((name) => name.endsWith(".md"))).toBe(true);
	});

	it("is idempotent: running it twice does not duplicate or fail", async () => {
		const projectRoot = await mkdtemp(join(tmpdir(), "opencode-install-"));
		cleanupDirs.push(projectRoot);

		await installCommands(projectRoot);
		const secondRun = await installCommands(projectRoot);
		const installedFiles = await readdir(join(projectRoot, ".opencode", "commands"));

		expect(secondRun).toBe(installedFiles.length);
	});

	it("creates .opencode/commands/ from scratch when the project has none yet", async () => {
		const projectRoot = await mkdtemp(join(tmpdir(), "opencode-install-"));
		cleanupDirs.push(projectRoot);
		await writeFile(join(projectRoot, "README.md"), "hello");

		await installCommands(projectRoot);

		const installedFiles = await readdir(join(projectRoot, ".opencode", "commands"));
		expect(installedFiles.length).toBeGreaterThan(0);
	});
});
