# scrummaster-opencode

An [OpenCode](https://opencode.ai) adapter for [Scrummaster](../README.md).

OpenCode already discovers Scrummaster's `SKILL.md` files generically via the
[Agent Skills](https://agentskills.io) spec (see `skill/scripts/install.sh`),
so this package isn't required to use Scrummaster with OpenCode. It adds two
things on top of that generic path:

1. **Two native tools** the agent can call directly instead of composing its
   own `fossil sql` invocations:
   - `scrummaster_status` — an epic → story → ACID completion rollup read
     from the local Fossil ticket table (optionally scoped to one epic).
   - `scrummaster_context` — the local synced copies of `product.md`,
     `product-guidelines.md`, `tech-stack.md`, and `workflow.md` under
     `scrummaster/`.
2. **First-class OpenCode slash commands** (`/scrummaster-setup`, etc.),
   installed as real files under `.opencode/commands/` rather than relying on
   OpenCode's skill auto-discovery.

## Installing the plugin

Add it to your project's `opencode.json`:

```json
{
  "plugin": ["scrummaster-opencode"]
}
```

Or use the CLI:

```bash
opencode2 plugin add scrummaster-opencode
```

OpenCode installs npm plugins automatically at startup.

## Installing the slash commands

```bash
npx scrummaster-opencode-install
```

This copies the bundled `commands/scrummaster-*.md` files into
`.opencode/commands/` in your current directory. Source of truth for these
files is `commands/*.md` at the root of the
[harris-azmon/conductor](https://github.com/harris-azmon/conductor) monorepo;
`npm run build` (via the `prebuild` script) re-copies them into this package
before publishing, so there's one place to edit them.

## Development

```bash
npm install
npm run build       # copies commands/, then runs tsc
npm run typecheck
npm test            # vitest
```

The fossil-facing code (`src/fossil.ts`) shells out to the real `fossil`
binary and expects the Scrummaster ticket schema
(`templates/fossil/ticket_schema.sql` at the monorepo root) to already be
applied — that's `/scrummaster-setup`'s job, not this package's.
