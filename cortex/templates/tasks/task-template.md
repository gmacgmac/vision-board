# [TYPE]_[##]_[task-title]: [Task Title]

<!-- 
  FILENAME MUST follow: [TYPE]_[##]_[task-title].md
  [TYPE] marks work type / agent assignment: BE (Backend), FE (Frontend),
  VERIFY (Verification), MANUAL (Human action), or a domain tag (e.g. API);
  use T for a generic single-stream task.
  Example: API_01_create-user.md
  NEVER create files like 01.md without a descriptive title!
-->

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md)  
> **Plan**: [PLAN.md](./PLAN.md)

---

## Objective

[One sentence: what does this task accomplish?]

---

## Context

[Brief context the agent needs. Reference PLAN.md for full background.]

**Read previous task notes in TASK-STATUS.md before starting.**

---

## Inputs

> **Use relative paths from project root** — DO NOT use absolute `file:///...` URLs.

- **Files to modify**: `path/to/target.extension`
- **Files to reference**: `path/to/reference.extension`
- **Patterns to follow**: [Link or description]
- **Shared artifacts to reuse**: `path/to/shared.ext` (`symbolName`) — built by [TASK_ID]. Import it; do not re-create it. See TASK-STATUS.md Shared Foundations.
- **Skills**: `cortex-architecture` (dev work) · `cortex-docs` (doc work, or code a doc describes) — load before starting. Delete if none apply.

---

## Steps

1. [ ] [First step - be specific]
2. [ ] [Second step]
3. [ ] [Third step]

---

## Validation

- [ ] [How to verify this works]
- [ ] [Specific test or check]

---

## Implementation Notes

_To be completed by agent after task completion._

**Status**: Pending  
**Completed**: YYYY-MM-DD HH:MM  

### Changes Made
- 

### Issues & Resolutions
- 

### Deviations from Plan
- None / [Describe if any, and why approved]

---

## On Completion

1. Fill in Implementation Notes above; set **Status** to `Completed`.
2. Update this task's row in [TASK-STATUS.md](./TASK-STATUS.md) — your row only.
3. Append **your own** LOG entry to `cortex/LOG.md` — one line, terminated with a newline,
   append-only (never `str_replace`). Other tasks may be appending at the same moment.

   ```
   [[YYYY-MM-DD HH:MM]] [CATEGORY] [TYPE]_[##]: [what you did] → Task: [[cortex-tasks/{concern}/{task-folder}/[TYPE]_[##]_[task-title].md]]
   ```

   `[CATEGORY]` from `PROFILE.md` §2. Cite files by path + symbol, never by line number.

> The orchestrator logs the **set** separately when every task is done — do not write that entry,
> and do not write to `AUDITED.md`. That is `cortex-garden`'s ledger alone.
