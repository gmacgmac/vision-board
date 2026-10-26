---
task_name: [Task Name - Title Case]
created: YYYY-MM-DD
completed:           # Set when ALL tasks reach Completed
status: planned      # planned | in-progress | completed | deferred
categories: []       # From cortex/PROFILE.md §2 (Categories)
tracker:             # optional: path#ID[,ID]
---

# [Task Name] - Task Status

> **Plan**: [PLAN.md](./PLAN.md)  
> **Created**: YYYY-MM-DD

---

## Instructions for Agents

1. **Read PLAN.md first** to understand full context
2. **Read notes from completed tasks** before starting yours
3. **Respect the Wave column** — do not start a task whose wave has not been reached
4. **Reuse Shared Foundations** — check that table before writing a helper, type, or component;
   if it is listed, import it, do not reinvent it
5. **Touch only the files you own** (File Ownership below, or your task's *Files to modify*). Need
   a change elsewhere? List it under `REQUESTS` in your return block — the orchestrator routes it
6. **If you need to deviate, STOP and inform the user**
7. **Update frontmatter `status`** per `cortex-task-exe`'s Task-Set Frontmatter Lifecycle:
   `planned` → `in-progress` when you start. Closing the set (`completed`) is the orchestrator's
   job — or, with no orchestrator, whoever finishes the last row, after the full gates
8. **Update your row** in the Task List table below when you finish
9. **Add implementation notes** to your task file and brief notes here. Re-run? Add a `Run N:`
   line here and a `### Run N` block in your task file; never overwrite an earlier run
10. **No git commits** — sub-agents never commit; the orchestrator commits only if PLAN.md's
    House Rules ask

---

## Task List

| # | ID | Wave | Model | Persona | Task | Status | Notes |
|---|-----|------|-------|---------|------|--------|-------|
| 1 | PREP_01 | 1 | strong | [Job title] — [what this role won't compromise on]. | [Preparation](./PREP_01_task-name.md) | Pending | |
| 2 | IMPL_01 | 2 | standard | — | [Implementation](./IMPL_01_task-name.md) | Pending | |
| 3 | VERIFY_01 | 3 | standard | [User role] — [what they expect to just work, seen with no builder context]. | [Final verification](./VERIFY_01_testing.md) | Pending | |

**Status Values**: `Pending` | `In Progress` | `Completed` | `Blocked` | `Deferred`

**Wave**: execution order, assigned by the planner. Same number = safe to run in parallel.
Waves run in ascending order; a wave completes before the next starts. All-distinct numbers
= fully sequential. The orchestrator reads waves from this column only — it does not read task
files to schedule.

**Persona**: a real job title + 1–2 sentences on what that role won't compromise on; `—` for none.
Optional; required for review and `strong` tasks. A point of view only — it never overrides
scope, file ownership, working rules or stop conditions.

---

## Shared Foundations

_Code created by this set that later tasks consume. Consumers MUST be in a higher wave than
the task that creates it. Omit the section if there are none._

| Artifact | Created by | Consumed by |
|----------|-----------|-------------|
| `path/to/shared.ext` (`symbolName`) | PREP_01 | IMPL_01, IMPL_02 |

---

## File Ownership

_Written by the planner. Required when two or more tasks share a wave, or when some files are
orchestrator-only (any mode); omit otherwise. A file has one owner per wave. The `orchestrator`
row holds files no sub-agent may touch — e.g. lockfiles, generated code, version files. Shared by
design, not owned: TASK-STATUS.md (each task edits its own row and notes) and `cortex/LOG.md`
(append-only)._

| Wave | Owner | Files |
|------|-------|-------|
| 2 | IMPL_01 | `path/to/a.ext`, `path/to/b.ext` |
| 2 | IMPL_02 | `path/to/c.ext` |
| — | orchestrator | `path/to/generated/`, `path/to/version-file` |

---

## Requests

_Written by the orchestrator from each sub-agent's `REQUESTS`. Every row needs a **Routed to**
before the next wave starts (sequential: before the next dispatch): a later task that owns the
file · `orchestrator` · a tracker row · `closed` with the reason. The orchestrator sets `Done`
once the routed work is reported handled._

| Request | From | Need | Routed to | Status |
|---------|------|------|-----------|--------|
| IMPL_01-R1 | IMPL_01 | `path/to/c.ext` — [what's needed] | IMPL_02 | Open |

**Status Values**: `Open` | `Done` | `Closed`

---

## Implementation Notes

### PREP_01: [Task Name]
_Status:_ Pending  
_Notes:_ 

---

### IMPL_01: [Task Name]
_Status:_ Pending  
_Notes:_ 

---

### VERIFY_01: Final Verification
_Status:_ Pending  
_Notes:_ 

---

## Completion Checklist

- [ ] All implementation tasks complete
- [ ] Verification task complete
- [ ] Every request `Done` or `Closed`
- [ ] LOG entry created (see below)

---

## On Completion

When ALL tasks are done and the project's full gates pass. Done once, by whoever closes the set —
the orchestrator, or with no orchestrator the agent that finishes the last row (`cortex-task-exe`
§ Task-Set Frontmatter Lifecycle). Each task already logged itself on completion; do not restate
those.

1. Update frontmatter: `status: completed` and `completed: YYYY-MM-DD`
2. Append the set LOG entry — one line, terminated with a newline, append-only:
   ```
   [[YYYY-MM-DD HH:MM]] [CATEGORY] Completed set: [task_name] → Task: [[Link to this folder/TASK-STATUS.md]]
   ```
   `[CATEGORY]` from `PROFILE.md` §2.
3. If `tracker` is set, delete those rows and rewrite Status. Whoever closes the set, after the full set.
4. `cortex-garden` picks the entries up from `LOG.md` later and coalesces them into one thread.
   Nothing here writes to `AUDITED.md`.
