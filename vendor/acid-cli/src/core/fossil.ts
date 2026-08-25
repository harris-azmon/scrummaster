import { basename } from "node:path";
import { runtimeError } from "./errors.ts";
import { defaultRuntime } from "./runtime.ts";

export interface FossilContext {
	repoUri: string;
	branchName: string;
}

export interface FossilPushContext extends FossilContext {
	commitHash: string;
}

// push.MAIN.8 / push.SCAN.3
export async function readFossilRepoRoot(
	options: { cwd?: string; runner?: FossilCommandRunner } = {},
): Promise<string> {
	const cwd = options.cwd ?? process.cwd();
	const runner = options.runner ?? defaultFossilRunner;
	const info = await runFossilInfo(runner, cwd);
	const localRoot = info["local-root"];
	if (!localRoot) {
		throw runtimeError("Not within an open Fossil checkout.");
	}
	return localRoot.replace(/\/$/, "");
}

export interface FossilCommandResult {
	exitCode: number;
	stdout: string;
	stderr: string;
}

export interface FossilCommandRunner {
	run(args: string[], cwd: string): Promise<FossilCommandResult>;
}

const defaultFossilRunner: FossilCommandRunner = {
	async run(args, cwd) {
		return defaultRuntime.runCommand("fossil", args, { cwd });
	},
};

// cli-core.TARGETING.2 / cli-core.ERRORS.2
export async function readFossilContext(
	options: { cwd?: string; runner?: FossilCommandRunner } = {},
): Promise<FossilContext> {
	const cwd = options.cwd ?? process.cwd();
	const runner = options.runner ?? defaultFossilRunner;

	try {
		const info = await runFossilInfo(runner, cwd);
		// `fossil info`'s "project-name:" is "<unnamed>" unless explicitly set
		// (`fossil config set project-name`); fall back to the checkout's
		// directory name, mirroring how a git repo without a remote falls back
		// to its directory name.
		const repoUri =
			normalizeRepoUri(info["project-name"] ?? "") ??
			normalizeRepoUri(basename(info["local-root"] ?? ""));
		// Scrummaster defaults to Cathedral-style, trunk-oriented development —
		// there is normally exactly one branch (trunk); fossil's tags line still
		// reports the current branch name for projects that deviate from that
		// default.
		const branchName = (info["tags"] ?? "trunk").split(",")[0]?.trim() ?? "trunk";

		if (!repoUri || !branchName) {
			throw runtimeError("Fossil context could not be determined.");
		}

		return { repoUri, branchName };
	} catch (error) {
		if (error instanceof Error && error.name === "CliError") {
			throw error;
		}
		throw runtimeError(
			"Fossil context could not be determined.",
			undefined,
			error,
		);
	}
}

// push.MAIN.7 / push.SCAN.3 / push.SAFETY.2
export async function readFossilPushContext(
	options: { cwd?: string; runner?: FossilCommandRunner } = {},
): Promise<FossilPushContext> {
	const cwd = options.cwd ?? process.cwd();
	const runner = options.runner ?? defaultFossilRunner;

	const [context, commitHash] = await Promise.all([
		readFossilContext({ cwd, runner }),
		readFossilCommitHash({ cwd, runner }),
	]);

	return { ...context, commitHash };
}

// push.SCAN.3 / push.SAFETY.2
export async function readFossilCommitHash(
	options: { cwd?: string; runner?: FossilCommandRunner } = {},
): Promise<string> {
	const cwd = options.cwd ?? process.cwd();
	const runner = options.runner ?? defaultFossilRunner;
	const info = await runFossilInfo(runner, cwd);
	const checkout = info["checkout"];
	if (!checkout) {
		throw runtimeError("Not within an open Fossil checkout.");
	}
	// The "checkout:" line is "<hash> <date> UTC" — take the hash only.
	return checkout.split(/\s+/, 1)[0] ?? "";
}

// push.SCAN.3 / push.SAFETY.2
export async function readFossilFileLastSeenCommit(
	filePath: string,
	options: {
		cwd?: string;
		runner?: FossilCommandRunner;
	} = {},
): Promise<string> {
	const cwd = options.cwd ?? process.cwd();
	const runner = options.runner ?? defaultFossilRunner;
	const result = await runner.run(["finfo", "-b", filePath], cwd);
	if (result.exitCode !== 0) {
		// Mirrors git's forgiving behavior (`git log -- <path>` on an untracked
		// file returns empty, not an error) — `fossil finfo` errors instead
		// ("no history for file") for a file with no commits yet. The caller
		// (push.ts's resolveSpecLastSeenCommit) falls back to the current
		// checkout's commit hash when this comes back empty.
		return "";
	}
	// `fossil finfo -b` ("brief") prints one line per revision, most recent
	// first, formatted as "<hash> <date> <comment>". Take the newest hash.
	const firstLine = result.stdout.trim().split("\n")[0] ?? "";
	return firstLine.split(/\s+/, 1)[0] ?? "";
}

export function normalizeRepoUri(nameOrUri: string): string | null {
	const trimmed = nameOrUri.trim();
	if (!trimmed || trimmed === "<unnamed>") return null;
	return trimmed;
}

async function runFossilInfo(
	runner: FossilCommandRunner,
	cwd: string,
): Promise<Record<string, string>> {
	const result = await runner.run(["info"], cwd);
	if (result.exitCode !== 0) {
		throw new Error(result.stderr || "fossil info failed");
	}
	return parseFossilInfo(result.stdout);
}

// `fossil info` prints "key:      value" pairs, one per line.
function parseFossilInfo(stdout: string): Record<string, string> {
	const info: Record<string, string> = {};
	for (const line of stdout.split("\n")) {
		const match = line.match(/^([a-zA-Z-]+):\s*(.*)$/);
		if (!match) continue;
		const [, key, value] = match;
		if (key) info[key] = (value ?? "").trim();
	}
	return info;
}
