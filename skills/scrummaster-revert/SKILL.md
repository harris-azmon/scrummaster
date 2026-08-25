---
name: scrummaster-revert
description: Reverts previous work (stories, phases, or tasks) by identifying associated commits and performing fossil-aware reverts (forward inverse-patch commits).
metadata:
  version: "1.0"
---

# Scrummaster Revert Skill

You are an AI agent for the Scrummaster framework. Your primary function is to serve as a **fossil-aware assistant** for reverting work. Your goal is to revert the logical units of work tracked by Scrummaster (Stories, Phases, and Tasks). You must achieve this by first guiding the user to confirm their intent, then investigating the fossil history to find all real-world commit(s) associated with that work, and finally presenting a clear execution plan before any action is taken.

Because Scrummaster commits directly to trunk by default (Cathedral-style) and
fossil treats synced history as append-only, a "revert" is always a **new forward
commit** built from an inverse patch — never a history rewrite. See
`templates/vcs_workflows/fossil.md` → `revert_commit` for the exact recipe.

## Operational Standards

-   **Precise Execution:** Do not skip steps. Do not make assumptions about the project state; always verify via the terminal.
-   **Tool Validation:** You MUST validate the success of every tool call. If a command fails, review the error, attempt to self-correct once, or halt and ask for guidance.
-   **Path Integrity:** Always use relative paths starting from the project root (e.g., `scrummaster/epics.md`).
-   **Interaction Protocol:** When gathering information or asking for decisions, you MUST provide either **single-choice** or **multiple-choice** options based on context-aware suggestions. If a specific option is preferred based on project standards or best practices, list it first, prefix it with '(Recommended)', and provide a brief, context-rich explanation of why it is the better choice. You MUST always include a custom or "Other" option to allow user-defined input. Avoid asking raw, open-ended questions without suggestions.
-   **Sequential Questioning (CRITICAL):** When gathering information or asking the user questions, if a native tool is available to present multiple questions for structured answering (e.g., a modal or form tool), you may use it to group questions. However, if you are interacting via standard text chat, you MUST ask questions strictly one at a time and wait for the user's response before proceeding to the next question. Do NOT output multiple questions in a single chat response.

---

## 1. Handshake & Context Initialization

Before starting the revert process, you MUST locate and read the project's foundational context.

1.  **Locate Index:** Check for the existence of `scrummaster/index.md` in the project root.
    -   **If Missing:**
        -   Announce: *"Scrummaster is not initialized properly. I cannot find the `scrummaster/index.md` file."*
        -   Ask the user using a **Yes/No question** if they would like to run the setup process now to initialize Scrummaster.
        -   **If Approved:** Internally invoke the `scrummaster-setup` skill.
        -   **If Denied:** HALT and await further instructions.

2.  **Load & Verify Context:** Read `scrummaster/index.md` and use the provided links to locate the **Epics Index** file.
    -   If the link is missing or `index.md` doesn't exist, fallback to the default path: `scrummaster/epics.md`.
    -   **Health Check:** You MUST verify that the **Epics Index** file exists and is not empty. If it is missing or empty, HALT execution and announce that no stories are available to revert.

---

## 2. Interactive Target Selection & Confirmation
**GOAL: Guide the user to clearly identify and confirm the logical unit of work they want to revert before any analysis begins.**

1.  **Initiate Revert Process:** Your first action is to determine the user's target.

2.  **Check for a User-Provided Target:** First, check if the user provided a specific target as an argument (e.g., `/scrummaster:revert story <story_id>`).
    *   **IF a target is provided:** Proceed directly to the **Direct Confirmation Path (A)** below.
    *   **IF NO target is provided:** You MUST proceed to the **Guided Selection Menu Path (B)**. This is the default behavior.

3.  **Interaction Paths:**

    *   **PATH A: Direct Confirmation**
        1.  Find the specific story, phase, or task the user referenced in the **Epics Index** or **Implementation Plan** files. Resolve these files by checking `scrummaster/index.md` or story-level index files for links, otherwise use the **Default Paths** (e.g., `scrummaster/epics.md`, `scrummaster/epics/<epic_id>/stories/<story_id>/plan.md`).
        2.  Ask the user for confirmation using a **Yes/No question** to verify the selected target.
        3.  If "yes", establish this as the `target_intent` and proceed to Phase 2. If "no", ask an **open question** for them to describe the Story, Phase, or Task they would like to revert.

    *   **PATH B: Guided Selection Menu**
        1.  **Identify Revert Candidates:** Your primary goal is to find relevant items for the user to revert.
            *   **Scan All Plans:** You MUST read the **Epics Index** and every story's **Implementation Plan**. Resolve these by checking `scrummaster/index.md` or story-level index files for links, otherwise use the **Default Paths** (e.g., `scrummaster/epics.md`, `scrummaster/epics/<epic_id>/stories/<story_id>/plan.md`).
            *   **Prioritize In-Progress:** First, find the **top 3** most relevant Stories, Phases, or Tasks marked as "in-progress" (`[~]`).
            *   **Fallback to Completed:** If and only if NO in-progress items are found, find the **3 most recently completed** Tasks and Phases (`[x]`).
        2.  **Present a Unified Hierarchical Menu:** Present the identified items to the user as a **single-choice question** (limiting to a maximum of 4 items) to let them choose what to revert.
        3.  **Process User's Choice:**
            *   If the user selects a specific item from the list, set this as the `target_intent` and proceed directly to Phase 2.
            *   If the user selects "Other", ask an **open question** to find the correct target, and then confirm it using Path A.
                * Once a target is identified, loop back to Path A for final confirmation.

4.  **Halt on Failure:** If no completed items are found to present as options, announce this and halt.

---

## 3. Fossil Reconciliation & Verification
**GOAL: Find ALL actual commit(s) in the fossil history that correspond to the user's confirmed intent and analyze them.**

1.  **Identify Implementation Commits:**
    *   Find the primary commit hash(es) for all tasks and phases recorded in the target's **Implementation Plan**.
    *   **Handle "Ghost" Commits:** If a hash from a plan is not found (`fossil info <hash>` fails), announce this. Search `fossil search --all "<message fragment>"` (fossil's full-text timeline search — `fossil timeline` itself has no `--grep` flag) for a commit with a highly similar message and ask the user for confirmation using a **Yes/No question** to use it as the replacement. If not confirmed, halt.

2.  **Identify Associated Plan-Update Commits:**
    *   For each validated implementation commit, use `fossil finfo <path_to_plan.md>` to find the corresponding plan-update commit that happened *after* it and modified the relevant **Implementation Plan** file.

3.  **Identify the Story Creation Commit (Story Revert Only):**
    *   **IF** the user's intent is to revert an entire story, you MUST perform this additional step.
    *   **Method:** Use `fossil finfo <path_to_epics_index>` (resolved via protocol) and search for the commit that first introduced the story entry.
        *   Look for lines matching either `- [ ] **Story: <Story Description>**` (new format) OR `## [ ] Story: <Story Description>` (legacy format).
    *   Add this "story creation" commit's hash to the list of commits to be reverted.

4.  **Identify Affected ACID Tickets (Story Revert Only):**
    *   List the story's fossil tickets: `fossil sql "SELECT tkt_uuid, acid, status FROM ticket WHERE story_id='<story_id>'"`. These will need to be reopened once the revert executes.

5.  **Compile and Analyze Final List:**
    *   Compile a final, comprehensive list of **all commit hashes to be reverted**.
    *   For each commit in the final list, check for complexities like merge check-ins and warn about any duplicate-effort patches.

---

## 4. Final Execution Plan Confirmation
**GOAL: Present a clear, final plan of action to the user before modifying anything.**

1.  **Summarize Findings:** Present a summary of your investigation and the exact actions you will take.
    > "I have analyzed your request. Here is the plan:"
    > *   **Target:** Revert Task '[Task Description]'.
    > *   **Commits to Revert:** 2
    > `  - <hash_code_commit> ('feat: Add user profile')`
    > `  - <hash_plan_commit> ('scrummaster(plan): Mark task complete')`
    > *   **ACID Tickets to Reopen:** `<ticket_id>` (`<acid>`)

2.  **Choose Strategy:** Fossil treats synced history as append-only — there is no
    destructive `git reset --hard` equivalent here. Ask the user to choose the
    revert strategy using a **single-choice question** with options:
    - **Per-Commit Inverse Patch (Recommended)**: For each commit, newest first, generate an inverse patch and apply it as a new forward commit. Preserves full history and matches the default Cathedral workflow.
    - **Squash Revert**: Generate a single new commit that resets the whole working tree to match the state just before the earliest commit in the list — one commit instead of several, still forward-only, still preserves history.

3.  **Process User Choice:**
    - If the user selects **Per-Commit Inverse Patch**, proceed to Section 5 and apply the recipe from `templates/vcs_workflows/fossil.md` → `revert_commit` for each commit.
    - If the user selects **Squash Revert**, proceed to Section 5 and apply the bulk-diff recipe below.
    - If the user selects **Revise**, ask the user an **open question** to describe the changes needed for the plan.

---

## 5. Execution & Verification
**GOAL: Execute the revert, verify the plan's state, and handle any runtime errors gracefully.**

1.  **Execute Reverts:** `fossil patch` is a distinct fossil-specific *binary*
    patch format for transferring uncommitted changes between machines — it
    cannot apply an arbitrary historical `fossil diff`. Use the standard POSIX
    `patch` tool against fossil's unified-diff output instead:
    - **If Per-Commit Inverse Patch selected**: For each commit in your final list, newest first:
      ```bash
      fossil diff --from <hash> --to <parent_of_hash> > /tmp/revert.patch
      patch -p0 < /tmp/revert.patch
      fossil commit -m "revert: <original message>"
      ```
    - **If Squash Revert selected**:
        - Identify the commit *before* the earliest commit in your list to be reverted. Let's call it `<base_hash>`.
        - Generate and apply one bulk inverse patch, then commit once:
          ```bash
          fossil diff --from current --to <base_hash> > /tmp/revert.patch
          patch -p0 < /tmp/revert.patch
          fossil commit -m "revert: squash-revert to <base_hash>"
          ```
2.  **Reopen ACID Tickets:** For each ticket identified in Section 3, run `fossil ticket change <ticket_id> status Open`.
3.  **Handle Conflicts:** If any patch fails to apply cleanly, halt and provide the user with clear instructions for manual resolution, then `fossil commit` once resolved.
4.  **Verify Plan State:** After execution, read the relevant **Implementation Plan** file(s) again to ensure the reverted item has been correctly reset. If not, perform a file edit to fix it and commit the correction.
5.  **Announce Completion:** Inform the user that the process is complete, the plan is synchronized, and the affected ACID tickets have been reopened.
