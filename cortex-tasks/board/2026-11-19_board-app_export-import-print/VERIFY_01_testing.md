---
skills: [cortex-docs]
---
# VERIFY_01_testing: Final Verification

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

## Objective

Use it as a person would, with `?flags=boardFiles`: export a real board and one container, import into a new board
and into the current one, print a board and a container to PDF (border on and off), in both skins, light and dark.
Judge against PLAN.md § Decisions; confirm nothing listed under "Not built" crept in.

## Steps

1. The full gates: `npm run verify`, `check`, `gen -- --check`, `npm test`, `test:plugin`, the full page suite
   once (with the config).
2. Round trips on the fixtures (`packages/format/fixtures/*.ledger.jsonl`): what comes back equals what went out
   (cards, links, answers, places, timeline dates); an agent's import drops answers.
3. The PDFs: curves are strokes, colours kept, nothing of the page's chrome; open them and look.
4. Docs match the code (`cortex-docs`): `api.md`, `plugin.md`, `components.md`.
5. Findings with severity; fix a defect inside the set's files with its failing test first; else report.

Port 8710.

## Constraints

No git commands that change state. No PII in examples. Deviation: stop and report. Each behaviour starts with a failing
test. Sentences in words files. Budgets never block: report measured numbers.

## On Completion

Fill Implementation Notes, update your TASK-STATUS row and notes, append one LOG line:
`[[YYYY-MM-DD HH:MM]] [category] ID: [what changed] → Task: [[cortex-tasks/board/2026-11-19_board-app_export-import-print/<file>]]`

## Implementation Notes

**Status**: Pending
