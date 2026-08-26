[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

# acid CLI

The `acid` command-line interface scans a repo for spec-driven-development
requirements (ACIDs — Acceptance Criteria IDs) and code references, and syncs
them to a local [Fossil](https://fossil-scm.org/) repository's ticket table.
It's a fork of [acai-sh/cli](https://github.com/acai-sh/cli), retargeted from
that project's hosted SaaS (`app.acai.sh`) to a fully local, fossil-native
backend — one fossil ticket per ACID, no server, no API token. Everything
lives in your fossil checkout.

It also supports one-way export of ACID/ticket status to a Trello board
(`acid trello-export`).

## Commands

- `acid push [feature-names...] [--all]` — scans local spec files and code
  references, creates/updates one fossil ticket per ACID. Recognizes two spec
  formats:
  - `features/<name>.feature.yaml` (this project's own dogfooded specs, under
    `features/cli/`)
  - `scrummaster/epics/<epic_id>/stories/<story_id>/spec.md` (the format
    [Scrummaster](../../README.md)'s `/scrummaster-newstory` skill generates)
- `acid features [--product <name>] [--impl <name>]` — lists known features
  for one implementation, with completion/ref counts
- `acid feature <name>` — full ACID-level context for one feature
- `acid set-status <json>` — writes status/comment for a batch of ACIDs
- `acid trello-export` — one-way export of ticket state to a Trello board
- `acid skill [--install]` — prints or installs the bundled
  `.agents/skills/acid/SKILL.md` agent-skill prompt

Run `acid <command> --help` for full flag documentation, or see the ACID specs
themselves under `features/cli/*.feature.yaml` — this CLI's own behavior is
tracked the same way it tracks yours.

## Install

The CLI is available on NPM as a JavaScript bundle:

```sh
npm i -g @scrummaster/acid-cli
```

If you don't have a JavaScript runtime, standalone Linux and macOS binaries
are published on this repo's [GitHub Releases](https://github.com/harris-azmon/conductor/releases).

### Install from release

```sh
curl -fL https://github.com/harris-azmon/conductor/releases/download/<version>/acid-linux-x64 -o acid
chmod +x acid
sudo mv acid /usr/local/bin/acid
acid --help
```

User-local install without `sudo`:

```sh
mkdir -p "$HOME/.local/bin"
curl -fL https://github.com/harris-azmon/conductor/releases/download/<version>/acid-linux-x64 -o "$HOME/.local/bin/acid"
chmod +x "$HOME/.local/bin/acid"
"$HOME/.local/bin/acid" --help
```

## Project overview

The CLI is written in TypeScript with `bun` and `commander`. All fossil access
shells out to the real `fossil` binary (see `src/core/fossil-client.ts` and
`src/core/fossil.ts`) — there is no HTTP client or API layer left; `ACID_FOSSIL_CWD`
is the only configuration knob, defaulting to the process's working directory.

## Local development

```sh
bun install
AGENT=1 bun test
```

See `docs/releasing.md` for the npm/GitHub-release publishing process.

## License

Apache 2.0, forked from [acai-sh/cli](https://github.com/acai-sh/cli). You are
free to use, modify, and distribute this software, including for commercial
purposes, under the terms of the license.

## Security

See our [security checklist](docs/security.md) to understand how we protect this project and our users.
