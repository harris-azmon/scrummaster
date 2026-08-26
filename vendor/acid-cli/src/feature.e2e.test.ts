import { describe, expect, test } from "bun:test";
import { createFakeFossilContext } from "../test/support/fossil-fixture.ts";
import { runCliSubprocess } from "../test/support/cli.ts";
import { expectUsageError } from "../test/support/e2e.ts";

describe("feature command", () => {
	test("feature.API.2 feature.API.3 feature.UX.1 prints text output for a direct target with statuses", async () => {
		const fossil = await createFakeFossilContext({
			projectName: "example-product",
			seedTickets: [
				{
					acid: "feature.MAIN.2",
					requirement: "requires product selector",
					acaiStatus: "incomplete",
				},
				{
					acid: "feature.API.3",
					requirement: "relays refs",
					acaiStatus: "completed",
				},
			],
		});

		try {
			const result = await runCliSubprocess(
				[
					"feature",
					"feature",
					"--product",
					"example-product",
					"--impl",
					"trunk",
					"--status",
					"completed",
					"--status",
					"incomplete",
					"--include-refs",
				],
				fossil.env,
				{ cwd: fossil.root },
			);

			expect(result.exitCode).toBe(0);
			expect(result.stderr.trim()).toBe("");
			expect(result.stdout).toContain("TARGET: example-product/trunk");
			expect(result.stdout).toContain("FEATURE: feature");
			expect(result.stdout).toContain("ACID");
			expect(result.stdout).toContain("feature.MAIN.2");
			expect(result.stdout).toContain("feature.API.3");
			// The fossil backend does not persist per-reference storage, so
			// --include-refs never has a REFS section to print (feature.API.3-note).
			expect(result.stdout).not.toContain("\nREFS\n");
		} finally {
			await fossil.cleanup();
		}
	});

	test("feature.MAIN.2-1 cli-core.TARGETING.1 cli-core.TARGETING.6 resolves the single trunk implementation without --product", async () => {
		const fossil = await createFakeFossilContext({
			projectName: "example-product",
			seedTickets: [{ acid: "feature.MAIN.1", requirement: "Expose the command" }],
		});

		try {
			const result = await runCliSubprocess(["feature", "feature"], fossil.env, {
				cwd: fossil.root,
			});
			expect(result.exitCode).toBe(0);
			expect(result.stderr.trim()).toBe("");
			expect(result.stdout).toContain("TARGET: example-product/trunk");
		} finally {
			await fossil.cleanup();
		}
	});

	test("feature.MAIN.2-1 feature.API.1-note cli-core.ERRORS.6 exits before feature lookup when fossil context is missing without --product", async () => {
		const notAFossilCheckout = await createFakeFossilContext({ openCheckout: false });
		try {
			const result = await runCliSubprocess(["feature", "feature"], notAFossilCheckout.env, {
				cwd: notAFossilCheckout.root,
			});
			expect(result.exitCode).toBe(1);
			expect(result.stderr).toContain("Fossil context could not be determined.");
		} finally {
			await notAFossilCheckout.cleanup();
		}
	});

	test("feature.MAIN.2-1 feature.MAIN.3 resolves product from --impl product/implementation without --product", async () => {
		const fossil = await createFakeFossilContext({
			projectName: "example-product",
			seedTickets: [{ acid: "feature.MAIN.1", requirement: "Expose the command" }],
		});

		try {
			const result = await runCliSubprocess(
				["feature", "feature", "--impl", "example-product/trunk"],
				fossil.env,
				{ cwd: fossil.root },
			);
			expect(result.exitCode).toBe(0);
			expect(result.stderr.trim()).toBe("");
			expect(result.stdout).toContain("TARGET: example-product/trunk");
		} finally {
			await fossil.cleanup();
		}
	});

	test("cli-core.TARGETING.5 feature.MAIN.2-2 reports no-match discovery with filter wording", async () => {
		const fossil = await createFakeFossilContext({ projectName: "example-product" });

		try {
			const result = await runCliSubprocess(
				["feature", "feature", "--product", "example-product"],
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

	test("feature.MAIN.6 cli-core.OUTPUT.1 cli-core.OUTPUT.2 keeps json payload on stdout", async () => {
		const fossil = await createFakeFossilContext({
			projectName: "example-product",
			seedTickets: [{ acid: "feature.MAIN.1", requirement: "Expose the command" }],
		});

		try {
			const result = await runCliSubprocess(
				["feature", "feature", "--product", "example-product", "--impl", "trunk", "--json"],
				fossil.env,
				{ cwd: fossil.root },
			);
			expect(result.exitCode).toBe(0);
			expect(result.stderr.trim()).toBe("");
			expect(JSON.parse(result.stdout).data.feature_name).toBe("feature");
		} finally {
			await fossil.cleanup();
		}
	});

	test("cli-core.ERRORS.4 reject unknown feature options", async () => {
		const result = await runCliSubprocess([
			"feature",
			"feature",
			"--product",
			"example-product",
			"--unknown-option",
		]);
		expectUsageError(result, "Usage: acid feature", "unknown option");
	});

	test("cli-core.FOSSIL.2 cli-core.ERRORS.1 surfaces fossil subprocess failures", async () => {
		const fossil = await createFakeFossilContext({
			projectName: "example-product",
			seedTickets: [{ acid: "feature.MAIN.1", requirement: "Expose the command" }],
		});

		try {
			// Break the subprocess PATH so `fossil` itself can't be found, once
			// past process startup (bun's own directory stays on PATH) - a real
			// fossil-unavailable failure instead of a mocked one.
			const bunDir = process.execPath.replace(/\/bun$/, "");
			const result = await runCliSubprocess(
				["feature", "feature", "--product", "example-product", "--impl", "trunk"],
				{ ...fossil.env, PATH: bunDir },
				{ cwd: fossil.root },
			);
			expect(result.exitCode).toBe(1);
			expect(result.stderr.toLowerCase()).toContain("fossil");
		} finally {
			await fossil.cleanup();
		}
	});
});
