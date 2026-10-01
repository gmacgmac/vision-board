---
task_name: [Task Name - Title Case]
created: YYYY-MM-DD
completed:           # Set when done
status: pending      # pending | in-progress | completed | deferred
categories: []       # From cortex/PROFILE.md §2 (Categories)
type: implementation # implementation | research | analysis | migration | review
tracker:             # optional: path#ID[,ID]
---

# Task: [Task Title]

---

## Pre-Task Requirements

_**Only include this section if task creates files in documentation folders**_

> Before writing any documentation files:
> 1. Resolve per `cortex/router.md § Resolution` (handlers linked in `cortex/REGISTRY.md`)
> 2. Confirm destination via `cortex/REGISTRY.md` doc surface + PROFILE conventions
> 3. Run the `/cortex-organize` skill for formatting
>
> **DO NOT hardcode file paths** — let PROFILE + the skill determine destination and template.

---

## Problem Statement

[Brief description of what problem this task solves or what needs to be done. 2-4 sentences.]

---

## Task Overview

[High-level steps numbered. Keep it brief - details go in Execution Steps.]

1. [First major step]
2. [Second major step]
3. [Third major step]

---

## Execution Steps

### Step 1: [Step Name]

- **Action**: [What to do]
- **Files**: `path/to/file.extension`
- **Details**: [Specifics if needed]

### Step 2: [Step Name]

- **Action**: [What to do]
- **Files**: `path/to/file.extension`

### Step 3: [Step Name]

- **Action**: [What to do]

---

## Files Involved

> **Use relative paths from project root**.
> DO NOT use absolute paths — task files must be portable.

| File | Purpose |
|------|---------|
| `path/to/target.extension` | Target for changes |
| `path/to/reference.extension` | Reference implementation |

---

## Constraints

- **DO NOT** [specific thing to avoid]
- **STOP** and alert user if [unexpected condition]

---

## Success Criteria

- [ ] [Measurable outcome 1]
- [ ] [Measurable outcome 2]
- [ ] Task file updated with completion notes

---

## References

> Use relative paths (e.g., `docs/dev/...`), not `file:///...` URLs.

- `path/to/relevant-doc.md`
- `path/to/related-file.extension`

---

## Agent Notes

_To be completed by agent after task execution._

### Execution Log
- [ ] Started: YYYY-MM-DD HH:MM
- [ ] Completed: YYYY-MM-DD HH:MM

### Changes Made
- 

### Issues & Resolutions
- 

### Statistics (if applicable)
- Files processed: X
- Errors: 0

---

## On Completion

1. Update frontmatter: `status: completed` and `completed: YYYY-MM-DD`
2. Append your LOG entry — one line, terminated with a newline, append-only (never `str_replace`):
   ```
   [[YYYY-MM-DD HH:MM]] [CATEGORY] Completed: [task_name] → Task: [[Link to this file]]
   ```
   `[CATEGORY]` from `PROFILE.md` §2. Cite files by path + symbol, never by line number.
3. If `tracker` is set, delete those rows and rewrite Status.

> This is a standalone task, so this entry is the whole record — there is no set entry. Do not write
> to `AUDITED.md`; that is `cortex-garden`'s ledger alone.
