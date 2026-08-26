import { readFile } from "node:fs/promises";
import { join } from "node:path";

const CONTEXT_FILES = ["product.md", "product-guidelines.md", "tech-stack.md", "workflow.md"] as const;

export interface ContextFile {
	name: string;
	content: string;
}

export interface ReadTextFile {
	(path: string): Promise<string>;
}

const defaultReadTextFile: ReadTextFile = (path) => readFile(path, "utf8");

// Reads the local synced copies of Scrummaster's core context docs
// (the fossil wiki page is authoritative; scrummaster/*.md is the synced
// view `/scrummaster-setup` writes locally for convenient reading). Skips
// any file that doesn't exist yet rather than failing - a project may not
// have run setup, or may not have every optional doc.
export async function readScrummasterContext(
	cwd: string,
	readTextFile: ReadTextFile = defaultReadTextFile,
): Promise<ContextFile[]> {
	const results: ContextFile[] = [];
	for (const name of CONTEXT_FILES) {
		try {
			const content = await readTextFile(join(cwd, "scrummaster", name));
			results.push({ name, content });
		} catch {
			// Optional: not every project has every context file.
		}
	}
	return results;
}
