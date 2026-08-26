import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Mirrors templates/fossil/ticket_schema.sql at the repo root (kept as a
// standalone copy here so the vendored acid-cli package's own test suite
// stays runnable without reaching outside vendor/acid-cli). Keep these two
// files in sync if the ticket schema ever changes.
const TICKET_SCHEMA_SQL = `
ALTER TABLE ticket ADD COLUMN epic_id TEXT;
ALTER TABLE ticket ADD COLUMN story_id TEXT;
ALTER TABLE ticket ADD COLUMN acid TEXT;
ALTER TABLE ticket ADD COLUMN component TEXT;
ALTER TABLE ticket ADD COLUMN deprecated BOOLEAN DEFAULT 0;
ALTER TABLE ticket ADD COLUMN acai_status TEXT;
ALTER TABLE ticket ADD COLUMN acai_comment TEXT;
ALTER TABLE ticket ADD COLUMN last_seen_commit TEXT;
CREATE INDEX IF NOT EXISTS ticket_story_id_idx ON ticket(story_id);
CREATE INDEX IF NOT EXISTS ticket_epic_id_idx ON ticket(epic_id);
CREATE INDEX IF NOT EXISTS ticket_acid_idx ON ticket(acid);
`;

export interface SeedTicket {
	acid: string;
	requirement: string;
	component?: string;
	status?: string;
	acaiStatus?: string;
	acaiComment?: string;
	lastSeenCommit?: string;
}

export interface CreateFakeFossilContextOptions {
	/** `fossil info`'s project-name, i.e. the ACID product name. Defaults to "example-product". */
	projectName?: string;
	/** Tickets to seed via real `fossil ticket add` calls before the test runs. */
	seedTickets?: SeedTicket[];
	/** Set false to skip `fossil open` entirely (e.g. to test the "no fossil context" error path). */
	openCheckout?: boolean;
	/** Set false to open the checkout but skip applying the ticket schema (e.g. to trigger a real `fossil sql` failure). */
	applySchema?: boolean;
}

export interface FakeFossilContext {
	/** The open Fossil checkout directory. Use as the CLI subprocess cwd and as the workspace root for spec/source files. */
	root: string;
	/** Env overrides (currently just USER, which real `fossil` subprocess calls require) to merge into the CLI subprocess env. */
	env: Record<string, string>;
	cleanup(): Promise<void>;
}

async function runFossil(
	args: string[],
	cwd: string,
	env: Record<string, string>,
	input?: string,
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
	const proc = Bun.spawn({
		cmd: ["fossil", ...args],
		cwd,
		env: { ...process.env, ...env },
		stdin: input === undefined ? "ignore" : new TextEncoder().encode(input),
		stdout: "pipe",
		stderr: "pipe",
	});

	const [stdout, stderr, exitCode] = await Promise.all([
		new Response(proc.stdout).text(),
		new Response(proc.stderr).text(),
		proc.exited,
	]);

	if (exitCode !== 0) {
		throw new Error(
			`fossil ${args.join(" ")} failed (exit ${exitCode}): ${stderr || stdout}`,
		);
	}

	return { exitCode, stdout, stderr };
}

// Real fossil fixture: an actual `fossil init`/`open` checkout with the
// Scrummaster ticket schema applied, used to exercise the CLI's fossil
// backend end-to-end instead of mocking HTTP or faking a `git` binary.
export async function createFakeFossilContext(
	options: CreateFakeFossilContextOptions = {},
): Promise<FakeFossilContext> {
	const base = await mkdtemp(join(tmpdir(), "acid-fossil-"));
	const repoPath = join(base, "repo.fossil");
	const root = join(base, "checkout");
	await mkdir(root, { recursive: true });

	const env: Record<string, string> = {
		USER: process.env.USER || process.env.LOGNAME || "acid-e2e-test",
	};
	const projectName = options.projectName ?? "example-product";

	await runFossil(["init", repoPath, "--project-name", projectName], base, env);

	if (options.openCheckout ?? true) {
		await runFossil(["open", repoPath], root, env);
		if (options.applySchema ?? true) {
			await runFossil(["sql"], root, env, TICKET_SCHEMA_SQL);
		}

		for (const ticket of options.seedTickets ?? []) {
			await runFossil(
				[
					"ticket",
					"add",
					"type",
					"Story",
					"story_id",
					ticket.acid.split(".", 1)[0] ?? ticket.acid,
					"acid",
					ticket.acid,
					"component",
					ticket.component ?? ticket.acid.split(".")[1] ?? "",
					"status",
					ticket.status ?? "Open",
					"title",
					ticket.requirement,
					"deprecated",
					"0",
					"last_seen_commit",
					ticket.lastSeenCommit ?? "",
					...(ticket.acaiStatus !== undefined
						? ["acai_status", ticket.acaiStatus]
						: []),
					...(ticket.acaiComment !== undefined
						? ["acai_comment", ticket.acaiComment]
						: []),
				],
				root,
				env,
			);
		}
	}

	return {
		root,
		env,
		cleanup: async () => {
			await rm(base, { recursive: true, force: true });
		},
	};
}
