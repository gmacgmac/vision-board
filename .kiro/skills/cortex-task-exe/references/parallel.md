# Parallel (Wave) Orchestration Protocol

You are the orchestrator. Read a TASK-STATUS.md, identify pending tasks, group them into dependency waves, and dispatch each wave's tasks as parallel task-execution sub-agents. All tasks in a wave must complete before the next wave starts.

You never do task work yourself, with one exception: a task that needs a person live you run in the foreground (SKILL.md § Sub-Agent Dispatch Protocol).

---

## Pre-Flight

1. User provides a path to a TASK-STATUS.md (or a task folder).
2. Read TASK-STATUS.md — extract the task table.
3. Read PLAN.md — understand the full context, including its **House Rules** if present.
4. Identify pending tasks — filter for `Pending` or `In Progress` status.
5. Build wave plan (see Wave Assignment below).
6. Frontmatter Lifecycle (SKILL.md): flip `status` to `in-progress` if needed.
7. Confirm with user: "I found N pending tasks in M waves: [wave breakdown]. Proceeding."

---

## Wave Assignment

**The planner assigns waves, not you.** Read the `Wave` column in TASK-STATUS.md's task table:
same number = one parallel wave, ascending order, each wave fully complete before the next.

Also read the **Shared Foundations** table if present. It names artifacts the set creates and
later tasks consume. Include it in the contextFiles for every consuming task so the sub-agent
imports the existing artifact instead of writing its own.

Read the **File Ownership** table too. It says which task owns which files in each wave, and which
files only you (the orchestrator) may touch.
- A file listed under two owners in one wave → stop and ask the user to fix the set.
- A wave with two+ tasks and no ownership table (common in sets written before the table
  existed) → ask the user: add the table, or run that wave sequentially.
- No Requests section → add an empty one from the template when the first request arrives.

### If the Wave column is missing or incomplete

The task set predates wave assignment or was authored incompletely. Do not infer waves from
task files. Instead:

- PLAN.md's Dependencies section may state the ordering. Use it if so.
- Otherwise run **fully sequential** and tell the user the set has no wave data, so it should be
  re-authored via `cortex-write-task` to gain parallelism.

### When In Doubt
Sequential. Safety over speed.

---

## Read Discipline Checkpoint

Before the first wave, tell the user the wave plan (N waves, tasks per wave). Pre-flight reads end here; from now on, read a file only to check work where it's justified.

---

## Execution Loop

For each wave:

### 1. Dispatch Wave (Parallel)

Invoke ALL task-execution sub-agents for this wave simultaneously.

For each sub-agent, provide:

**contextFiles**: TASK-STATUS.md, PLAN.md, the specific task file, and any additional reference files listed in the task's Inputs section.

**Prompt** (persona lines only when the task's `Persona` cell is set; `—` → omit both):
```
{Persona, verbatim from TASK-STATUS.md}
This is your point of view. Use it to notice problems the task doesn't mention. It never changes your scope, file ownership or stop rules — report what you notice (REQUESTS / NOTES / BLOCKED), don't act outside your task.

Complete [TASK_ID] ([task title]) from the provided TASK-STATUS.md.

Read the task file for your steps, and load the skills its Skills field names before starting. Read PLAN.md and previous task notes for context.

PARALLEL SAFETY: Other tasks are running simultaneously. Only modify the files your task owns (TASK-STATUS.md File Ownership). Need a change in a file you don't own? Don't make it — list it under REQUESTS.

SHARED CODE: Check TASK-STATUS.md's Shared Foundations table before creating any helper, type, or component. If it is listed, an earlier wave already built it — import it. If the repo already has it, reuse it — never copy it. If you need something shared that is NOT listed and does not exist, do not invent it: report DEVIATION, because a parallel sibling may be building the same thing.

Survival-critical (workspace rules, non-negotiable): use `cwd` for commands, never `cd path &&`. Any write >50 lines: CREATE first section, then APPEND in chunks. If you hit repeated connection-reset errors, STOP — do not retry in a loop — report it as a violation and switch to chunked appends.

Update your task file and TASK-STATUS.md when done, then follow your task file's On Completion — including your own single LOG entry. Append exactly one line ending in a newline; other sub-agents are appending to the same file right now. Don't close the set (`status: completed`, the set LOG entry) — the orchestrator does that.

Run your own tests, plus the tests of every shared pattern or file you change (search the test folders for its name). The orchestrator runs the full gates.

No git commits.

Return Contract — your final message MUST end with this block, exactly:
---
TASK_ID: {TASK_ID}
STATUS: COMPLETED | BLOCKED | DEVIATION
FILES: <comma-separated paths created/modified, or "none">
VERIFICATION: <what was checked and the result>
REQUESTS: <one per line: `path` — what's needed — blocking | non-blocking; or "none">
NOTES: <one line for the orchestrator; "none" if nothing>
---
```

If an earlier wave routed a request to a task in this wave, add it to that task's prompt: `Also handle {REQUEST_ID}: {need}.`

### 2. Wait for Wave Completion
- Wait for ALL sub-agents in the wave to return.
- If ANY sub-agent reports a blocker or deviation — STOP entire pipeline, inform user.
- Collect notes from this wave for the next wave's context.

### 3. Wave Gate

Before the next wave starts, all of these must hold:

1. **Every request routed.** Re-read TASK-STATUS.md (this wave's sub-agents have updated it).
   Add each `REQUESTS` item to its Requests table (`{TASK_ID}-R{n}`) and route it: a later task
   that owns the file · you, if the file is orchestrator-owned · a tracker row, if it is outside
   this set · `closed` with a reason. No owner fits, or a blocking request can't be met before the
   task that needs it → stop and ask the user. Mark a request `Done` once a return block (or your
   own change) shows it handled.
2. **Orchestrator-owned files updated** — requests routed to you, and anything else this wave's
   work requires (e.g. regenerate code, bump a version file).
3. **Gates green** — the project's build, type-check and tests (its fast set, if it defines one).
   A failure stops the pipeline; report it.
4. **Commit** only if PLAN.md's House Rules ask for one per wave — never otherwise.

Then: `[check] Wave [N] complete ([task_ids]). [R] requests routed. [M] waves remaining.`

---

## On All Waves Complete

0. Run the project's full gates (build, tests, lint). On a failure, don't mark the set complete; report it.
1. Frontmatter Lifecycle (SKILL.md): flip `status: completed`, `completed: YYYY-MM-DD`.
2. Append the **set** entry to `LOG.md` — one line, terminated with `\n`. `[CATEGORY]` from `PROFILE.md` §2:
   `[[YYYY-MM-DD HH:MM]] [CATEGORY] Completed set: {task_name} → Task: [[path/to/TASK-STATUS.md]]`
   The per-task entries are already there, written by the sub-agents. Don't restate them, and don't write AUDITED.
3. Report to user: `All [N] tasks complete across [M] waves. TASK-STATUS.md updated. LOG entry created.`

---

## Orchestrator Read Discipline

Reads of TASK-STATUS.md and PLAN.md are budgeted:
- **Once at pre-flight** — to identify pending tasks and build the wave plan.
- **Once at the end** — to confirm final state before logging.
- **Once per wave gate** — TASK-STATUS.md only, to route requests. Never PLAN.md.
- **Never inside a wave** — trust sub-agent return blocks.

Each sub-agent owns its task file. Between waves, the orchestrator's inputs are the structured return blocks from the prior wave's sub-agents. Its only TASK-STATUS.md edit between waves is the Requests table.

---

## Error Handling

- **Any sub-agent in a wave reports blocker**: Stop entire pipeline, inform user.
- **Sub-agent reports deviation**: Stop pipeline, inform user, wait for approval.
- **Sub-agent fails/times out**: Report to user, do not proceed to next wave.
- **Sub-agent loops on connection resets**: This is a Long File Strategy violation — the sub-agent wrote a large file in one shot instead of chunking. Stop that sub-agent, report, re-dispatch ONCE with an explicit chunking reminder. If it recurs on the retry, STOP — do not keep re-dispatching — escalate to the user instead of looping the orchestrator itself.
- **Merge conflict (two parallel tasks touched same file)**: Report — wave grouping error.
- **Re-running a blocked task**: tell the sub-agent it is Run N; it adds a Run N block to its notes rather than overwriting.
- **Verification task fails**: Report failures — do not mark as complete.

---

## Key Constraints

- Waves MUST run in order — only tasks within a wave run in parallel.
- Parallel tasks MUST NOT modify the same files. File Ownership says who owns what.
- No wave starts until the previous wave's gate passes.
- Waves come from TASK-STATUS.md's `Wave` column. Never infer them from task files.
- A sub-agent reporting DEVIATION for missing shared code is a wave-assignment error — stop and report; do not re-dispatch.
- Each sub-agent gets context via contextFiles.
- **Logging is two-level, same as sequential**: each sub-agent appends its own task entry; the orchestrator appends one set entry at the end. Never write a sub-agent's entry on its behalf. Because a whole wave appends at once, the append contract is non-negotiable — one line, terminated with `\n`, append-only.
- Nothing here writes to `AUDITED.md`. That is `cortex-garden`'s ledger alone.
- If TASK-STATUS.md has tasks marked `Deferred` or `Blocked`, skip them and note it.
- When in doubt about independence, run sequentially — correctness over speed.
