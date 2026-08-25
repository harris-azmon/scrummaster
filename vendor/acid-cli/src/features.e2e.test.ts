import { describe, expect, test } from "bun:test";
import { createFakeFossilContext } from "../test/support/fossil-fixture.ts";
import { runCliSubprocess } from "../test/support/cli.ts";
import { expectUsageError } from "../test/support/e2e.ts";

describe("features command", () => {
	test("features.API.1 features.API.1-note features.UX.1 prints text output for a direct target", async () => {
		const fossil = await createFakeFossilContext({
			projectName: "example-product",
			seedTickets: [
				{ acid: "feature-a.MAIN.1", requirement: "first", lastSeenCommit: "abc123" },
				{ acid: "feature-b.MAIN.1", requirement: "second", lastSeenCommit: "abc123" },
			],
		});

		try {
			const result = await runCliSubprocess(
				["features", "--product", "example-product", "--impl", "trunk"],
				fossil.env,
				{ cwd: fossil.root },
			);
			expect(result.exitCode).toBe(0);
			expect(result.stderr.trim()).toBe("");
			const lines = result.stdout.trim().split("\n");
			expect(lines[0]).toContain("FEATURE");
			expect(lines[0]).toContain("DONE");
			expect(lines[0]).toContain("LAST_SEEN");
			expect(result.stdout).toContain("feature-a");
			expect(result.stdout).toContain("feature-b");
			expect(result.stdout).toContain("0/1");
		} finally {
			await fossil.cleanup();
		}
	});

	test("features.MAIN.2-1 cli-core.TARGETING.1 cli-core.TARGETING.6 resolves the single trunk implementation without --impl", async () => {
		const fossil = await createFakeFossilContext({
			projectName: "example-product",
			seedTickets: [{ acid: "feature-a.MAIN.1", requirement: "first" }],
		});

		try {
			const result = await runCliSubprocess(
				["features", "--product", "example-product"],
				fossil.env,
				{ cwd: fossil.root },
			);
			expect(result.exitCode).toBe(0);
			expect(result.stderr.trim()).toBe("");
			expect(result.stdout).toContain("feature-a");
		} finally {
			await fossil.cleanup();
		}
	});

	test("features.MAIN.2-1 cli-core.TARGETING.6 resolves acid features without --product from fossil context", async () => {
		const fossil = await createFakeFossilContext({
			projectName: "example-product",
			seedTickets: [{ acid: "feature-a.MAIN.1", requirement: "first" }],
		});

		try {
			const result = await runCliSubprocess(["features"], fossil.env, {
				cwd: fossil.root,
			});
			expect(result.exitCode).toBe(0);
			expect(result.stderr.trim()).toBe("");
			expect(result.stdout).toContain("feature-a");
		} finally {
			await fossil.cleanup();
		}
	});

	test("features.MAIN.2-1 features.MAIN.3 supports namespaced --impl without --product", async () => {
		const fossil = await createFakeFossilContext({
			projectName: "example-product",
			seedTickets: [{ acid: "feature-a.MAIN.1", requirement: "first" }],
		});

		try {
			const result = await runCliSubprocess(
				["features", "--impl", "example-product/trunk"],
				fossil.env,
				{ cwd: fossil.root },
			);
			expect(result.exitCode).toBe(0);
			expect(result.stdout).toContain("feature-a");
		} finally {
			await fossil.cleanup();
		}
	});

	test("cli-core.TARGETING.5 exits non-zero when no implementation matches (no tickets exist yet)", async () => {
		const fossil = await createFakeFossilContext({ projectName: "example-product" });

		try {
			const result = await runCliSubprocess(
				["features", "--product", "example-product"],
				fossil.env,
				{ cwd: fossil.root },
			);
			expect(result.exitCode).toBe(1);
			expect(result.stderr).toContain(
				"No implementation matched the current repo, branch, and filters. This branch may not be tracked yet. Try `acid push` from this branch, or pass `--product` and `--impl` for a known implementation.",
			);
		} finally {
			await fossil.cleanup();
		}
	});

	test("cli-core.FOSSIL.1 cli-core.ERRORS.6 exits non-zero when fossil context cannot be determined", async () => {
		const notAFossilCheckout = await createFakeFossilContext({ openCheckout: false });
		try {
			const result = await runCliSubprocess(
				["features", "--product", "example-product"],
				notAFossilCheckout.env,
				{ cwd: notAFossilCheckout.root },
			);
			expect(result.exitCode).toBe(1);
			expect(result.stderr).toContain("Fossil context could not be determined.");
		} finally {
			await notAFossilCheckout.cleanup();
		}
	});

	test("cli-core.ERRORS.3 exits non-zero for unknown commands", async () => {
		const result = await runCliSubprocess(["bogus"]);
		expectUsageError(result, "Usage: acid", "unknown command");
	});

	test("cli-core.ERRORS.4 exits non-zero for unknown features options", async () => {
		const result = await runCliSubprocess(["features", "--product", "example-product", "--unknown-option"]);
		expectUsageError(result, "Usage: acid features", "unknown option");
	});

	test("features.MAIN.6 features.UX.5 keeps json payload on stdout as a single implementation payload", async () => {
		const fossil = await createFakeFossilContext({
			projectName: "example-product",
			seedTickets: [{ acid: "feature-a.MAIN.1", requirement: "first" }],
		});

		try {
			const result = await runCliSubprocess(
				["features", "--product", "example-product", "--impl", "trunk", "--json"],
				fossil.env,
				{ cwd: fossil.root },
			);
			expect(result.exitCode).toBe(0);
			expect(result.stderr.trim()).toBe("");
			expect(JSON.parse(result.stdout).data.features[0].feature_name).toBe("feature-a");
		} finally {
			await fossil.cleanup();
		}
	});

	test("features.UX.4 exits successfully when no features are returned", async () => {
		const fossil = await createFakeFossilContext({ projectName: "example-product" });
		try {
			const result = await runCliSubprocess(
				["features", "--product", "example-product", "--impl", "trunk"],
				fossil.env,
				{ cwd: fossil.root },
			);
			expect(result.exitCode).toBe(0);
			expect(result.stdout.trim()).toBe("No features were returned.");
		} finally {
			await fossil.cleanup();
		}
	});

	test("cli-core.EXITS.2 rejects missing values followed by another flag", async () => {
		const result = await runCliSubprocess([
			"features",
			"--product",
			"example-product",
			"--changed-since-commit",
			"--json",
		]);
		expectUsageError(result, "Usage: acid features", "Missing value for --changed-since-commit.");
	});

	test("features.MAIN.2 features.MAIN.3 cli-core.HELP.3 prints help with optional --product", async () => {
		const result = await runCliSubprocess(["features", "--help"]);
		expect(result.exitCode).toBe(0);
		expect(result.stdout).toContain("Usage: acid features [options]");
		expect(result.stdout).toContain("--product <name>");
		expect(result.stdout).not.toContain("product name (required)");
		expect(result.stdout).toContain("implementation name or namespaced selector");
		expect(result.stdout).toContain("<product/implementation>");
	});
});
