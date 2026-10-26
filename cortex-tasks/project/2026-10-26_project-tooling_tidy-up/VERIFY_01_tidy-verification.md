# VERIFY_01_tidy-verification: Verification

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

---

## Objective

Show, with evidence, that the code now meets `docs/principles.md`, and list exactly what doesn't.

## Context

The set's success criteria (PLAN.md). Review as someone who will host this board in nclite and has no
history of how it got here: a rule is met when the code shows it, not when a doc says so.

## Inputs

- **Files to modify**: this task file's notes only; a findings file
  `cortex-tasks/project/2026-10-26_project-tooling_tidy-up/VERIFY_01_findings.md`.
- **Files to reference**: `docs/principles.md`, the review
  (`cortex-tasks/board/2026-10-26_project-tooling_code-organisation-review.md`), every task's notes.
- **Skills**: `cortex-architecture`, `cortex-docs` (the doc audit), `cortex-research`.

## Steps

1. [ ] **Re-run the review** §1-§19, finding by finding: closed (with the evidence: file + symbol, a
   `grep`, a test) or open (why, and the tracker row to add).
2. [ ] **Plant a back door of each kind** in a scratch copy (deep import, CSS back door, colour literal,
   I/O outside its layer, a board import of the shell, a user-facing literal, a 120-line function) and
   show `verify` or the tests catch each; remove them.
3. [ ] **Mount the board with a fake host** and walk a round: draw, answer, note, Send to the fake chat.
4. [ ] **Full gates**: `npm test`, `npm run verify`, `npm run check`, `gen --check`, the full page suite
   three times on several workers; record the times.
5. [ ] **Doc audit** (`cortex-docs`): every doc that describes code this set moved still holds.
6. [ ] **Look at the board** in a browser, light and dark, at three zooms: nothing changed for the person.

## Validation

- [ ] Every success criterion in PLAN.md ticked with its evidence, or listed open with a tracker row

---

## Implementation Notes

_To be completed by agent after task completion. Re-run? Add a `### Run N` block; never overwrite._

**Status**: Pending  
**Completed**: YYYY-MM-DD HH:MM  

### Changes Made
- 

### Issues & Resolutions
- 

### Caught Beyond the Brief
- None

### Deviations from Plan
- None

---

## On Completion

1. Fill in Implementation Notes; set **Status** to `Completed`.
2. Update this task's row in [TASK-STATUS.md](./TASK-STATUS.md) — your row only.
3. Append your own LOG entry to `cortex/LOG.md` — one line ending in a newline, append-only:
   `[[YYYY-MM-DD HH:MM]] [project-tooling] VERIFY_01: what you did → Task: [[cortex-tasks/project/2026-10-26_project-tooling_tidy-up/VERIFY_01_tidy-verification.md]]`
4. Return the `cortex-task-exe` Return Contract, with `REQUESTS` for anything outside your files.
   Never write the set entry or `AUDITED.md`. No commits.
