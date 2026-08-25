import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";
import { createFakeFossilContext } from "../test/support/fossil-fixture.ts";
import { runCliSubprocess } from "../test/support/cli.ts";
import { expectUsageError } from "../test/support/e2e.ts";

const VALID_SET_STATUS_JSON = '{"set-status.MAIN.1":{"status":"completed"}}';

describe("set-status command", () => {
	test("set-status.API.1 set-status.API.1-note writes inline JSON input for explicit --product and --impl", async () => {
		const fossil = await createFakeFossilContext({
			projectName: "example-product",
			seedTickets: [{ acid: "set-status.MAIN.1", requirement: "writes status" }],
		});

		try {
			const result = await runCliSubprocess(
				[
					"set-status",
					'{"set-status.MAIN.1":{"status":"completed","comment":"done"}}',
					"--product",
					"example-product",
					"--impl",
					"trunk",
				],
				fossil.env,
				{ cwd: fossil.root },
			);

			expect(result.exitCode).toBe(0);
			expect(result.stderr.trim()).toBe("");
			expect(result.stdout).toContain("PRODUCT");
			expect(result.stdout).toContain("set-status");
			expect(result.stdout).toContain("1");

			const featureResult = await runCliSubprocess(
				["feature", "set-status", "--product", "example-product", "--impl", "trunk", "--json"],
				fossil.env,
				{ cwd: fossil.root },
			);
			const acids = JSON.parse(featureResult.stdout).data.acids;
			expect(acids[0].state.status).toBe("completed");
		} finally {
			await fossil.cleanup();
		}
	});

	test("set-status.MAIN.2 reads @file input", async () => {
		const fossil = await createFakeFossilContext({
			projectName: "example-product",
			seedTickets: [{ acid: "set-status.MAIN.1", requirement: "writes status" }],
		});

		try {
			await writeFile(join(fossil.root, "states.json"), VALID_SET_STATUS_JSON);
			const result = await runCliSubprocess(
				["set-status", "@states.json", "--product", "example-product", "--impl", "trunk"],
				fossil.env,
				{ cwd: fossil.root },
			);
			expect(result.exitCode).toBe(0);
			expect(result.stdout).toContain("STATES_WRITTEN");
			expect(result.stdout).toContain("set-status");
		} finally {
			await fossil.cleanup();
		}
	});

	test("set-status.MAIN.3 reads stdin input from -", async () => {
		const fossil = await createFakeFossilContext({
			projectName: "example-product",
			seedTickets: [{ acid: "set-status.INPUT.1", requirement: "validates input" }],
		});

		try {
			const result = await runCliSubprocess(
				["set-status", "-", "--product", "example-product", "--impl", "trunk"],
				fossil.env,
				{ cwd: fossil.root, input: '{"set-status.INPUT.1":{"status":null}}' },
			);
			expect(result.exitCode).toBe(0);
			expect(result.stdout).toContain("STATES_WRITTEN");
			expect(result.stdout).toContain("1");
		} finally {
			await fossil.cleanup();
		}
	});

	test("set-status.MAIN.4 resolves product from namespaced --impl without --product", async () => {
		const fossil = await createFakeFossilContext({
			projectName: "example-product",
			seedTickets: [{ acid: "set-status.MAIN.1", requirement: "writes status" }],
		});

		try {
			const result = await runCliSubprocess(
				["set-status", VALID_SET_STATUS_JSON, "--impl", "example-product/trunk"],
				fossil.env,
				{ cwd: fossil.root },
			);
			expect(result.exitCode).toBe(0);
			expect(result.stdout).toContain("trunk");
			expect(result.stdout).toContain("set-status");
		} finally {
			await fossil.cleanup();
		}
	});

	test("cli-core.TARGETING.1 cli-core.TARGETING.3 cli-core.TARGETING.6 resolves the trunk implementation when --impl is omitted", async () => {
		const fossil = await createFakeFossilContext({
			projectName: "example-product",
			seedTickets: [{ acid: "set-status.MAIN.1", requirement: "writes status" }],
		});

		try {
			const result = await runCliSubprocess(
				["set-status", VALID_SET_STATUS_JSON, "--product", "example-product"],
				fossil.env,
				{ cwd: fossil.root },
			);
			expect(result.exitCode).toBe(0);
			expect(result.stdout).toContain("trunk");
			expect(result.stdout).toContain("set-status");
		} finally {
			await fossil.cleanup();
		}
	});

	test("set-status.SAFETY.2 fails when no implementation has been tracked yet", async () => {
		const fossil = await createFakeFossilContext({ projectName: "example-product" });

		try {
			const result = await runCliSubprocess(
				["set-status", VALID_SET_STATUS_JSON, "--product", "example-product"],
				fossil.env,
				{ cwd: fossil.root },
			);
			expect(result.exitCode).toBe(1);
			expect(result.stderr).toContain(
				"No implementation matched the current repo, branch, and filters. This branch may not be tracked yet",
			);
		} finally {
			await fossil.cleanup();
		}
	});

	test("set-status.MAIN.6 set-status.API.3 keeps --json payload on stdout and warnings on stderr for unmatched ACIDs", async () => {
		const fossil = await createFakeFossilContext({
			projectName: "example-product",
			seedTickets: [{ acid: "set-status.MAIN.1", requirement: "writes status" }],
		});

		try {
			const result = await runCliSubprocess(
				[
					"set-status",
					'{"set-status.MAIN.1":{"status":"completed"},"set-status.MAIN.2":{"status":"completed"}}',
					"--product",
					"example-product",
					"--impl",
					"trunk",
					"--json",
				],
				fossil.env,
				{ cwd: fossil.root },
			);
			expect(result.exitCode).toBe(0);
			expect(result.stderr).toContain("No ticket found for ACID 'set-status.MAIN.2'; skipped.");
			const payload = JSON.parse(result.stdout);
			expect(payload.data.feature_name).toBe("set-status");
			expect(payload.data.states_written).toBe(1);
		} finally {
			await fossil.cleanup();
		}
	});

	test("cli-core.HELP.3 cli-core.HELP.5 keep set-status --help and -h in sync", async () => {
		const help = await runCliSubprocess(["set-status", "--help"]);
		const shortHelp = await runCliSubprocess(["set-status", "-h"]);
		expect(help.exitCode).toBe(0);
		expect(shortHelp.exitCode).toBe(0);
		expect(help.stdout).toBe(shortHelp.stdout);
		expect(help.stdout).toContain("Usage: acid set-status <json> [options]");
	});

	test("cli-core.ERRORS.4 rejects unknown set-status options", async () => {
		const result = await runCliSubprocess([
			"set-status",
			VALID_SET_STATUS_JSON,
			"--product",
			"example-product",
			"--unknown-option",
		]);
		expectUsageError(result, "Usage: acid set-status", "unknown option");
	});

	test("set-status.INPUT.5 rejects invalid payloads before any fossil call", async () => {
		for (const [payload, message] of [
			["{", "Invalid JSON payload."],
			['{"not-an-acid":{"status":"completed"}}', "Malformed ACID: not-an-acid"],
			[
				'{"set-status.MAIN.1":{"status":"completed"},"feature.MAIN.1":{"status":"accepted"}}',
				"All ACIDs in one payload must share the same feature prefix.",
			],
			['{"set-status.MAIN.1":{"status":"todo"}}', "Invalid status for set-status.MAIN.1: todo"],
		] as const) {
			const result = await runCliSubprocess([
				"set-status",
				payload,
				"--product",
				"example-product",
				"--impl",
				"trunk",
			]);
			expectUsageError(result, "Usage: acid set-status", message);
		}
	});
});
