import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";
import { createFakeFossilContext } from "../test/support/fossil-fixture.ts";
import { runCliSubprocess } from "../test/support/cli.ts";

async function writeFiles(
	root: string,
	files: Record<string, string>,
): Promise<void> {
	for (const [relativePath, content] of Object.entries(files)) {
		const absolutePath = join(root, relativePath);
		await mkdir(join(absolutePath, ".."), { recursive: true });
		await writeFile(absolutePath, content);
	}
}

describe("push command", () => {
	test("push.MAIN.1 push.OUTPUT.1 push.OUTPUT.3 prints one block per product for a full repo push", async () => {
		const fossil = await createFakeFossilContext({ projectName: "example-product" });
		try {
			await writeFiles(fossil.root, {
				"features/alpha.feature.yaml":
					"feature:\n  name: alpha\n  product: product-a\ncomponents:\n  MAIN:\n    requirements:\n      1: Alpha requirement\n",
				"features/beta.feature.yaml":
					"feature:\n  name: beta\n  product: product-b\ncomponents:\n  MAIN:\n    requirements:\n      1: Beta requirement\n",
				"src/alpha.ts": 'const alpha = "alpha.MAIN.1";\n',
				"src/beta.ts": 'const beta = "beta.MAIN.1";\n',
			});

			const result = await runCliSubprocess(["push", "--all"], fossil.env, {
				cwd: fossil.root,
			});

			expect(result.exitCode).toBe(0);
			expect(result.stderr.trim()).toBe("");
			expect(result.stdout).toContain("REPO: example-product");
			expect(result.stdout).toContain("BRANCH: trunk");
			expect(result.stdout).toContain("PRODUCT");
			expect(result.stdout).toContain("product-a");
			expect(result.stdout).toContain("product-b");
			expect(result.stdout).toContain("ok");
			expect(result.stdout).toContain("WARNINGS");
			expect(result.stdout).toContain("does not persist per-reference storage");
		} finally {
			await fossil.cleanup();
		}
	});

	test("push.MAIN.2 push.SCAN.4 push.UX.3 filters the scan to named features", async () => {
		const fossil = await createFakeFossilContext({ projectName: "example-product" });
		try {
			await writeFiles(fossil.root, {
				"features/alpha.feature.yaml":
					"feature:\n  name: alpha\n  product: product-a\ncomponents:\n  MAIN:\n    requirements:\n      1: Alpha requirement\n",
				"features/beta.feature.yaml":
					"feature:\n  name: beta\n  product: product-b\ncomponents:\n  MAIN:\n    requirements:\n      1: Beta requirement\n",
			});

			const result = await runCliSubprocess(["push", "alpha"], fossil.env, {
				cwd: fossil.root,
			});

			expect(result.exitCode).toBe(0);
			expect(result.stdout).toContain("product-a");
			expect(result.stdout).not.toContain("product-b");
		} finally {
			await fossil.cleanup();
		}
	});

	test("push.SCAN.1 push.SCAN.2 push.SCAN.3 creates a ticket on first push and updates it on the next", async () => {
		const fossil = await createFakeFossilContext({ projectName: "example-product" });
		try {
			await writeFiles(fossil.root, {
				"features/alpha.feature.yaml":
					"feature:\n  name: alpha\n  product: product-a\ncomponents:\n  MAIN:\n    requirements:\n      1: Alpha requirement\n",
				"src/alpha.ts": 'const alpha = "alpha.MAIN.1";\n',
			});

			const first = await runCliSubprocess(["push", "--all"], fossil.env, {
				cwd: fossil.root,
			});
			expect(first.exitCode).toBe(0);
			expect(first.stdout).toContain("1");

			const firstRow = first.stdout
				.split("\n")
				.find((line) => line.startsWith("product-a"));
			expect(firstRow).toMatch(/product-a\s+trunk\s+1\s+0/);

			const second = await runCliSubprocess(["push", "--all"], fossil.env, {
				cwd: fossil.root,
			});
			expect(second.exitCode).toBe(0);
			const secondRow = second.stdout
				.split("\n")
				.find((line) => line.startsWith("product-a"));
			expect(secondRow).toMatch(/product-a\s+trunk\s+0\s+1/);
		} finally {
			await fossil.cleanup();
		}
	});

	test("push.MAIN.5 push.MAIN.6 push.API.2 --target and --parent still parse but have no effect on the fossil backend", async () => {
		const fossil = await createFakeFossilContext({ projectName: "example-product" });
		try {
			await writeFiles(fossil.root, {
				"features/alpha.feature.yaml":
					"feature:\n  name: alpha\n  product: product-a\ncomponents:\n  MAIN:\n    requirements:\n      1: Alpha requirement\n",
			});

			const result = await runCliSubprocess(
				["push", "--all", "--target", "product-a/child", "--parent", "product-a/base"],
				fossil.env,
				{ cwd: fossil.root },
			);

			expect(result.exitCode).toBe(0);
			expect(result.stderr.trim()).toBe("");
			const row = result.stdout.split("\n").find((line) => line.startsWith("product-a"));
			expect(row).toMatch(/product-a\s+trunk\s+1\s+0/);
		} finally {
			await fossil.cleanup();
		}
	});

	test("push.API.6 push.SAFETY.4 pushes refs-only payloads without --product", async () => {
		const fossil = await createFakeFossilContext({ projectName: "example-product" });
		try {
			await writeFiles(fossil.root, { "src/alpha.ts": 'const alpha = "alpha.MAIN.1";\n' });

			const result = await runCliSubprocess(["push"], fossil.env, {
				cwd: fossil.root,
			});

			expect(result.exitCode).toBe(0);
			expect(result.stderr.trim()).toBe("");
			expect(result.stdout).toContain("WARNINGS");
			expect(result.stdout).toContain("does not persist per-reference storage");

			const featuresResult = await runCliSubprocess(
				["features", "--product", "example-product", "--impl", "trunk"],
				fossil.env,
				{ cwd: fossil.root },
			);
			expect(featuresResult.stdout).toContain("No features were returned.");
		} finally {
			await fossil.cleanup();
		}
	});

	test("push.SAFETY.5 refs-only pushes still require --target and --parent together", async () => {
		const fossil = await createFakeFossilContext({ projectName: "example-product" });
		try {
			await writeFiles(fossil.root, { "src/alpha.ts": 'const alpha = "alpha.MAIN.1";\n' });

			const failing = await runCliSubprocess(
				["push", "--product", "product-a", "--target", "product-a/child"],
				fossil.env,
				{ cwd: fossil.root },
			);
			expect(failing.exitCode).toBe(2);
			expect(failing.stderr).toContain(
				"Refs-only pushes require --product, --target, and --parent together.",
			);

			const succeeding = await runCliSubprocess(
				[
					"push",
					"--product",
					"product-a",
					"--target",
					"product-a/child",
					"--parent",
					"product-a/base",
				],
				fossil.env,
				{ cwd: fossil.root },
			);
			expect(succeeding.exitCode).toBe(0);
		} finally {
			await fossil.cleanup();
		}
	});

	test("push.SCAN.5 push.SCAN.5-1 preserves component deprecation with requirement-level override", async () => {
		const fossil = await createFakeFossilContext({ projectName: "example-product" });
		try {
			await writeFiles(fossil.root, {
				"features/alpha.feature.yaml":
					"feature:\n  name: alpha\n  product: product-a\ncomponents:\n  AUTH:\n    deprecated: true\n    requirements:\n      1: inherited deprecation\n      2:\n        requirement: local override\n        deprecated: false\n",
			});

			const result = await runCliSubprocess(["push", "--all"], fossil.env, {
				cwd: fossil.root,
			});
			expect(result.exitCode).toBe(0);

			const featureResult = await runCliSubprocess(
				["feature", "alpha", "--product", "example-product", "--impl", "trunk", "--json"],
				fossil.env,
				{ cwd: fossil.root },
			);
			const acids = JSON.parse(featureResult.stdout).data.acids as Array<{
				acid: string;
				requirement: string;
			}>;
			expect(acids.map((entry) => entry.acid).sort()).toEqual([
				"alpha.AUTH.1",
				"alpha.AUTH.2",
			]);
		} finally {
			await fossil.cleanup();
		}
	});

	test("push.OUTPUT.5 cli-core.OUTPUT.1 cli-core.OUTPUT.2 emits JSON payloads on stdout", async () => {
		const fossil = await createFakeFossilContext({ projectName: "example-product" });
		try {
			await writeFiles(fossil.root, {
				"features/alpha.feature.yaml":
					"feature:\n  name: alpha\n  product: product-a\ncomponents:\n  MAIN:\n    requirements:\n      1: Alpha requirement\n",
				"src/alpha.ts": 'const alpha = "alpha.MAIN.1";\n',
			});

			const result = await runCliSubprocess(["push", "--all", "--json"], fossil.env, {
				cwd: fossil.root,
			});

			expect(result.exitCode).toBe(0);
			const payload = JSON.parse(result.stdout);
			expect(payload.results[0].productName).toBe("product-a");
			expect(payload.results[0].specsCreated).toBe(1);
			expect(result.stderr).toContain("Warning for product-a:");
		} finally {
			await fossil.cleanup();
		}
	});
});
