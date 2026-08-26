# Scrummaster Plugin

**Measure twice, code once.**

Scrummaster is a plugin for AI coding agents (including Antigravity and Claude
Code) that enables **Spec-Driven Development**. It turns your agent into a
proactive project manager that follows a strict protocol to specify, plan, and
implement software features and bug fixes.

Instead of just writing code, Scrummaster ensures a consistent, high-quality
lifecycle for every task: **Context -> Spec & Plan -> Implement**.

The philosophy behind Scrummaster is simple: control your code. By treating
context as a managed artifact alongside your code, you transform your repository
into a single source of truth that drives every agent interaction with deep,
persistent project awareness.

Scrummaster groups work into **Epics** containing **Stories** (instead of
Conductor's flat "tracks"), tracks Acceptance Criteria with stable **ACIDs**
(borrowed from `acai-sh/cli`'s spec-driven methodology), and uses
**Fossil SCM** instead of git, defaulting to Cathedral-style (trunk-oriented,
direct-to-trunk) development. Fossil's native tickets, wiki, and technotes are
the source of truth; the markdown files under `scrummaster/` are generated,
synced views. See `skills/scrummaster/references/workflows.md` for the full
data model and `templates/vcs_workflows/fossil.md` for the fossil command
mapping.

---

## Architecture

This repository is organized as a modular monorepo:

- **`skills` / `rules`**: The portable, platform-agnostic protocol logic
  (`SKILL.md`) and platform-specific operational rules that ship as the
  Scrummaster plugin (see Installation below).
- **`scrummaster-core`**: A platform-agnostic core library (Python) with
  protocol logic, Pydantic models, VCS adapters (Fossil, Git, Jujutsu), and
  prompt templates.
- **`mcp` / `mcp-server`**: MCP servers used by Scrummaster's VCS-abstraction
  and tooling integrations.
- **`vendor/acid-cli`**: A vendored, retargeted fork of `acai-sh/cli`
  providing the `acid` CLI — ACID tracking against local Fossil tickets, with
  one-way export to Trello. `acid push` recognizes both its own
  `features/*.feature.yaml` specs and the `scrummaster/epics/<epic_id>/stories/<story_id>/spec.md`
  files `/scrummaster-newstory` generates, so it can (re-)sync a story's ACIDs
  into Fossil tickets directly, as an alternative to the `fossil ticket add`
  the skill itself runs when creating a story.

For tool-native command syntax and the artifacts each client consumes, see
`docs/skill-command-syntax.md`.

---

## 🛠 Installation Guide

Scrummaster is packaged as a standard agent plugin, compatible across modern AI
coding agents. Choose the installation method for your environment below.

### 1. Antigravity

#### A. End-User Installation (Recommended)

Install directly from GitHub in a single command:

```bash
agy plugins install https://github.com/harris-azmon/conductor
```

#### B. Developer Installation (Live-Sync Global Link)

If you are a developer or contributor who wants to fork the repository, write
custom skills, or modify rule configurations, clone the repository locally and
link it:

1. Clone the repository:

    ```bash
    git clone https://github.com/harris-azmon/conductor.git
    cd conductor
    ```

2. Link globally for Antigravity:

    ```bash
    mkdir -p ~/.gemini/config/plugins/ && ln -sfn "$(pwd)" ~/.gemini/config/plugins/scrummaster
    ```

*Why this method?* Creating a symlink acts as a live development link. Any edits
you make in your local Fossil checkout are instantly loaded in real-time
without reinstalling!

#### C. Workspace-Level Isolation

If you want to isolate Scrummaster strictly inside a specific project:

1. Create the local plugins directory in your target project's root:

    ```bash
    mkdir -p .agents/plugins/
    ```

2. Link Scrummaster to your local project:

    ```bash
    ln -sfn /absolute/path/to/cloned/conductor .agents/plugins/scrummaster
    ```

---

### 2. Claude Code

#### End-User Installation

Register the marketplace repository and install the Scrummaster plugin
directly in your Claude Code session:

```bash
/plugin marketplace add harris-azmon/conductor
/plugin install scrummaster
```

---

### 3. Agent Skills (Claude CLI / OpenCode / Codex)

For CLIs supporting the [Agent Skills specification](https://agentskills.io),
you can install Scrummaster as a portable skill.

**Option 1: Point to local folder**
Point your CLI to the `skills/scrummaster-setup/` (and sibling
`skills/scrummaster-*`) directories in this repository.

**Option 2: Use install script**

```bash
git clone https://github.com/harris-azmon/conductor.git
cd conductor
./skill/scripts/install.sh
```

The installer will ask where to install (OpenCode, Claude CLI, Codex, or all).
You can also use flags:

```bash
./skill/scripts/install.sh --target codex
./skill/scripts/install.sh --list
```

The skill is installed with symlinks to this repository, so pulling the
latest Fossil checkin will automatically update the skill.

> **OpenCode note:** OpenCode is Scrummaster's primary CLI target and already
> works via the generic Agent Skills path above. A dedicated
> [`scrummaster-opencode`](scrummaster-opencode/) adapter package is also
> available — it adds two native tools (`scrummaster_status`,
> `scrummaster_context`) backed by the local Fossil ticket table, plus an
> installer (`npx scrummaster-opencode-install`) that puts Scrummaster's
> slash commands directly under `.opencode/commands/`.

---

### 4. Alternative Installation Methods

Scrummaster's Python and Node components are also published through general
package managers:

```bash
# mise (cross-platform)
mise install harris-azmon/conductor

# One-liner (Unix/macOS)
curl -fsSL install.cat/harris-azmon/conductor | sh

# One-liner (Windows PowerShell)
irm install.cat/harris-azmon/conductor | iex

# Homebrew (coming soon)
brew install harris-azmon/tap/scrummaster

# pip
pip install scrummaster-core

# npm
npm install -g @scrummaster/acid-cli
```

---

## 🔄 Uninstallation

To safely remove Scrummaster from your environment:

- **Antigravity:**
  - **CLI Installation:** Run `agy plugins uninstall scrummaster`
  - **Global Link:** Run `rm -f ~/.gemini/config/plugins/scrummaster`
  - **Workspace Link:** Run `rm -f .agents/plugins/scrummaster`
- **Claude Code:** Run `/plugin remove scrummaster` and `/plugin marketplace
    remove harris-azmon/conductor`

---

## 🚀 Features

- **Plan before you build**: Create specs and plans that guide the agent for
    new and existing codebases.
- **Maintain context**: Ensure AI follows style guides, tech stack choices,
    and product goals.
- **Iterate safely**: Review plans before code is written, keeping you firmly
    in the loop.
- **Work as a team**: Set project-level context for your product, tech stack,
    and workflow preferences that become a shared foundation for your team.
- **Build on existing projects**: Intelligent initialization for both new
    (Greenfield) and existing (Brownfield) projects.
- **Traceable requirements**: Every acceptance criterion gets a stable ACID,
    mapped 1:1 to a Fossil ticket, so "done" means the ticket says so — not
    just a markdown checkbox.
- **Smart revert**: A Fossil-aware revert command that understands logical
    units of work (epics, stories, phases, tasks) rather than just checkin
    hashes.

---

## 🎨 Adaptive User Experience (UX Layer)

Scrummaster natively adapts its user interface to match the specific visual
capabilities of your active developer environment (IDE chat box, terminal
console, or web editor).

This is powered by the integrated **View Layer UX Adapter**:

- **Interactive GUI Modals:** If your host editor supports visual interactive
    dialog elements, Scrummaster will automatically capture selections, decision
    interviews, and story options as native graphical modal dialog windows.
  - `rules/`: Custom adapter rules tailored for visual IDE environments
        (like Antigravity).
- **Graceful CLI Fallback:** If you are operating in a plain text terminal
    console (such as Claude Code), Scrummaster automatically detects the console
    environment and adapts all interactive steps into clean, structured
    text-based choice menus with bracketed numbers (e.g., `[1] Option A, [2]
    Option B`).

This dynamic, semantic adaptation occurs natively behind the scenes with **zero
configuration required**, ensuring the optimal developer experience regardless
of your chosen workflow environment.

---

## 📖 Usage & Lifecycle

Scrummaster manages the entire lifecycle of your development tasks through
namespace-grouped commands.

> [!NOTE] **Note on Token Consumption:** Scrummaster's spec-driven approach
> involves reading and analyzing your project's context, specifications, and
> plans. This can lead to increased token consumption, especially in larger
> projects or during extensive planning and implementation phases. You can check
> the token consumption in the current session by running `/stats model` (in
> compatible clients).

### 1. Set Up the Project (Run Once)

When you run `/scrummaster:scrummaster-setup`, Scrummaster helps you define
the core components of your project context. This context is then used for
building new components or features by you or anyone on your team.

- **Product**: Define project context (e.g. users, product goals, high-level
    features).
- **Product guidelines**: Define standards (e.g. prose style, brand messaging,
    visual identity).
- **Tech stack**: Configure technical preferences (e.g. language, database,
    frameworks).
- **Workflow**: Set team preferences (e.g. TDD, commit strategy). Uses
    `workflow.md` as a customizable template.

**Generated Artifacts:**

- `scrummaster/product.md`
- `scrummaster/product-guidelines.md`
- `scrummaster/tech-stack.md`
- `scrummaster/workflow.md`
- `scrummaster/code_styleguides/`
- `scrummaster/epics.md`

```bash
/scrummaster:scrummaster-setup
```

See `docs/setup-newtrack.md` for a cross-adapter setup/new-story UX guide.

### 2. Start a New Epic and Story (Feature or Bug)

For a broader area of work, run `/scrummaster:scrummaster-newepic` first to
create an **epic**. When you're ready to take on a specific feature or bug fix
within it, run `/scrummaster:scrummaster-newstory`. This initializes a
**story** — a high-level unit of work, with every acceptance criterion given a
stable **ACID**. Scrummaster helps you generate two critical artifacts:

- **Specs**: The detailed requirements for the specific job, with ACIDs.
    What are we building and why?
- **Plan**: An actionable to-do list containing phases, tasks, and sub-tasks.

**Generated Artifacts:**

- `scrummaster/epics/<epic_id>/stories/<story_id>/spec.md`
- `scrummaster/epics/<epic_id>/stories/<story_id>/plan.md`
- `scrummaster/epics/<epic_id>/stories/<story_id>/metadata.json`
- A Fossil ticket per ACID

```bash
/scrummaster:scrummaster-newepic
/scrummaster:scrummaster-newstory
# OR with a description
/scrummaster:scrummaster-newstory "Add a dark mode toggle to the settings page"
```

### 3. Implement the Story

Once you approve the plan, run `/scrummaster:scrummaster-implement`. Your
coding agent then works through the `plan.md` file, checking off tasks as it
completes them and updating each ACID's Fossil ticket.

**Updated Artifacts:**

- `scrummaster/epics.md` (Status updates)
- `scrummaster/epics/<epic_id>/stories/<story_id>/plan.md` (Status updates)
- Project context files (Synchronized on completion)

```bash
/scrummaster:scrummaster-implement
```

During implementation, you can also monitor, revert, or review work using the
following commands:

- **Check status**: Get a high-level overview of your project's progress.

    ```bash
    /scrummaster:scrummaster-status
    ```

- **Revert work**: Safely undo a feature, phase, or a specific task.

    ```bash
    /scrummaster:scrummaster-revert
    ```

- **Review work**: Review completed work against guidelines and the plan.

    ```bash
    /scrummaster:scrummaster-review
    ```

## Context Hygiene

See `docs/context-hygiene.md` for the canonical context bundle and safety
guidance. To report context size:

```bash
python scripts/context_report.py
```

---

## 📋 Commands Reference

| Command                              | Description                                                                                | Generated Artifacts |
| :------------------------------------ | :------------------------------------------------------------------------------------------ | :------------------ |
| `/scrummaster:scrummaster-setup`     | Scaffolds the project and sets up the Scrummaster environment. Run this once per project.   | `scrummaster/product.md`<br>`scrummaster/product-guidelines.md`<br>`scrummaster/tech-stack.md`<br>`scrummaster/workflow.md`<br>`scrummaster/epics.md` |
| `/scrummaster:scrummaster-newepic`   | Starts a new epic to group related stories.                                                 | `scrummaster/epics/<id>/epic.md`<br>`scrummaster/epics.md` |
| `/scrummaster:scrummaster-newstory`  | Starts a new feature or bug story within an epic. Generates `spec.md` (with ACIDs) and `plan.md`. | `scrummaster/epics/<eid>/stories/<sid>/spec.md`<br>`scrummaster/epics/<eid>/stories/<sid>/plan.md`<br>`scrummaster/epics.md` |
| `/scrummaster:scrummaster-implement` | Executes the tasks defined in the current story's plan.                                     | `scrummaster/epics.md`<br>`scrummaster/epics/<eid>/stories/<sid>/plan.md` |
| `/scrummaster:scrummaster-status`    | Displays the current progress of the epics/stories and Fossil ticket state.                 | Reads `scrummaster/epics.md` |
| `/scrummaster:scrummaster-revert`    | Reverts a story, phase, or task by analyzing Fossil history.                                | Reverts Fossil history |
| `/scrummaster:scrummaster-review`    | Reviews completed work against guidelines and the plan.                                     | Reads `plan.md`, `product-guidelines.md` |

---

## 💡 Best Practices for Task Corrections

When a task or phase in your Scrummaster project wasn't completed correctly,
you have three native recovery flows:

1. **Agile In-Flight Corrections**: If you notice an implementation gap while
    the agent is actively coding, specify the fix directly in the chat. The
    agent will natively adapt its coding loop and verify the fix before
    finalizing the task.
2. **Review Corrections (`/scrummaster:scrummaster-review`)**: If issues are
    caught after a task/phase is marked completed, run the review command. The
    review agent will audit changes, verify style guides, execute tests, and
    append a `Review Fixes` tracking phase to `plan.md` to resolve them.
3. **Safe State Reversions (`/scrummaster:scrummaster-revert`)**: If a task
    implementation is fundamentally flawed and needs a complete reset, run the
    revert command. This rolls back specific Fossil checkins safely (via an
    inverse patch — Fossil has no direct `git revert` equivalent) and resets
    the task state back to pending `[ ]` so you can prompt a fresh approach.

---

## 🚂 Getting Started (Natural Language Triggering)

Once Scrummaster is installed in your environment, you don't need to memorize
slash commands. You can interact with Scrummaster natively using natural
language. Your active agent will dynamically recognize your intent and execute
the corresponding Scrummaster protocol in the background:

- **To Scaffold a Project**: > *"Let's create a new Scrummaster project"* or
    *"Run setup for Scrummaster"*
- **To Plan a Feature**: > *"Let's start a new story to add a login screen"*
    or *"Create a plan for the dark mode story"*
- **To Execute the Plan**: > *"Start implementing the active plan"* or
    *"Proceed with the implementation"*
- **To Check Progress**: > *"How is our story progress going?"* or *"Show the
    current project status"*
- **To Revert or Fix a Task**: > *"Revert the last completed task"* or *"Let's
    review the completed phase"*

---

## 📂 Repository Structure

- `/skills`: The protocol logic (`SKILL.md`) for each command.
- `/rules`: Platform-specific operational rules files.
- `/scrummaster-core`: The platform-agnostic core library (VCS adapters,
    models, prompt templates) built on by the other packages.
- `/mcp`, `/mcp-server`: MCP servers used by Scrummaster's tooling
    integrations.
- `/vendor/acid-cli`: The vendored, fossil-retargeted `acid` CLI.

---

## Development

### Prerequisites

- Python 3.9+
- Node.js 16+
- [Fossil SCM](https://fossil-scm.org/) 2.x

### Building Artifacts

```bash
# Build scrummaster-core
./scripts/build_core.sh
```

For release packaging and GitHub Releases flow, see `docs/release.md`.

### Running Tests

```bash
# Core tests
cd scrummaster-core && PYTHONPATH=src pytest

# acid CLI tests
cd vendor/acid-cli && bun test
```

### Synchronization and Validation

To synchronize all platform artifacts (Claude MDs, global Agent Skills, etc.)
from the core templates, run the unified sync script:

```bash
python scripts/sync_all.py
```

This script replaces the need to run `sync_skills.py` and
`validate_platforms.py --sync` separately.

Verify generated skill artifacts match the manifest and templates:

```bash
python3 scripts/check_skills_sync.py
```

Validate all platform artifacts:

```bash
python3 scripts/validate_artifacts.py
```

If validation fails:

- Regenerate artifacts with `python3 scripts/sync_skills.py`.
- Resync platform files with `python3 scripts/validate_platforms.py --sync`.

See `docs/validation.md` for a deeper troubleshooting checklist.

The skills manifest schema lives at `skills/manifest.schema.json`. To
regenerate the tool matrix in `docs/skill-command-syntax.md`, run:

```bash
python3 scripts/render_command_matrix.py
```

---

## 🎓 Resources

- [Antigravity Plugins Documentation](https://antigravity.google/docs/plugins):
    Official guidelines for using plugins in Antigravity.
- [Claude Code Plugins Documentation](https://code.claude.com/docs/en/discover-plugins):
    Guidelines for managing plugins in Claude Code.
- [GitHub Issues](https://github.com/harris-azmon/conductor/issues):
    Report bugs or request features.
- Scrummaster is a fork of the [Conductor](https://github.com/gemini-cli-extensions/conductor)
    plugin, replacing git with Fossil SCM, tracks with epics/stories, and
    adopting the ACID (Acceptance Criteria ID) methodology from
    [acai-sh/cli](https://github.com/acai-sh/cli) (vendored under
    `vendor/acid-cli/`). The team gratefully acknowledges Conductor and Keith
    Ballinger's original [.conductor](https://github.com/keithballinger/.conductor)
    project as the groundwork for this repository.

---

## ⚖ License

- License: [Apache License 2.0](LICENSE)
