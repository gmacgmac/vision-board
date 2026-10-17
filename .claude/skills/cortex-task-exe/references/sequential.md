# Sequential Orchestration Protocol

You are the orchestrator. Your ONLY job is to coordinate — you NEVER do task work directly.

## Input Modes

- **Batch mode**: A TASK-STATUS.md containing a table of tasks.
- **Individual mode**: One or more standalone task files provided directly by the user.

In BOTH cases, spawn a task-execution sub-agent for EACH task. One sub-agent per task, sequentially.

---

## Pre-Flight

### Batch Mode
1. Read TASK-STATUS.md — extract the task table.
2. Read PLAN.md — understand the full context.
3. Identify pending tasks — filter for `Pending` or `In Progress` status, preserve order.
4. Frontmatter Lifecycle (SKILL.md): flip `status` to `in-progress` if needed.

### Individual Mode
1. Read each task file provided by the user.
2. Tasks execute in the order provided.
3. If a task file references a parent context doc, read that too.

### Then (both modes)
4. Confirm with user: "I found N pending tasks: [list]. Proceeding sequentially via sub-agents."

---

## Read Discipline Checkpoint

Pre-flight reads end here. From now on, before reading any file, ask: "is this read justified, or am I duplicating sub-agent work?"

---

## Execution Loop

For each pending task (in order):

### 1. Prepare
- Identify the next pending task ID.
- DO NOT read the task file yourself — the sub-agent will.
- DO NOT re-read TASK-STATUS.md or PLAN.md inside the loop.

### 2. Dispatch

Invoke a task-execution sub-agent with:

**contextFiles** (pass as file references):
- Batch mode: TASK-STATUS.md and PLAN.md
- Individual mode: the task file itself (and parent docs if any)

**Prompt** (lean):
```
Complete the next pending task ({TASK_ID}) from the provided TASK-STATUS.md.

Rules:
- You are a Sub-Agent
- Read the task file and PLAN.md for full context
- Read notes from completed tasks before starting
- No git commits
- Don't over-engineer — be concise
- Reuse existing patterns: search the repo first, import or follow what exists, never copy it
- If you need to deviate from the plan, report back to the orchestrator
- Update the task file's Implementation Notes when done
- Update TASK-STATUS.md when done
- Follow the task file's On Completion, including your own single LOG entry (one line, ends with a newline)
- Run your own tests, plus the tests of every shared pattern or file you change (search the test folders for its name). The orchestrator runs the full gates.
- No new external dependencies unless the task file calls for them
- Survival-critical (workspace rules, non-negotiable): use `cwd` for commands, never `cd path &&`. Any write >50 lines: CREATE first section, then APPEND in chunks. If you hit repeated connection-reset errors, STOP — do not retry in a loop — report it as a violation and switch to chunked appends.

Return Contract — your final message MUST end with this block, exactly:
---
TASK_ID: {TASK_ID}
STATUS: COMPLETED | BLOCKED | DEVIATION
FILES: <comma-separated paths created/modified, or "none">
VERIFICATION: <what was checked and the result>
NOTES: <one line for the orchestrator; "none" if nothing>
---
```

### 3. Wait & Verify
- Trust the sub-agent's return block. Parse STATUS, FILES, VERIFICATION, NOTES.
- If `STATUS: COMPLETED` — brief status update, proceed to next task.
- If `STATUS: BLOCKED` or `DEVIATION` — STOP, inform user with the sub-agent's NOTES.
- If the return block is missing or malformed — treat as failure, ask the sub-agent to re-report.

### 4. Status Update
After each task: `[check] [TASK_ID] complete. [N] remaining.`

---

## Orchestrator Read Discipline

Reads of TASK-STATUS.md and PLAN.md are budgeted:
- **Once at pre-flight** — to identify pending tasks.
- **Once at the end** — to confirm final state before logging.
- **Never inside the loop** — trust sub-agent return blocks.

Each sub-agent owns its task file.

Between dispatch cycles, the orchestrator's only inputs are the structured return blocks from prior sub-agents.

---

## On All Tasks Complete

Logging is **two-level, each entry written exactly once**: every sub-agent appends its own task
entry via its task file's On Completion; the orchestrator adds one set entry. Never write a
sub-agent's entry for it, and never write to `AUDITED.md` — that is `cortex-garden`'s ledger alone.

Before anything below: run the project's full gates (build, tests, lint). On a failure, don't mark the set complete; report it.

### Batch Mode
1. Frontmatter Lifecycle (SKILL.md): flip `status: completed`, `completed: YYYY-MM-DD`.
2. Append the **set** entry to `LOG.md` — one line, terminated with `\n`. `[CATEGORY]` from `PROFILE.md` §2:
   `[[YYYY-MM-DD HH:MM]] [CATEGORY] Completed set: {task_name} → Task: [[path/to/TASK-STATUS.md]]`
3. Report to user: `All [N] tasks complete. TASK-STATUS.md updated. LOG entry created.`

### Individual Mode
1. Each task file's On Completion is handled by its sub-agent — including its LOG entry.
2. **No set entry.** There is no set, so the orchestrator adds nothing; the per-task entries are the complete record.
3. Report to user: `All [N] tasks complete. Task files updated. LOG entries created.`

---

## Error Handling

- **Sub-agent reports blocker**: Stop pipeline, inform user with full context.
- **Sub-agent reports deviation**: Stop pipeline, inform user, wait for approval.
- **Sub-agent fails/times out**: Report to user, do not skip.
- **Sub-agent loops on connection resets**: This is a Long File Strategy violation — the sub-agent wrote a large file in one shot instead of chunking. Stop that sub-agent, report, re-dispatch ONCE with an explicit chunking reminder. If it recurs on the retry, STOP — do not keep re-dispatching — escalate to the user instead of looping the orchestrator itself.
- **Verification task fails**: Report failures — do not mark as complete.
