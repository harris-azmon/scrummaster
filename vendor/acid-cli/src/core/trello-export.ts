import { usageError, runtimeError } from "./errors.ts";
import type { CommandResult } from "./output.ts";
import { defaultRuntime, type RuntimeCompat } from "./runtime.ts";

// One-way export: fossil ticket state -> Trello. One board per project, one
// list per story status, one card per story (its ACIDs rendered as a
// checklist description), one label per epic. No import path back.

const TRELLO_API_BASE = "https://api.trello.com/1";
const STORY_LISTS = ["Backlog", "In Progress", "Done"] as const;
type StoryList = (typeof STORY_LISTS)[number];

export interface TrelloExportCommandOptions {
	product?: string;
	boardName?: string;
	json?: boolean;
}

export interface TrelloExportArgs {
	productName?: string;
	boardName?: string;
	json: boolean;
}

export interface TrelloCredentials {
	apiKey: string;
	token: string;
}

interface TicketRow {
	tkt_uuid: string;
	epic_id: string | null;
	story_id: string | null;
	acid: string | null;
	status: string | null;
	title: string | null;
}

export interface TrelloExportDependencies {
	cwd?: string;
	runtime?: RuntimeCompat;
	fetchImpl?: typeof fetch;
	env?: Record<string, string | undefined>;
}

// trello-export.MAIN.1
export function normalizeTrelloExportOptions(
	options: TrelloExportCommandOptions,
): TrelloExportArgs {
	if (options.product?.startsWith("-")) {
		throw usageError("Missing value for --product.");
	}
	if (options.boardName?.startsWith("-")) {
		throw usageError("Missing value for --board-name.");
	}

	return {
		productName: options.product,
		boardName: options.boardName,
		json: options.json ?? false,
	};
}

// trello-export.AUTH.1
export function resolveTrelloCredentials(
	env: Record<string, string | undefined> = process.env,
): TrelloCredentials {
	const apiKey = env.TRELLO_API_KEY;
	const token = env.TRELLO_TOKEN;
	if (!apiKey || !token) {
		throw usageError(
			"Missing Trello credentials. Set TRELLO_API_KEY and TRELLO_TOKEN.",
		);
	}
	return { apiKey, token };
}

// trello-export.API.1
export async function runTrelloExportCommand(
	args: TrelloExportArgs,
	dependencies: TrelloExportDependencies = {},
): Promise<CommandResult> {
	const cwd = dependencies.cwd ?? process.cwd();
	const runtime = dependencies.runtime ?? defaultRuntime;
	const fetchImpl = dependencies.fetchImpl ?? fetch;
	const credentials = resolveTrelloCredentials(dependencies.env);
	const boardName =
		args.boardName ?? args.productName ?? (await resolveProductName(runtime, cwd));

	const tickets = await queryAllTickets(runtime, cwd);
	if (tickets.length === 0) {
		return {
			exitCode: 0,
			stdoutLines: ["No stories found to export (no ACID tickets in this repository)."],
		};
	}

	const boardId = await ensureBoard(fetchImpl, credentials, boardName);
	const listIds = await ensureLists(fetchImpl, credentials, boardId);
	const epicLabelIds = await ensureEpicLabels(
		fetchImpl,
		credentials,
		boardId,
		tickets,
	);

	const byStory = groupByStory(tickets);
	let cardsCreated = 0;
	let cardsUpdated = 0;
	const warnings: string[] = [];

	for (const [storyId, storyTickets] of byStory) {
		const epicId = storyTickets[0]?.epic_id ?? undefined;
		const listName = storyListForTickets(storyTickets);
		const description = renderStoryDescription(storyId, storyTickets);
		const labelId = epicId ? epicLabelIds.get(epicId) : undefined;

		const result = await upsertCard(fetchImpl, credentials, {
			boardId,
			listId: listIds[listName],
			title: storyId,
			description,
			labelId,
		});
		if (result === "created") cardsCreated += 1;
		if (result === "updated") cardsUpdated += 1;
	}

	const payload = {
		board_name: boardName,
		board_id: boardId,
		stories_exported: byStory.size,
		cards_created: cardsCreated,
		cards_updated: cardsUpdated,
		warnings,
	};

	if (args.json) {
		return { exitCode: 0, jsonPayload: payload, stderrLines: warnings };
	}

	return {
		exitCode: 0,
		stdoutLines: [
			`BOARD: ${payload.board_name} (${payload.board_id})`,
			`STORIES: ${payload.stories_exported}`,
			`CARDS: ${payload.cards_created} created, ${payload.cards_updated} updated`,
		],
	};
}

function groupByStory(tickets: TicketRow[]): Map<string, TicketRow[]> {
	const byStory = new Map<string, TicketRow[]>();
	for (const ticket of tickets) {
		const storyId = ticket.story_id ?? "unknown-story";
		const bucket = byStory.get(storyId) ?? [];
		bucket.push(ticket);
		byStory.set(storyId, bucket);
	}
	return byStory;
}

function storyListForTickets(tickets: TicketRow[]): StoryList {
	const total = tickets.length;
	const closed = tickets.filter((ticket) => ticket.status === "Closed").length;
	if (closed === total) return "Done";
	if (closed > 0) return "In Progress";
	return "Backlog";
}

function renderStoryDescription(storyId: string, tickets: TicketRow[]): string {
	const lines = [`**Story:** ${storyId}`, "", "**ACIDs:**"];
	for (const ticket of tickets) {
		const box = ticket.status === "Closed" ? "[x]" : "[ ]";
		lines.push(`- ${box} \`${ticket.acid}\` — ${ticket.title ?? ""}`);
	}
	return lines.join("\n");
}

async function resolveProductName(
	runtime: RuntimeCompat,
	cwd: string,
): Promise<string> {
	const result = await runtime.runCommand("fossil", ["info"], { cwd });
	const match = result.stdout.match(/^project-name:\s*(.*)$/m);
	const name = match?.[1]?.trim();
	if (name && name !== "<unnamed>") return name;
	return cwd.split("/").filter(Boolean).pop() ?? "scrummaster-project";
}

async function queryAllTickets(
	runtime: RuntimeCompat,
	cwd: string,
): Promise<TicketRow[]> {
	const script = [
		".mode json",
		"SELECT tkt_uuid, epic_id, story_id, acid, status, title FROM ticket WHERE acid IS NOT NULL;",
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
	return JSON.parse(trimmed) as TicketRow[];
}

async function trelloRequest(
	fetchImpl: typeof fetch,
	credentials: TrelloCredentials,
	method: "GET" | "POST" | "PUT",
	path: string,
	query: Record<string, string> = {},
): Promise<any> {
	const url = new URL(`${TRELLO_API_BASE}${path}`);
	url.searchParams.set("key", credentials.apiKey);
	url.searchParams.set("token", credentials.token);
	for (const [key, value] of Object.entries(query)) {
		url.searchParams.set(key, value);
	}

	const response = await fetchImpl(url.toString(), { method });
	if (!response.ok) {
		throw runtimeError(
			`Trello API request failed: ${method} ${path} -> ${response.status}`,
		);
	}
	return response.json();
}

async function ensureBoard(
	fetchImpl: typeof fetch,
	credentials: TrelloCredentials,
	boardName: string,
): Promise<string> {
	const boards = await trelloRequest(fetchImpl, credentials, "GET", "/members/me/boards", {
		fields: "name",
	});
	const existing = (boards as Array<{ id: string; name: string }>).find(
		(board) => board.name === boardName,
	);
	if (existing) return existing.id;

	const created = await trelloRequest(fetchImpl, credentials, "POST", "/boards", {
		name: boardName,
	});
	return created.id;
}

async function ensureLists(
	fetchImpl: typeof fetch,
	credentials: TrelloCredentials,
	boardId: string,
): Promise<Record<StoryList, string>> {
	const lists = (await trelloRequest(
		fetchImpl,
		credentials,
		"GET",
		`/boards/${boardId}/lists`,
	)) as Array<{ id: string; name: string }>;

	const result = {} as Record<StoryList, string>;
	for (const name of STORY_LISTS) {
		const existing = lists.find((list) => list.name === name);
		if (existing) {
			result[name] = existing.id;
			continue;
		}
		const created = await trelloRequest(
			fetchImpl,
			credentials,
			"POST",
			`/boards/${boardId}/lists`,
			{ name },
		);
		result[name] = created.id;
	}
	return result;
}

async function ensureEpicLabels(
	fetchImpl: typeof fetch,
	credentials: TrelloCredentials,
	boardId: string,
	tickets: TicketRow[],
): Promise<Map<string, string>> {
	const epicIds = new Set(
		tickets.map((ticket) => ticket.epic_id).filter((id): id is string => Boolean(id)),
	);
	const labels = (await trelloRequest(
		fetchImpl,
		credentials,
		"GET",
		`/boards/${boardId}/labels`,
	)) as Array<{ id: string; name: string }>;

	const result = new Map<string, string>();
	for (const epicId of epicIds) {
		const existing = labels.find((label) => label.name === epicId);
		if (existing) {
			result.set(epicId, existing.id);
			continue;
		}
		const created = await trelloRequest(
			fetchImpl,
			credentials,
			"POST",
			`/labels`,
			{ name: epicId, idBoard: boardId, color: "blue" },
		);
		result.set(epicId, created.id);
	}
	return result;
}

async function upsertCard(
	fetchImpl: typeof fetch,
	credentials: TrelloCredentials,
	card: {
		boardId: string;
		listId: string;
		title: string;
		description: string;
		labelId?: string;
	},
): Promise<"created" | "updated"> {
	const existingCards = (await trelloRequest(
		fetchImpl,
		credentials,
		"GET",
		`/boards/${card.boardId}/cards`,
		{ fields: "name" },
	)) as Array<{ id: string; name: string }>;
	const existing = existingCards.find((entry) => entry.name === card.title);

	if (existing) {
		await trelloRequest(fetchImpl, credentials, "PUT", `/cards/${existing.id}`, {
			desc: card.description,
			idList: card.listId,
			...(card.labelId ? { idLabels: card.labelId } : {}),
		});
		return "updated";
	}

	await trelloRequest(fetchImpl, credentials, "POST", "/cards", {
		name: card.title,
		desc: card.description,
		idList: card.listId,
		...(card.labelId ? { idLabels: card.labelId } : {}),
	});
	return "created";
}
