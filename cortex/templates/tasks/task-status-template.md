---
task_name: [Task Name - Title Case]
created: YYYY-MM-DD
completed:           # Set when ALL tasks reach COMPLETED
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
5. **If you need to deviate, STOP and inform the user**
6. **Update frontmatter `status`** per `cortex-task-exe`'s Task-Set Frontmatter Lifecycle:
   `planned` → `in-progress` when you start, → `completed` when the table below is all done
7. **Update your row** in the Task List table below when you finish
8. **Add implementation notes** to your task file and brief notes here
9. **No git commits** throughout these tasks

---

## Task List

| # | ID | Wave | Task | Status | Notes |
|---|-----|------|------|--------|-------|
| 1 | PREP_01 | 1 | [Preparation](./PREP_01_task-name.md) | Pending | |
| 2 | IMPL_01 | 2 | [Implementation](./IMPL_01_task-name.md) | Pending | |
| 3 | VERIFY_01 | 3 | [Final verification](./VERIFY_01_testing.md) | Pending | |

**Status Values**: `Pending` | `In Progress` | `COMPLETED` | `Blocked` | `Deferred`

**Wave**: execution order, assigned by the planner. Same number = safe to run in parallel.
Waves run in ascending order; a wave completes before the next starts. All-distinct numbers
= fully sequential. The orchestrator reads waves from this column only — it does not read task
files.

---

## Shared Foundations

_Code created by this set that later tasks consume. Consumers MUST be in a higher wave than
the task that creates it. Omit the section if there are none._

| Artifact | Created by | Consumed by |
|----------|-----------|-------------|
| `path/to/shared.ext` (`symbolName`) | PREP_01 | IMPL_01, IMPL_02 |

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
- [ ] LOG entry created (see below)

---

## On Completion

When ALL tasks are done. This is the **orchestrator's** entry — the set. Each task already logged
itself on completion; do not restate those.

1. Update frontmatter: `status: completed` and `completed: YYYY-MM-DD`
2. Append the set LOG entry — one line, terminated with a newline, append-only:
   ```
   [[YYYY-MM-DD HH:MM]] [CATEGORY] Completed set: [task_name] → Task: [[Link to this folder/TASK-STATUS.md]]
   ```
   `[CATEGORY]` from `PROFILE.md` §2.
3. If `tracker` is set, delete those rows and rewrite Status. Orchestrator only, after the full set.
4. `cortex-garden` picks the entries up from `LOG.md` later and coalesces them into one thread.
   Nothing here writes to `AUDITED.md`.
