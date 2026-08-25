import { spawn } from "node:child_process";

export interface CommandResult {
	exitCode: number;
	stdout: string;
	stderr: string;
}

export interface CommandRunner {
	run(args: string[], cwd: string, input?: string): Promise<CommandResult>;
}

export const defaultFossilRunner: CommandRunner = {
	run(args, cwd, input) {
		return new Promise((resolve, reject) => {
			const child = spawn("fossil", args, {
				cwd,
				stdio: [input === undefined ? "ignore" : "pipe", "pipe", "pipe"],
			});

			if (input !== undefined) child.stdin?.end(input);

			let stdout = "";
			let stderr = "";
			child.stdout?.setEncoding("utf8");
			child.stderr?.setEncoding("utf8");
			child.stdout?.on("data", (chunk) => {
				stdout += chunk;
			});
			child.stderr?.on("data", (chunk) => {
				stderr += chunk;
			});
			child.once("error", reject);
			child.once("close", (code, signal) => {
				resolve({ exitCode: code ?? (signal ? 1 : 0), stdout, stderr });
			});
		});
	},
};

export interface TicketRow {
	tkt_uuid: string;
	epic_id: string | null;
	story_id: string | null;
	acid: string | null;
	component: string | null;
	status: string | null;
	acai_status: string | null;
	title: string | null;
	deprecated: number | null;
}

const TICKET_COLUMNS =
	"tkt_uuid, epic_id, story_id, acid, component, status, acai_status, title, deprecated";

function escapeSqlString(value: string): string {
	return value.replace(/'/g, "''");
}

export class FossilQueryError extends Error {}

// Queries the Scrummaster ticket schema (templates/fossil/ticket_schema.sql
// at the monorepo root) applied by `/scrummaster-setup`. Returns an empty
// array (not an error) if the schema hasn't been applied yet or the cwd
// isn't an open Fossil checkout - callers should surface that as "no
// Scrummaster status available yet" rather than a hard failure.
export async function queryTickets(
	cwd: string,
	whereClause = "1=1",
	runner: CommandRunner = defaultFossilRunner,
): Promise<TicketRow[]> {
	const script = [".mode json", `SELECT ${TICKET_COLUMNS} FROM ticket WHERE ${whereClause};`].join(
		"\n",
	);
	const result = await runner.run(["sql", "--readonly"], cwd, script);
	if (result.exitCode !== 0) {
		throw new FossilQueryError(
			`fossil sql failed: ${result.stderr.trim() || "unknown error"}`,
		);
	}

	const trimmed = result.stdout.trim();
	if (!trimmed) return [];
	try {
		return JSON.parse(trimmed) as TicketRow[];
	} catch {
		return [];
	}
}

export function queryTicketsByEpic(
	cwd: string,
	epicId: string,
	runner: CommandRunner = defaultFossilRunner,
): Promise<TicketRow[]> {
	return queryTickets(cwd, `epic_id = '${escapeSqlString(epicId)}'`, runner);
}

export interface StoryRollup {
	storyId: string;
	total: number;
	completed: number;
	acids: string[];
}

export interface EpicRollup {
	epicId: string;
	stories: StoryRollup[];
}

export interface StatusSummary {
	epics: EpicRollup[];
	unassigned: StoryRollup[];
}

// Groups ticket rows into epic -> story -> ACID completion rollups. A
// ticket counts as "completed" via its acai_status field (set-status's own
// vocabulary), falling back to the fossil ticket's built-in Open/Closed
// status when acai_status hasn't been set.
export function summarizeStatus(rows: TicketRow[]): StatusSummary {
	const byEpic = new Map<string, Map<string, TicketRow[]>>();
	const unassignedByStory = new Map<string, TicketRow[]>();

	for (const row of rows) {
		const storyId = row.story_id ?? row.acid?.split(".", 1)[0] ?? "unknown";
		if (row.epic_id) {
			const stories = byEpic.get(row.epic_id) ?? new Map<string, TicketRow[]>();
			const bucket = stories.get(storyId) ?? [];
			bucket.push(row);
			stories.set(storyId, bucket);
			byEpic.set(row.epic_id, stories);
			continue;
		}

		const bucket = unassignedByStory.get(storyId) ?? [];
		bucket.push(row);
		unassignedByStory.set(storyId, bucket);
	}

	const toStoryRollup = (storyId: string, storyRows: TicketRow[]): StoryRollup => ({
		storyId,
		total: storyRows.length,
		completed: storyRows.filter(isRowCompleted).length,
		acids: storyRows.map((row) => row.acid ?? "").filter(Boolean).sort(),
	});

	const epics: EpicRollup[] = [...byEpic.entries()]
		.map(([epicId, stories]) => ({
			epicId,
			stories: [...stories.entries()]
				.map(([storyId, storyRows]) => toStoryRollup(storyId, storyRows))
				.sort((left, right) => left.storyId.localeCompare(right.storyId)),
		}))
		.sort((left, right) => left.epicId.localeCompare(right.epicId));

	const unassigned = [...unassignedByStory.entries()]
		.map(([storyId, storyRows]) => toStoryRollup(storyId, storyRows))
		.sort((left, right) => left.storyId.localeCompare(right.storyId));

	return { epics, unassigned };
}

function isRowCompleted(row: TicketRow): boolean {
	if (row.acai_status) return row.acai_status === "completed" || row.acai_status === "accepted";
	return row.status === "Closed";
}
