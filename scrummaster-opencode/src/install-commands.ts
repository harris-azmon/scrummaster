#!/usr/bin/env node
// Materializes this package's bundled Scrummaster command files into the
// consuming project's OpenCode project-command directory
// (`.opencode/commands/`), so `/scrummaster-setup` etc. are guaranteed to
// exist as first-class OpenCode slash commands rather than depending on
// OpenCode's generic Agent Skills auto-discovery. Run explicitly via
// `npx scrummaster-opencode-install` - deliberately not a postinstall hook,
// since writing into a consumer's project tree on every `npm install` is
// surprising and commonly blocked by `ignore-scripts`.
import { cp, mkdir, readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export async function installCommands(
	targetProjectRoot: string = process.cwd(),
): Promise<number> {
	const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)));
	const bundledCommandsDir = join(packageRoot, "commands");
	const targetDir = join(targetProjectRoot, ".opencode", "commands");

	await mkdir(targetDir, { recursive: true });

	const entries = await readdir(bundledCommandsDir, { withFileTypes: true });
	let copied = 0;
	for (const entry of entries) {
		if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
		await cp(join(bundledCommandsDir, entry.name), join(targetDir, entry.name));
		copied += 1;
	}

	return copied;
}

const invokedDirectly =
	process.argv[1] !== undefined && fileURLToPath(import.meta.url) === process.argv[1];

if (invokedDirectly) {
	installCommands()
		.then((copied) => {
			console.log(
				`Installed ${copied} Scrummaster command(s) into ${join(process.cwd(), ".opencode", "commands")}`,
			);
		})
		.catch((error: unknown) => {
			console.error(error instanceof Error ? error.message : String(error));
			process.exitCode = 1;
		});
}
