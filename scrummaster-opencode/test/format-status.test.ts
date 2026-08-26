import { describe, expect, it } from "vitest";
import { formatStatusSummary } from "../src/index.js";
import type { StatusSummary } from "../src/fossil.js";

describe("formatStatusSummary", () => {
	it("guides the user to set up when there are no tickets at all", () => {
		const summary: StatusSummary = { epics: [], unassigned: [] };
		expect(formatStatusSummary(summary)).toContain("/scrummaster-setup");
	});

	it("renders one line per epic and per story with completion counts", () => {
		const summary: StatusSummary = {
			epics: [
				{
					epicId: "epic-1",
					stories: [
						{ storyId: "login-flow", total: 3, completed: 2, acids: [] },
						{ storyId: "signup-flow", total: 1, completed: 0, acids: [] },
					],
				},
			],
			unassigned: [],
		};

		expect(formatStatusSummary(summary)).toBe(
			[
				"EPIC epic-1",
				"  login-flow: 2/3 ACIDs done",
				"  signup-flow: 0/1 ACIDs done",
			].join("\n"),
		);
	});

	it("renders an UNASSIGNED section for stories with no epic_id", () => {
		const summary: StatusSummary = {
			epics: [],
			unassigned: [{ storyId: "orphan", total: 1, completed: 1, acids: [] }],
		};

		expect(formatStatusSummary(summary)).toBe(
			["UNASSIGNED (no epic_id)", "  orphan: 1/1 ACIDs done"].join("\n"),
		);
	});
});
