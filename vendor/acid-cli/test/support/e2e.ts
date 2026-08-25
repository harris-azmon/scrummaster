import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect } from "bun:test";

export interface TempWorkspace {
	root: string;
	cleanup(): Promise<void>;
}

export async function createTempWorkspace(
	files: Record<string, string> = {},
	prefix = "acid-e2e-",
): Promise<TempWorkspace> {
	const root = await mkdtemp(join(tmpdir(), prefix));

	for (const [relativePath, content] of Object.entries(files)) {
		const absolutePath = join(root, relativePath);
		await mkdir(join(absolutePath, ".."), { recursive: true });
		await writeFile(absolutePath, content);
	}

	return {
		root,
		cleanup: async () => {
			await rm(root, { recursive: true, force: true });
		},
	};
}

export function expectUsageError(
	result: { exitCode: number; stderr: string },
	usageText: string,
	messageText?: string,
): void {
	expect(result.exitCode).toBe(2);
	if (messageText) {
		expect(result.stderr).toContain(messageText);
	}
	expect(result.stderr).toContain(usageText);
}
