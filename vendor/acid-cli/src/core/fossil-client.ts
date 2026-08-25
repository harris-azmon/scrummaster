import { runtimeError } from "./errors.ts";
import { defaultRuntime, type RuntimeCompat } from "./runtime.ts";
import type { ApiClient, ListImplementationsResponse } from "./api.ts";
import type { PushRequest } from "./push.ts";

export interface FossilClientConfig {
	cwd?: string;
	runtime?: RuntimeCompat;
}

interface TicketRow {
	tkt_uuid: string;
	epic_id: string | null;
	story_id: string | null;
	acid: string | null;
	component: string | null;
	status: string | null;
	acai_status: string | null;
	acai_comment: string | null;
	title: string | null;
	deprecated: number;
	last_seen_commit: string | null;
}

// The acai.sh "feature" concept maps onto a Scrummaster "story": the part of
// an ACID before its first '.' is the story_id.
function storyIdFromAcid(acid: string): string {
	return acid.split(".", 1)[0] ?? acid;
}

export function createFossilClient(
	config: FossilClientConfig = {},
): ApiClient {
	const cwd = config.cwd ?? process.cwd();
	const runtime = config.runtime ?? defaultRuntime;

	return {
		async listImplementations(input) {
			return listImplementations(runtime, cwd, input);
		},
		async listImplementationFeatures(input) {
			return listImplementationFeatures(runtime, cwd, input);
		},
		async getFeatureContext(input) {
			return getFeatureContext(runtime, cwd, input);
		},
		async push(input) {
			return runPush(runtime, cwd, input);
		},
		async setFeatureStates(input) {
			return setFeatureStates(runtime, cwd, input);
		},
	};
}

async function runFossil(
	runtime: RuntimeCompat,
	cwd: string,
	args: string[],
): Promise<string> {
	const result = await runtime.runCommand("fossil", args, { cwd });
	if (result.exitCode !== 0) {
		throw runtimeError(
			`fossil ${args[0]} failed: ${result.stderr.trim() || "unknown error"}`,
			result.stderr,
		);
	}
	return result.stdout;
}

// Runs a read-only query against the ticket table via `fossil sql` in JSON
// mode. `.mode json` is a standard SQLite-shell dot-command that fossil's
// `sql` command passes straight through to its embedded SQLite shell.
// `fossil sql` has no positional-argument form for SQL text — it only runs
// the sqlite3 shell, reading commands from stdin (verified against fossil
// 2.23), so the script must be piped in.
async function queryTickets(
	runtime: RuntimeCompat,
	cwd: string,
	whereClause: string,
): Promise<TicketRow[]> {
	const script = [
		".mode json",
		`SELECT tkt_uuid, epic_id, story_id, acid, component, status, acai_status, acai_comment, title, deprecated, last_seen_commit FROM ticket WHERE ${whereClause};`,
	].join("\n");
	const result = await runtime.runCommand("fossil", ["sql", "--readonly"], {
		cwd,
		input: script,
	});
	if (result.exitCode !== 0) {
		throw runtimeError(
			`fossil sql failed: ${result.stderr.trim() || "unknown error"}`,
			result.stderr,
		);
	}
	const trimmed = result.stdout.trim();
	if (!trimmed) return [];
	try {
		return JSON.parse(trimmed) as TicketRow[];
	} catch {
		throw runtimeError("Could not parse fossil sql JSON output.", trimmed);
	}
}

function escapeSqlString(value: string): string {
	return value.replace(/'/g, "''");
}

// acai_status carries the richer set-status vocabulary
// (assigned/blocked/incomplete/completed/rejected/accepted); fossil's own
// built-in status (Open/Closed, set directly by e.g. `/scrummaster-implement`'s
// `fossil ticket change ... status Closed`) is a second, independent way a
// ticket ends up "done". Without this fallback, a ticket closed only via
// fossil's own status field would show `acid feature`'s per-ACID status as
// null while `acid features`' completed_count (which already checks
// `status === "Closed"` directly) counted it as done - an internal
// inconsistency between acid-cli's own two read commands.
function resolveAcaiStatus(row: TicketRow): string | null {
	if (row.acai_status) return row.acai_status;
	return row.status === "Closed" ? "completed" : null;
}

async function listImplementations(
	runtime: RuntimeCompat,
	cwd: string,
	input: {
		productName?: string;
		repoUri?: string;
		branchName?: string;
		featureName?: string;
	},
): Promise<ListImplementationsResponse> {
	const productName = input.productName ?? (await resolveProductName(runtime, cwd));

	let whereClause = "1=1";
	if (input.featureName) {
		whereClause = `story_id = '${escapeSqlString(input.featureName)}'`;
	}
	const rows = await queryTickets(runtime, cwd, whereClause);

	// cli-core.TARGETING.1: Scrummaster is trunk-only (Cathedral-style), so
	// there is at most one "implementation" (named "trunk") per product,
	// eliminating the branch-based ambiguity resolution the SaaS backend needs.
	const implementations =
		rows.length > 0
			? [
					{
						implementation_id: "trunk",
						implementation_name: "trunk",
						product_name: productName,
					},
				]
			: [];

	return {
		data: {
			product_name: productName,
			repo_uri: input.repoUri,
			branch_name: input.branchName ?? "trunk",
			implementations,
		},
	};
}

async function resolveProductName(
	runtime: RuntimeCompat,
	cwd: string,
): Promise<string> {
	const output = await runFossil(runtime, cwd, ["info"]);
	const match = output.match(/^project-name:\s*(.*)$/m);
	const name = match?.[1]?.trim();
	if (name && name !== "<unnamed>") return name;
	return cwd.split("/").filter(Boolean).pop() ?? "unknown-product";
}

async function listImplementationFeatures(
	runtime: RuntimeCompat,
	cwd: string,
	input: {
		productName: string;
		implementationName: string;
		statuses?: string[];
		changedSinceCommit?: string;
	},
): Promise<any> {
	const rows = await queryTickets(runtime, cwd, "1=1");
	const byStory = new Map<string, TicketRow[]>();
	for (const row of rows) {
		const storyId = row.story_id ?? (row.acid ? storyIdFromAcid(row.acid) : null);
		if (!storyId) continue;
		const bucket = byStory.get(storyId) ?? [];
		bucket.push(row);
		byStory.set(storyId, bucket);
	}

	const statusFilter = input.statuses?.length
		? new Set(input.statuses)
		: undefined;

	const features = [...byStory.entries()]
		.filter(([, ticketRows]) =>
			statusFilter
				? ticketRows.some((row) => {
						const status = resolveAcaiStatus(row);
						return status !== null && statusFilter.has(status);
					})
				: true,
		)
		.map(([featureName, ticketRows]) => {
			const total = ticketRows.length;
			const completed = ticketRows.filter((row) => row.status === "Closed").length;
			const refsCount = 0; // local scan-based ref counting happens in push.ts, not persisted per-feature here
			return {
				feature_name: featureName,
				total_count: total,
				completed_count: completed,
				refs_count: refsCount,
				test_refs_count: 0,
				has_local_spec: true,
				has_local_states: ticketRows.some((row) => resolveAcaiStatus(row) !== null),
				states_inherited: false,
				spec_last_seen_commit: ticketRows[0]?.last_seen_commit ?? "",
			};
		})
		.sort((left, right) => left.feature_name.localeCompare(right.feature_name));

	return {
		data: {
			product_name: input.productName,
			implementation_name: input.implementationName,
			features,
		},
	};
}

async function getFeatureContext(
	runtime: RuntimeCompat,
	cwd: string,
	input: {
		productName: string;
		featureName: string;
		implementationName: string;
		includeRefs?: boolean;
		statuses?: string[];
	},
): Promise<any> {
	const rows = await queryTickets(
		runtime,
		cwd,
		`story_id = '${escapeSqlString(input.featureName)}'`,
	);

	const statusFilter = input.statuses?.length
		? new Set(input.statuses)
		: undefined;
	const filtered = statusFilter
		? rows.filter((row) => {
				const status = resolveAcaiStatus(row);
				return status !== null && statusFilter.has(status);
			})
		: rows;

	const statusCounts: Record<string, number> = {};
	for (const row of filtered) {
		const key = resolveAcaiStatus(row) ?? "null";
		statusCounts[key] = (statusCounts[key] ?? 0) + 1;
	}

	const acids = filtered.map((row) => ({
		acid: row.acid ?? "",
		state: { status: resolveAcaiStatus(row) },
		refs_count: 0,
		test_refs_count: 0,
		requirement: row.title ?? "",
		...(input.includeRefs ? { refs: [] } : {}),
	}));

	return {
		data: {
			product_name: input.productName,
			implementation_name: input.implementationName,
			feature_name: input.featureName,
			summary: {
				total_acids: filtered.length,
				status_counts: statusCounts,
			},
			acids,
			warnings: [] as string[],
		},
	};
}

async function runPush(
	runtime: RuntimeCompat,
	cwd: string,
	input: PushRequest,
): Promise<any> {
	let specsCreated = 0;
	let specsUpdated = 0;
	const warnings: string[] = [];

	for (const spec of input.specs ?? []) {
		for (const [acid, requirement] of Object.entries(spec.requirements ?? {})) {
			const storyId = storyIdFromAcid(acid);
			const component = acid.split(".")[1] ?? "";
			const existing = await queryTickets(
				runtime,
				cwd,
				`acid = '${escapeSqlString(acid)}'`,
			);

			if (existing.length === 0) {
				await runFossil(runtime, cwd, [
					"ticket",
					"add",
					"type",
					"Story",
					"story_id",
					storyId,
					"acid",
					acid,
					"component",
					component,
					"status",
					"Open",
					"title",
					requirement.requirement,
					"deprecated",
					requirement.deprecated ? "1" : "0",
					"last_seen_commit",
					spec.meta.last_seen_commit,
					...(spec.feature.epic_id ? ["epic_id", spec.feature.epic_id] : []),
				]);
				specsCreated += 1;
			} else {
				const ticket = existing[0]!;
				await runFossil(runtime, cwd, [
					"ticket",
					"change",
					ticket.tkt_uuid,
					"title",
					requirement.requirement,
					"deprecated",
					requirement.deprecated ? "1" : "0",
					"last_seen_commit",
					spec.meta.last_seen_commit,
					...(spec.feature.epic_id ? ["epic_id", spec.feature.epic_id] : []),
				]);
				specsUpdated += 1;
			}
		}
	}

	const referenceCount = input.references?.data
		? Object.values(input.references.data).reduce(
				(total, refs) => total + refs.length,
				0,
			)
		: 0;
	if (referenceCount > 0) {
		warnings.push(
			`${referenceCount} code reference(s) scanned; local fossil backend does not persist per-reference storage (use \`acid feature <name> --include-refs\` against a fresh scan instead).`,
		);
	}

	return {
		data: {
			product_name: input.product_name,
			implementation_name: "trunk",
			specs_created: specsCreated,
			specs_updated: specsUpdated,
			warnings,
		},
	};
}

async function setFeatureStates(
	runtime: RuntimeCompat,
	cwd: string,
	input: {
		product_name: string;
		feature_name: string;
		implementation_name: string;
		states: Record<string, { status: string | null; comment?: string }>;
	},
): Promise<any> {
	let statesWritten = 0;
	const warnings: string[] = [];

	for (const [acid, state] of Object.entries(input.states)) {
		const existing = await queryTickets(
			runtime,
			cwd,
			`acid = '${escapeSqlString(acid)}'`,
		);
		if (existing.length === 0) {
			warnings.push(`No ticket found for ACID '${acid}'; skipped.`);
			continue;
		}

		const args = [
			"ticket",
			"change",
			existing[0]!.tkt_uuid,
			"acai_status",
			state.status ?? "",
		];
		if (state.comment !== undefined) {
			args.push("acai_comment", state.comment);
		}
		await runFossil(runtime, cwd, args);
		statesWritten += 1;
	}

	return {
		data: {
			product_name: input.product_name,
			implementation_name: input.implementation_name,
			feature_name: input.feature_name,
			states_written: statesWritten,
			warnings,
		},
	};
}
