---
name: cortex-task-exe
description: "Execute cortex task files: run a single task directly, or orchestrate a task set sequentially or in parallel waves via sub-agents (with the return contract and read discipline). Use for \"do the tasks\", \"run the task set\", \"execute TASK-STATUS\", or completing a single task file."
---

# Task Execution

Execute one or more cortex task files. Select a mode based on what was provided.

## Mode Selection

| Trigger | Mode |
|---|---|
| One task file (or "do next task") | **Single** — execute directly |
| TASK-STATUS.md with all-distinct or absent `Wave` values | **Sequential** — orchestrate via sub-agents |
| TASK-STATUS.md where two+ tasks share a `Wave` number | **Parallel** — orchestrate in waves |

---

## Task-Set Frontmatter Lifecycle

Whoever touches a TASK-STATUS.md first sets `status: in-progress` (from `planned`); whoever
finishes the last table row sets `status: completed` + `completed: YYYY-MM-DD`. Applies in all
three modes — a set can be run one task at a time by different agents, so don't assume someone
already flipped it. No-op if the value is already correct.

---

## Mode: Single Task (Direct Execution)

You are the executor. Read the task file, do the work, report back.

1. Read the task file — note its steps, inputs, and constraints.
2. If the task references PLAN.md or TASK-STATUS.md, read those for context (prior task notes) and apply the **Task-Set Frontmatter Lifecycle** above.
3. Execute the steps. If issues arise, work through them — collaborate with the user if needed.
4. Do NOT deviate from the plan silently. If deviation is needed, stop and discuss.
5. Document findings in the task file's Implementation Notes.
6. Verify your changes — focus on testing the logic (run tests, diagnostics, or whatever validation the task specifies); ensure your testing environment is ready before you start.
7. Record any security concerns you surface in the task's Implementation Notes (or TASK-STATUS.md in a set).
8. Update your row in TASK-STATUS.md's table, then re-apply the Lifecycle above (it may now be the last task).
9. Follow the task file's **On Completion** — append your own LOG entry for this task. One line, terminated with a newline, append-only; never `str_replace`. If you flipped the set to `completed` in step 8, also append the set entry.
10. Keep the user informed of progress and material findings along the way.

**Constraints**:
- No git commits.
- Be concise — don't over-engineer.
- No PII in examples.
- **Never write to `cortex/AUDITED.md`** in any mode. That is `cortex-garden`'s ledger — it records what has been *verified*. Task execution's record is the LOG entry.
- Long File Strategy and `cwd` usage are MANDATORY per workspace rules (survival-critical — see steering). Do not skip these even under time pressure.

**Return Contract** (when operating as a sub-agent):
```
---
TASK_ID: {TASK_ID}
STATUS: COMPLETED | BLOCKED | DEVIATION
FILES: <comma-separated paths created/modified, or "none">
VERIFICATION: <what was checked and the result>
NOTES: <one line for the orchestrator; "none" if nothing>
---
```

---

## Mode: Sequential Orchestration

You are the orchestrator. You NEVER do task work directly — you dispatch sub-agents.

For the full sequential protocol (pre-loop pledge, dispatch loop, read discipline, return-block parsing), read `references/sequential.md`.

**Key non-negotiables**:
- Logging is two-level: each sub-agent logs its own task, the orchestrator logs the set. Each entry written exactly once.
- One sub-agent per task, in order. Wait for each to complete before dispatching the next.
- Pass TASK-STATUS.md and PLAN.md as contextFiles. Do NOT paste task file content into the prompt.
- Trust the sub-agent's return block. Do NOT re-read files to double-check.
- If any sub-agent reports BLOCKED or DEVIATION, stop and inform user.

---

## Mode: Parallel Orchestration

You are the orchestrator. Dispatch independent tasks in waves.

For the full parallel protocol (wave assignment, dispatch, error handling), read `references/parallel.md`.

**Key non-negotiables**:
- Logging is two-level, same as sequential: each sub-agent logs its own task, the orchestrator logs the set. A whole wave appends at once, so one line ending in `\n`, append-only.
- Waves run in order; tasks within a wave run in parallel.
- Parallel tasks MUST NOT modify the same files.
- Waves come from TASK-STATUS.md's `Wave` column, assigned by the planner. No Wave column → run sequential and say so.
- When in doubt about independence, run sequentially within that wave.

---

## Sub-Agent Dispatch Protocol

A task-execution sub-agent is a full agent instance. It has:

- **The same tool access as you** — file read/write, search, diagnostics, bash, web tools
- **Access to workspace rules and steering files** — it reads `.kiro/steering/` automatically
- **Its own autonomous execution** — it receives a prompt and optional `contextFiles`, then works independently and returns results
- **The orchestrator's model, by default** — if you don't name a model at dispatch, it silently runs on yours (often the most expensive tier)

It is not a dumb text processor. Do not duplicate file contents, rules, or context into its prompt. Tell it what to do and where to find it — it will read what it needs.

If the platform supports background/async sub-agent execution, dispatch that way so the orchestrator stays available to the user.

If the platform lets you choose a model/effort tier per sub-agent, you MUST set it explicitly on every dispatch — never rely on the default. Size it to the task: a lightweight tier for mechanical work (doc edits, renames, single-file changes), a stronger tier for complex work (cross-file refactors, debugging, design decisions). Use the orchestrator's own tier only when the task genuinely needs it.