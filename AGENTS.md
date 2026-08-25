# Scrummaster Agents

This repository contains the core Scrummaster system that enables Context-Driven Development for AI coding assistants. The system is designed to work across multiple AI platforms and development environments.

## Core Architecture

- **`scrummaster-core`**: Platform-agnostic core library (Python). Contains the protocol logic, Pydantic models, VCS adapters (Fossil, Git, Jujutsu), and prompt templates.
- **`mcp`**: VCS-abstraction MCP server (TypeScript), including the `FossilVcs` adapter.
- **`mcp-server`**: A small, unrelated MCP server exposing agent-loop hooks (`ralph_start`/`ralph_end`).
- **`vendor/acid-cli`**: A vendored, fossil-retargeted fork of `acai-sh/cli` providing the `acid` CLI for ACID tracking and one-way Trello export.
- **`.claude`**: Claude Code's own commands/skills directory. Intentionally excluded from this fork — still describes the earlier Conductor/git/tracks model. See `docs/adr/0002-scrummaster-fork.md`.

## Universal Installer

The system includes a universal installer that works across platforms:

### Quick Install

```bash
# Unix/macOS
curl -fsSL install.cat/harris-azmon/conductor | sh

# Windows (PowerShell)
irm install.cat/harris-azmon/conductor | iex
```

### Via mise

```bash
mise install harris-azmon/conductor
```

## Supported Platforms

### Agent Skills Compatible CLIs

- Claude CLI
- OpenCode (primary CLI target — see `docs/adr/0002-scrummaster-fork.md`)
- Codex
- Agent Skills specification compatible tools

### Direct Integrations

- Gemini CLI / Qwen Code
- Claude Code
- Antigravity
- GitHub Copilot Chat

## Key Features

- **Platform Source of Truth**: All protocol prompts are centralized in the core library and synchronized to adapters.
- **Plan before you build**: Create specs and plans that guide the agent.
- **Traceable requirements**: Every acceptance criterion gets a stable ACID, mapped 1:1 to a Fossil ticket.
- **Smart revert**: Fossil-aware revert command that understands logical units of work (epics, stories, phases, tasks).
- **High Quality Bar**: 100% test coverage requirement enforced for `scrummaster-core`.
- **VCS Support**: Fossil (default), Git, and Jujutsu.
- **Cross-Platform**: Works consistently across different tools and operating systems.

## Usage

### 1. Set Up the Project

```bash
/scrummaster:setup
```

### 2. Start a New Epic and Story

```bash
/scrummaster:newepic "Billing"
/scrummaster:newstory "Add a feature"
```

### 3. Implement the Story

```bash
/scrummaster:implement
```

## Installation Methods

Scrummaster supports multiple installation methods:

- **mise**: Cross-platform package manager
- **Smithery**: Modern package manager for CLI tools
- **PyPI**: Python package index
- **npm**: Node.js package manager
- **Homebrew**: macOS/Linux package manager
- **Chocolatey**: Windows package manager
- **Scoop**: Windows package manager

## Development

The system is built with:

- Python 3.9+ for core logic
- Node.js 16+ for the MCP servers
- TypeScript for the MCP servers
- Fossil SCM for version control
- Various CI/CD tools for automation

## License

Licensed under Apache License 2.0.

## Documentation

- [README.md](README.md): Main project documentation
- [INSTALL.md](INSTALL.md): Installation instructions
- [QUICKSTART.md](QUICKSTART.md): Quick start guide
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md): Troubleshooting guide
- [MARKETPLACE_INTEGRATION.md](MARKETPLACE_INTEGRATION.md): Marketplace integration details
- [docs/adr/0002-scrummaster-fork.md](docs/adr/0002-scrummaster-fork.md): Why and how this fork diverges from Conductor
