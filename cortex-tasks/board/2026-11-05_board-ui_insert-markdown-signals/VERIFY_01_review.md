# VERIFY_01_review: Review the set as the person sees it

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

## Objective

Wave 1, merged, meets PLAN Decisions 5 and 7-11 as the person and an agent meet it; the docs say what the code does;
shared screenshots are current. Findings, not fixes, for code.

## Inputs

- The merged branch `feat/insert-md` at wave 1's tag; PLAN.md; each wave-1 task's notes and requests
- A test board on your port (never 4466, never the repo's own `.visionboard/`), drawn through the API: a flow
  with an insert, a consolidated card with `#`/`##`/`###`, a 4-column table with long words and a `---`,
  updated cards and an agent reply unseen and seen
- **Skills**: `cortex-architecture`, `cortex-docs`

## Steps

1. Look in the browser, light and dark, at 1400, 900 and 600 px: is "updated" the brightest thing until seen,
   and does it read apart from the action amber? Do replies stand apart from notes? Do tables never scroll? Do
   headings step? Does the toggle read its state? Screenshots of each in your notes.
2. Try the edges: insert's refusals; a table at the narrowest card; the toggle with the lock held elsewhere.
3. `cortex-docs` audit of what the set touched; do the doc requests in TASK-STATUS.
4. Re-take any screenshot the merge changed that no wave-1 task re-took (the gallery's pages); explain each.
5. Findings: blocking or not, with the failing case.

## Validation

- [ ] Findings listed; docs true; screenshots green; the specs of every wave-1 task pass on the merged branch

## Constraints

Deviation from a PLAN decision: stop and report (`DEVIATION`). No PII in examples. No git commits. Long writes in
chunks. Only your files; other needs under `REQUESTS`.

## Implementation Notes

_Re-run? Add a `### Run N` block; never overwrite an earlier run._

## On Completion

Notes here (Changes Made, Verification, Caught Beyond the Brief, Deviations); your TASK-STATUS row; one LOG line,
`[board-ui] VERIFY_01: … → Task: [[cortex-tasks/board/2026-11-05_board-ui_insert-markdown-signals/VERIFY_01_review.md]]`, ending in a
newline; the return block.
