import { describe, expect, it } from "vitest";
import { readScrummasterContext, type ReadTextFile } from "../src/context.js";

describe("readScrummasterContext", () => {
	it("reads only the context files that exist, in a fixed order", async () => {
		const readTextFile: ReadTextFile = async (path) => {
			if (path.endsWith("product.md")) return "# Product";
			if (path.endsWith("workflow.md")) return "# Workflow";
			throw new Error("ENOENT");
		};

		const files = await readScrummasterContext("/repo", readTextFile);
		expect(files).toEqual([
			{ name: "product.md", content: "# Product" },
			{ name: "workflow.md", content: "# Workflow" },
		]);
	});

	it("returns an empty array when no context files exist yet", async () => {
		const readTextFile: ReadTextFile = async () => {
			throw new Error("ENOENT");
		};
		await expect(readScrummasterContext("/repo", readTextFile)).resolves.toEqual([]);
	});

	it("reads from the scrummaster/ subdirectory of the given cwd", async () => {
		const seenPaths: string[] = [];
		const readTextFile: ReadTextFile = async (path) => {
			seenPaths.push(path);
			throw new Error("ENOENT");
		};
		await readScrummasterContext("/repo", readTextFile);
		expect(seenPaths).toEqual([
			"/repo/scrummaster/product.md",
			"/repo/scrummaster/product-guidelines.md",
			"/repo/scrummaster/tech-stack.md",
			"/repo/scrummaster/workflow.md",
		]);
	});
});
