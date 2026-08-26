import { tool, type Plugin, type PluginModule } from "@opencode-ai/plugin";
import { queryTickets, queryTicketsByEpic, summarizeStatus, type StatusSummary } from "./fossil.js";
import { readScrummasterContext } from "./context.js";

export { queryTickets, queryTicketsByEpic, summarizeStatus, type StatusSummary } from "./fossil.js";
export { readScrummasterContext } from "./context.js";

export function formatStatusSummary(summary: StatusSummary): string {
	if (summary.epics.length === 0 && summary.unassigned.length === 0) {
		return "No Scrummaster tickets found. Run `/scrummaster-setup` and `acid push --all` (see vendor/acid-cli) to populate the fossil ticket table, or run `/scrummaster-new-story` to create one.";
	}

	const lines: string[] = [];
	for (const epic of summary.epics) {
		lines.push(`EPIC ${epic.epicId}`);
		for (const story of epic.stories) {
			lines.push(`  ${story.storyId}: ${story.completed}/${story.total} ACIDs done`);
		}
	}
	if (summary.unassigned.length > 0) {
		lines.push("UNASSIGNED (no epic_id)");
		for (const story of summary.unassigned) {
			lines.push(`  ${story.storyId}: ${story.completed}/${story.total} ACIDs done`);
		}
	}
	return lines.join("\n");
}

// The Scrummaster OpenCode adapter: exposes fossil-ticket status/context as
// native tools (structured data, no need for the agent to compose its own
// `fossil sql` calls) alongside the SKILL.md/commands install already
// covered by `skill/scripts/install.sh` and this package's
// `scrummaster-opencode-install` bin (see install-commands.ts).
const server: Plugin = async ({ directory }) => {
	return {
		tool: {
			scrummaster_status: tool({
				description:
					"Summarize Scrummaster epic/story/ACID completion from the local Fossil ticket table. Optionally scope to one epic id. Returns 'no tickets found' guidance if /scrummaster-setup hasn't been run yet.",
				args: {
					epicId: tool.schema
						.string()
						.optional()
						.describe("Limit the summary to one epic id"),
				},
				async execute(args, context) {
					const cwd = context.directory || directory;
					const rows = args.epicId
						? await queryTicketsByEpic(cwd, args.epicId)
						: await queryTickets(cwd);
					return formatStatusSummary(summarizeStatus(rows));
				},
			}),
			scrummaster_context: tool({
				description:
					"Read Scrummaster's core project context docs (product.md, product-guidelines.md, tech-stack.md, workflow.md) from the scrummaster/ directory's local synced copies.",
				args: {},
				async execute(_args, context) {
					const cwd = context.directory || directory;
					const files = await readScrummasterContext(cwd);
					if (files.length === 0) {
						return "No scrummaster/ context files found yet. Run /scrummaster-setup first.";
					}
					return files
						.map((file) => `# ${file.name}\n\n${file.content}`)
						.join("\n\n---\n\n");
				},
			}),
		},
	};
};

const module: PluginModule = { id: "scrummaster", server };
export default module;
