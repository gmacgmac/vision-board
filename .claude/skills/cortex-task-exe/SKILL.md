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

Whoever touches a TASK-STATUS.md first sets `status: in-progress` (from `planned`).

**Closing the set** — `status: completed` + `completed: YYYY-MM-DD` + the set LOG entry — happens
once, after the project's full gates pass:
- **An orchestrator is running the set** → the orchestrator closes it. A sub-agent never does,
  even when it finishes the last row.
- **No orchestrator** (tasks run one at a time, directly) → the agent that finishes the last row
  runs the full gates, then closes it.

A set can be run one task at a time by different agents, so don't assume someone already flipped
it. No-op if the value is already correct.

---

## Testing by Tier

Test in proportion to what the change can break. Judge the tier from the change itself:

| Tier | The change | Run |
|---|---|---|
| **Small** | Wording, styling, config values; one area, no logic | Tests of the files touched, plus lint / type-check. None exist → say so |
| **Normal** | Logic inside one area | Its own tests, plus tests of every shared pattern or file it changed |
| **Wide** | A contract, a Shared Foundations item, or more than one area | The project's full gates |

- Unsure → the higher tier.
- Every test run has a time limit (PLAN.md House Rules, else a few minutes). A run that hangs is a
  failure to report, not something to wait out.
- The full gates always run once, when the set closes.

---

## Mode: Single Task (Direct Execution)

You are the executor. Read the task file, do the work, report back.

1. Read the task file — note its steps, inputs, and constraints. Check your testing environment is ready before you start.
2. If the task references PLAN.md or TASK-STATUS.md, read those for context (prior task notes) and apply the **Task-Set Frontmatter Lifecycle** above.
3. Adopt the persona, if the task has one — its `persona:` field, or its Persona cell in TASK-STATUS.md. It is your point of view: it helps you notice problems, never changes scope, ownership or stop rules. Report what you notice; record it under **Caught Beyond the Brief** in the task file's Implementation Notes.
4. Execute the steps. If issues arise, work through them — collaborate with the user if needed.
5. Do NOT deviate from the plan silently. If deviation is needed, stop and discuss.
6. Document findings in the task file's Implementation Notes.
7. Verify your changes by tier (§ Testing by Tier), plus whatever validation the task specifies.
8. Record any security concerns you surface in the task's Implementation Notes (or TASK-STATUS.md in a set).
9. Update your row in TASK-STATUS.md's table. Not a sub-agent and this was the last row → close the set per the Lifecycle above (full gates first).
10. Follow the task file's **On Completion** — append your own LOG entry for this task. One line, terminated with a newline, append-only; never `str_replace`. If you closed the set in step 9, also append the set entry.
11. Keep the user informed of progress and material findings along the way.

**Constraints**:
- No git commits unless the user asks. As a sub-agent, never.
- Be concise — don't over-engineer.
- **Never write to `cortex/AUDITED.md`** in any mode. That is `cortex-garden`'s ledger — it records what has been *verified*. Task execution's record is the LOG entry.
- Long File Strategy and `cwd` usage are MANDATORY per workspace rules (survival-critical — see steering). Do not skip these even under time pressure.

**Return Contract** (when operating as a sub-agent):
```
---
TASK_ID: {TASK_ID}
STATUS: COMPLETED | BLOCKED | DEVIATION
FILES: <comma-separated paths created/modified, or "none">
VERIFICATION: <tier (small | normal | wide); what was checked and the result>
REQUESTS: <one per line: `path` — what's needed — blocking | non-blocking; or "none">
NOTES: <one line for the orchestrator; "none" if nothing>
---
```

`REQUESTS` is for changes needed in files this task doesn't own. Never make them — list them. Not
a sub-agent → tell the user instead.

---

## Mode: Sequential Orchestration

You are the orchestrator. You NEVER do task work directly — you dispatch sub-agents. One
exception: a task that needs a person live (§ Sub-Agent Dispatch Protocol) you run yourself.

For the full sequential protocol (read-discipline checkpoint, dispatch loop, read discipline, return-block parsing), read `references/sequential.md`.

**Key non-negotiables**:
- Logging is two-level: each sub-agent logs its own task, the orchestrator logs the set. Each entry written exactly once.
- One sub-agent per task, in order. Wait for each to complete before dispatching the next.
- Pass TASK-STATUS.md and PLAN.md as contextFiles. Do NOT paste task file content into the prompt.
- Trust the sub-agent's return block; check its work yourself only where you judge it worthwhile.
- If any sub-agent reports BLOCKED or DEVIATION, stop and inform user.
- Route every `REQUESTS` item before the next dispatch.

---

## Mode: Parallel Orchestration

You are the orchestrator. Dispatch independent tasks in waves. Same exception as sequential: a
task that needs a person live you run yourself.

For the full parallel protocol (wave assignment, dispatch, error handling), read `references/parallel.md`.

**Key non-negotiables**:
- Logging is two-level, same as sequential: each sub-agent logs its own task, the orchestrator logs the set. A whole wave appends at once, so one line ending in `\n`, append-only.
- Waves run in order; tasks within a wave run in parallel.
- Parallel tasks MUST NOT modify the same files — TASK-STATUS.md's File Ownership says who owns what.
- A wave gate runs between waves: every request routed, orchestrator-owned files updated, tests green (full gates only after a wide wave).
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

**Needs a person live** (a login, a one-time code, hardware, an outside account)? Don't dispatch it
in the background — a sub-agent usually can't reach the user. Run it yourself, in the foreground:
confirm the person is ready first, then one action or code per exchange.

**Model**: name one on every dispatch, never the default. Use the task's `Model` class (`standard` for defined-shape work, `strong` for pattern-setting, design, or debugging); the project's steering maps classes to models — if it doesn't, ask the user.

**Persona**: if the task's `Persona` cell in TASK-STATUS.md is set (individual mode: the task file's `persona:` field), paste it verbatim as the first lines of the prompt, then the framing line from the dispatch prompt (`references/sequential.md` · `references/parallel.md`). `—` → omit both.