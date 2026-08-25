---
name: scrummaster-status
description: Displays the current progress of the project by parsing the Epics Index, fossil ACID ticket state, and individual story plans.
metadata:
  version: "1.0"
---

# Scrummaster Status Skill

You are an AI agent. Your primary function is to provide a status overview of the project by parsing the Epics Index, fossil ACID ticket state, and individual story plans.

## Operational Standards

-   **Precise Execution:** Do not skip steps. Do not make assumptions about the project state; always verify via the terminal.
-   **Tool Validation:** You MUST validate the success of every tool call. If a command fails, review the error, attempt to self-correct once, or halt and ask for guidance.
-   **Path Integrity:** Always use relative paths starting from the project root (e.g., `scrummaster/epics.md`).
-   **Interaction Protocol:** When gathering information or asking for decisions, you MUST provide either **single-choice** or **multiple-choice** options based on context-aware suggestions. If a specific option is preferred based on project standards or best practices, list it first, prefix it with '(Recommended)', and provide a brief, context-rich explanation of why it is the better choice. You MUST always include a custom or "Other" option to allow user-defined input. Avoid asking raw, open-ended questions without suggestions.
-   **Sequential Questioning (CRITICAL):** When gathering information or asking the user questions, if a native tool is available to present multiple questions for structured answering (e.g., a modal or form tool), you may use it to group questions. However, if you are interacting via standard text chat, you MUST ask questions strictly one at a time and wait for the user's response before proceeding to the next question. Do NOT output multiple questions in a single chat response.

---

## 1. Handshake & Context Initialization

Before starting the status overview process, you MUST locate and read the project's foundational context.

1.  **Locate Index:** Check for the existence of `scrummaster/index.md` in the project root.
    -   **If Missing:**
        -   Announce: *"Scrummaster is not initialized properly. I cannot find the `scrummaster/index.md` file."*
        -   Ask the user using a **Yes/No question** if they would like to run the setup process now to initialize Scrummaster.
        -   **If Approved:** Internally invoke the `scrummaster-setup` skill.
        -   **If Denied:** HALT and await further instructions.

2.  **Load & Verify Context:** Read `scrummaster/index.md` and use the provided links to locate the core files:
    -   **Epics Index** (`epics.md`)
    -   **Product Definition** (`product.md`)
    -   **Tech Stack** (`tech-stack.md`)
    -   **Workflow** (`workflow.md`)
    -   **Health Check:** You MUST verify that every linked file actually exists. If ANY of these core files are missing, HALT immediately. Announce which file is missing and ask the user if they would like to run the setup process to repair the environment.

---

## 2. Status Overview Protocol

Follow this sequence to provide a status overview.

### 2.1 Read Project Plan
1.  **Refresh From Fossil:** Query authoritative ACID/story state first: `fossil sql "SELECT tkt_uuid, epic_id, story_id, acid, status FROM ticket"`. The **Epics Index** file is a generated view of this — treat any discrepancy in favor of the ticket state.
2.  **Locate and Read:** Read the content of the **Epics Index**. Check `scrummaster/index.md` for the link, otherwise use the Default Path: `scrummaster/epics.md`.
3.  **Locate and Read Epics and Stories:**
    -   Parse the **Epics Index** to identify all epics, their registered stories, and story paths.
        *   **Parsing Logic:** When reading the **Epics Index** to identify stories, look for lines matching either the new standard format `- [ ] **Story:` or the legacy format `## [ ] Story:`.
    -   For each story, resolve and read its **Implementation Plan**. Check the story's `index.md` for the link, otherwise use the Default Path: `scrummaster/epics/<epic_id>/stories/<story_id>/plan.md`.

### 2.2 Parse and Summarize Plan
1.  **Parse Content:**
    -   Identify major project phases/sections (e.g., top-level markdown headings).
    -   Identify individual tasks and their current status by looking for checkbox markers: `[x]` for completed, `[~]` for in-progress, and `[ ]` for pending.
    -   Cross-check task completion against each story's ACID ticket statuses (`fossil sql "SELECT tkt_uuid, acid, status FROM ticket WHERE story_id='<story_id>'"`) — a story isn't truly complete until its ACID tickets are all `Closed`, even if every plan.md checkbox is `[x]`.
2.  **Generate Summary:** Create a concise summary of the project's overall progress. This should include:
    -   The total number of epics and stories per epic.
    -   The total number of major phases.
    -   The total number of tasks.
    -   The number of tasks completed, in progress, and pending.
    -   The number of ACID tickets closed vs. open.

### 2.3 Present Status Overview
1.  **Output Summary:** Present the generated summary to the user in a clear, readable format. The status report must include:
    -   **Current Date/Time:** The current timestamp.
    -   **Project Status:** A high-level summary of progress (e.g., "On Story", "Behind Schedule", "Blocked").
    -   **Current Phase and Task:** The specific phase and task currently marked as in progress.
    -   **Next Action Needed:** The next task listed as pending.
    -   **Blockers:** Any items explicitly marked as blockers in the plan.
    -   **Phases (total):** The total number of major phases.
    -   **Tasks (total):** The total number of tasks.
    -   **Progress:** The overall progress of the plan, presented as tasks_completed/tasks_total (percentage_completed%).
    -   **ACIDs:** acids_closed/acids_total (percentage_closed%), broken down per epic.
