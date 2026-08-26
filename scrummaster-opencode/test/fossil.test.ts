import { describe, expect, it } from "vitest";
import {
	queryTickets,
	queryTicketsByEpic,
	summarizeStatus,
	FossilQueryError,
	type CommandRunner,
	type TicketRow,
} from "../src/fossil.js";

function fakeRunner(rows: TicketRow[], options: { failOnCall?: number } = {}): CommandRunner {
	let calls = 0;
	return {
		async run(args, _cwd, input) {
			calls += 1;
			if (options.failOnCall === calls) {
				return { exitCode: 1, stdout: "", stderr: "database is locked" };
			}
			expect(args).toEqual(["sql", "--readonly"]);
			expect(input).toContain(".mode json");
			return { exitCode: 0, stdout: JSON.stringify(rows), stderr: "" };
		},
	};
}

describe("queryTickets", () => {
	it("parses fossil sql JSON output into ticket rows", async () => {
		const rows: TicketRow[] = [
			{
				tkt_uuid: "uuid-1",
				epic_id: "epic-1",
				story_id: "login-flow",
				acid: "login-flow.AUTH.1",
				component: "AUTH",
				status: "Open",
				acai_status: "completed",
				title: "user can log in",
				deprecated: 0,
			},
		];
		const result = await queryTickets("/repo", "1=1", fakeRunner(rows));
		expect(result).toEqual(rows);
	});

	it("returns an empty array for empty stdout instead of throwing", async () => {
		const runner: CommandRunner = { async run() { return { exitCode: 0, stdout: "", stderr: "" }; } };
		await expect(queryTickets("/repo", "1=1", runner)).resolves.toEqual([]);
	});

	it("throws FossilQueryError when the fossil subprocess fails", async () => {
		const runner: CommandRunner = {
			async run() {
				return { exitCode: 1, stdout: "", stderr: "not within an open checkout" };
			},
		};
		await expect(queryTickets("/repo", "1=1", runner)).rejects.toThrow(FossilQueryError);
		await expect(queryTickets("/repo", "1=1", runner)).rejects.toThrow(
			"not within an open checkout",
		);
	});

	it("queryTicketsByEpic filters by epic_id and escapes single quotes", async () => {
		let capturedInput: string | undefined;
		const runner: CommandRunner = {
			async run(_args, _cwd, input) {
				capturedInput = input;
				return { exitCode: 0, stdout: "[]", stderr: "" };
			},
		};
		await queryTicketsByEpic("/repo", "o'brien-epic", runner);
		expect(capturedInput).toContain("epic_id = 'o''brien-epic'");
	});
});

describe("summarizeStatus", () => {
	it("groups rows by epic then story, computing completed/total from acai_status", () => {
		const rows: TicketRow[] = [
			{
				tkt_uuid: "1",
				epic_id: "epic-1",
				story_id: "login-flow",
				acid: "login-flow.AUTH.1",
				component: "AUTH",
				status: "Open",
				acai_status: "completed",
				title: "t1",
				deprecated: 0,
			},
			{
				tkt_uuid: "2",
				epic_id: "epic-1",
				story_id: "login-flow",
				acid: "login-flow.AUTH.2",
				component: "AUTH",
				status: "Open",
				acai_status: null,
				title: "t2",
				deprecated: 0,
			},
		];

		expect(summarizeStatus(rows)).toEqual({
			epics: [
				{
					epicId: "epic-1",
					stories: [
						{
							storyId: "login-flow",
							total: 2,
							completed: 1,
							acids: ["login-flow.AUTH.1", "login-flow.AUTH.2"],
						},
					],
				},
			],
			unassigned: [],
		});
	});

	it("falls back to the fossil Closed status when acai_status is unset", () => {
		const rows: TicketRow[] = [
			{
				tkt_uuid: "1",
				epic_id: null,
				story_id: "alpha",
				acid: "alpha.MAIN.1",
				component: "MAIN",
				status: "Closed",
				acai_status: null,
				title: "t1",
				deprecated: 0,
			},
		];

		expect(summarizeStatus(rows)).toEqual({
			epics: [],
			unassigned: [{ storyId: "alpha", total: 1, completed: 1, acids: ["alpha.MAIN.1"] }],
		});
	});

	it("buckets rows with no epic_id under unassigned", () => {
		const rows: TicketRow[] = [
			{
				tkt_uuid: "1",
				epic_id: null,
				story_id: "orphan",
				acid: "orphan.MAIN.1",
				component: "MAIN",
				status: "Open",
				acai_status: "rejected",
				title: "t1",
				deprecated: 0,
			},
		];

		const summary = summarizeStatus(rows);
		expect(summary.epics).toEqual([]);
		expect(summary.unassigned).toEqual([
			{ storyId: "orphan", total: 1, completed: 0, acids: ["orphan.MAIN.1"] },
		]);
	});
});
