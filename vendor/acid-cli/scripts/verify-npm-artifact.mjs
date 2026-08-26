#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile, access } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = resolve(__dirname, "..");

await main();

async function main() {
  assertRealNodeRuntime();

  const canonicalSkill = await readFile(
    join(workspaceRoot, ".agents", "skills", "acid", "SKILL.md"),
    "utf8",
  );

  const tempRoot = await mkdtemp(join(tmpdir(), "acid-npm-artifact-"));

  try {
    const tarballPath = await packArtifact(tempRoot);
    const installRoot = await installPackedArtifact(tarballPath, tempRoot);
    const packageRoot = join(installRoot, "node_modules", "@scrummaster", "acid-cli");
    const entrypoint = join(packageRoot, "dist", "acid.js");
    const binPath = join(installRoot, "node_modules", ".bin", "acid");

    await access(entrypoint);
    await access(binPath);

    const env = { USER: process.env.USER || process.env.LOGNAME || "acid-verify" };

    await verifyHelpOutput(binPath, env);
    await verifySkillCommand(binPath, canonicalSkill, env);
    await verifyPushCommand(binPath, env);
    await verifySetStatusFileInput(binPath, env);
    await verifySetStatusStdinInput(binPath, env);
    await verifyJsonStdoutStderrSeparation(binPath, env);

    console.log("cli-core.DIST.1 verified with packed npm artifact under real Node.");
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
}

function assertRealNodeRuntime() {
  if (process.versions.bun || process.execPath.includes("bun-node-fallback-bin")) {
    throw new Error(
      "cli-core.DIST.1 verification requires a real Node runtime. In this devcontainer, `node` resolves to Bun's fallback. Run this script only after provisioning Node explicitly, such as with actions/setup-node.",
    );
  }
}

async function packArtifact(tempRoot) {
  const packDir = join(tempRoot, "pack");
  await mkdir(packDir, { recursive: true });
  const result = await runCommand("npm", ["pack", "--pack-destination", packDir], {
    cwd: workspaceRoot,
  });
  assertCommandSucceeded(result, "npm pack");

  const tarballName = result.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .at(-1);
  assert.ok(tarballName, "npm pack did not report a tarball filename");

  return join(packDir, tarballName);
}

async function installPackedArtifact(tarballPath, tempRoot) {
  const installRoot = join(tempRoot, "install");
  await mkdir(installRoot, { recursive: true });
  await writeFile(join(installRoot, "package.json"), '{"private":true}');
  const result = await runCommand("npm", ["install", "--no-package-lock", tarballPath], {
    cwd: installRoot,
  });
  assertCommandSucceeded(result, "npm install packed artifact");
  return installRoot;
}

// cli-core.HELP.1 / cli-core.HELP.3 / cli-core.HELP.4 / cli-core.UX.1 / cli-core.UX.2
async function verifyHelpOutput(binPath, env) {
  const topLevel = await runInstalledCli(binPath, [], { env });
  assert.equal(topLevel.exitCode, 0);
  assert.equal(topLevel.stderr, "");
  assert.match(topLevel.stdout, /Usage: acid/);

  const commandHelp = await runInstalledCli(binPath, ["push", "--help"], { env });
  assert.equal(commandHelp.exitCode, 0);
  assert.equal(commandHelp.stderr, "");
  assert.match(commandHelp.stdout, /Usage: acid push/);
}

// skill.MAIN.2 / skill.MAIN.3 / skill.WRITE.1 / skill.WRITE.2 / skill.SAFETY.1 / skill.SAFETY.3 / skill.UX.1 / skill.UX.2
async function verifySkillCommand(binPath, canonicalSkill, env) {
  const workspace = await createWorkspace({}, "acid-npm-skill-");
  const installPath = join(workspace.root, ".agents", "skills", "acid", "SKILL.md");

  try {
    const printResult = await runInstalledCli(binPath, ["skill"], {
      cwd: workspace.root,
      env,
    });
    assert.equal(printResult.exitCode, 0);
    assert.equal(printResult.stderr, "");
    assert.equal(printResult.stdout, canonicalSkill);

    const installResult = await runInstalledCli(binPath, ["skill", "--install"], {
      cwd: workspace.root,
      env,
    });
    assert.equal(installResult.exitCode, 0);
    assert.equal(installResult.stdout, "");
    assert.equal(installResult.stderr, "");
    assert.equal(await readFile(installPath, "utf8"), canonicalSkill);
  } finally {
    await workspace.cleanup();
  }
}

// push.MAIN.3 / push.MAIN.7 / push.MAIN.8 / push.SCAN.1 / push.SCAN.2 / push.SCAN.2-1 / push.SCAN.3 / push.UX.1
async function verifyPushCommand(binPath, env) {
  const fossil = await createFossilFixture(env, "example-product");

  try {
    await writeFixtureFiles(fossil.root, {
      "features/alpha.feature.yaml":
        "feature:\n  name: alpha\n  product: product-a\ncomponents:\n  MAIN:\n    requirements:\n      1: Alpha requirement\n",
      "src/alpha.ts": 'const alpha = "alpha.MAIN.1";\n',
    });

    const result = await runInstalledCli(binPath, ["push", "--all"], {
      cwd: fossil.root,
      env,
    });

    assert.equal(result.exitCode, 0);
    assert.equal(result.stderr, "");
    assert.match(result.stdout, /product-a/);

    const featureResult = await runInstalledCli(
      binPath,
      ["feature", "alpha", "--product", "example-product", "--impl", "trunk", "--json"],
      { cwd: fossil.root, env },
    );
    const acids = JSON.parse(featureResult.stdout).data.acids;
    assert.equal(acids[0].acid, "alpha.MAIN.1");
  } finally {
    await fossil.cleanup();
  }
}

// set-status.MAIN.2 / set-status.UX.2
async function verifySetStatusFileInput(binPath, env) {
  const fossil = await createFossilFixture(env, "example-product", [
    { acid: "set-status.MAIN.1", requirement: "writes status" },
  ]);

  try {
    await writeFixtureFiles(fossil.root, {
      "states.json": '{"set-status.MAIN.1":{"status":"completed"}}',
    });

    const result = await runInstalledCli(
      binPath,
      ["set-status", "@states.json", "--product", "example-product", "--impl", "trunk"],
      { cwd: fossil.root, env },
    );

    assert.equal(result.exitCode, 0);
    assert.match(result.stdout, /STATES_WRITTEN/);
  } finally {
    await fossil.cleanup();
  }
}

// set-status.MAIN.3 / set-status.UX.2
async function verifySetStatusStdinInput(binPath, env) {
  const fossil = await createFossilFixture(env, "example-product", [
    { acid: "set-status.INPUT.1", requirement: "validates input" },
  ]);

  try {
    const result = await runInstalledCli(
      binPath,
      ["set-status", "-", "--product", "example-product", "--impl", "trunk"],
      { cwd: fossil.root, env, input: '{"set-status.INPUT.1":{"status":null}}' },
    );

    assert.equal(result.exitCode, 0);
    assert.match(result.stdout, /STATES_WRITTEN/);
  } finally {
    await fossil.cleanup();
  }
}

// cli-core.OUTPUT.1 / cli-core.OUTPUT.2 / set-status.MAIN.6 / set-status.API.1-note
async function verifyJsonStdoutStderrSeparation(binPath, env) {
  const fossil = await createFossilFixture(env, "example-product", [
    { acid: "set-status.MAIN.1", requirement: "writes status" },
  ]);

  try {
    const result = await runInstalledCli(
      binPath,
      [
        "set-status",
        '{"set-status.MAIN.1":{"status":"completed"},"set-status.MAIN.2":{"status":"completed"}}',
        "--product",
        "example-product",
        "--impl",
        "trunk",
        "--json",
      ],
      { cwd: fossil.root, env },
    );

    assert.equal(result.exitCode, 0);
    assert.match(result.stderr, /No ticket found for ACID 'set-status\.MAIN\.2'; skipped\./);
    assert.equal(JSON.parse(result.stdout).data.feature_name, "set-status");
  } finally {
    await fossil.cleanup();
  }
}

async function runInstalledCli(binPath, args, options = {}) {
  return runCommand(binPath, args, options);
}

async function runCommand(command, args, options = {}) {
  const proc = spawn(command, args, {
    cwd: options.cwd ?? workspaceRoot,
    env: {
      ...process.env,
      ...options.env,
    },
    stdio: ["pipe", "pipe", "pipe"],
  });

  if (options.input !== undefined) {
    proc.stdin.end(options.input);
  } else {
    proc.stdin.end();
  }

  let stdout = "";
  let stderr = "";
  proc.stdout.setEncoding("utf8");
  proc.stderr.setEncoding("utf8");
  proc.stdout.on("data", (chunk) => {
    stdout += chunk;
  });
  proc.stderr.on("data", (chunk) => {
    stderr += chunk;
  });

  const exitCode = await new Promise((resolvePromise, reject) => {
    proc.on("error", reject);
    proc.on("close", resolvePromise);
  });

  return { exitCode, stdout, stderr };
}

function assertCommandSucceeded(result, label) {
  assert.equal(
    result.exitCode,
    0,
    `${label} failed\nstdout:\n${result.stdout}\n\nstderr:\n${result.stderr}`,
  );
}

async function createWorkspace(files, prefix) {
  const root = await mkdtemp(join(tmpdir(), prefix));
  await writeFixtureFiles(root, files);

  return {
    root,
    cleanup: async () => {
      await rm(root, { recursive: true, force: true });
    },
  };
}

async function writeFixtureFiles(root, files) {
  for (const [relativePath, content] of Object.entries(files)) {
    const absolutePath = join(root, relativePath);
    await mkdir(dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, content);
  }
}

// Real fossil fixture (mirrors test/support/fossil-fixture.ts, duplicated here
// since this script runs under plain Node rather than bun:test).
async function createFossilFixture(env, projectName, seedTickets = []) {
  const base = await mkdtemp(join(tmpdir(), "acid-npm-fossil-"));
  const repoPath = join(base, "repo.fossil");
  const root = join(base, "checkout");
  await mkdir(root, { recursive: true });

  await runFossil(["init", repoPath, "--project-name", projectName], base, env);
  await runFossil(["open", repoPath], root, env);
  await runFossil(
    ["sql"],
    root,
    env,
    `
ALTER TABLE ticket ADD COLUMN epic_id TEXT;
ALTER TABLE ticket ADD COLUMN story_id TEXT;
ALTER TABLE ticket ADD COLUMN acid TEXT;
ALTER TABLE ticket ADD COLUMN component TEXT;
ALTER TABLE ticket ADD COLUMN deprecated BOOLEAN DEFAULT 0;
ALTER TABLE ticket ADD COLUMN acai_status TEXT;
ALTER TABLE ticket ADD COLUMN acai_comment TEXT;
ALTER TABLE ticket ADD COLUMN last_seen_commit TEXT;
`,
  );

  for (const ticket of seedTickets) {
    await runFossil(
      [
        "ticket",
        "add",
        "type",
        "Story",
        "story_id",
        ticket.acid.split(".")[0] ?? ticket.acid,
        "acid",
        ticket.acid,
        "component",
        ticket.acid.split(".")[1] ?? "",
        "status",
        "Open",
        "title",
        ticket.requirement,
        "deprecated",
        "0",
      ],
      root,
      env,
    );
  }

  return {
    root,
    cleanup: async () => {
      await rm(base, { recursive: true, force: true });
    },
  };
}

async function runFossil(args, cwd, env, input) {
  const result = await runCommand("fossil", args, { cwd, env, input });
  assertCommandSucceeded(result, `fossil ${args.join(" ")}`);
  return result;
}
