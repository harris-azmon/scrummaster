#!/usr/bin/env node
// Materializes this package's bundled Scrummaster Turbo Mode agent files
// (scrummaster-product-manager, scrummaster-software-architect) into the
// consuming project's OpenCode project-agent directory (`.opencode/agent/`),
// so they are available as spawnable subagents. Run explicitly via
// `npx scrummaster-opencode-install-agents` - deliberately not a postinstall
// hook, since writing into a consumer's project tree on every `npm install`
// is surprising and commonly blocked by `ignore-scripts`.
import { cp, mkdir, readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export async function installAgents(
	targetProjectRoot: string = process.cwd(),
): Promise<number> {
	const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)));
	const bundledAgentsDir = join(packageRoot, "agents");
	const targetDir = join(targetProjectRoot, ".opencode", "agent");

	await mkdir(targetDir, { recursive: true });

	const entries = await readdir(bundledAgentsDir, { withFileTypes: true });
	let copied = 0;
	for (const entry of entries) {
		if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
		await cp(join(bundledAgentsDir, entry.name), join(targetDir, entry.name));
		copied += 1;
	}

	return copied;
}

const invokedDirectly =
	process.argv[1] !== undefined && fileURLToPath(import.meta.url) === process.argv[1];

if (invokedDirectly) {
	installAgents()
		.then((copied) => {
			console.log(
				`Installed ${copied} Scrummaster agent(s) into ${join(process.cwd(), ".opencode", "agent")}`,
			);
		})
		.catch((error: unknown) => {
			console.error(error instanceof Error ? error.message : String(error));
			process.exitCode = 1;
		});
}
