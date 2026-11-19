---
skills: [cortex-architecture, cortex-docs]
---
# T_01_contract: Contract First

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

## Objective

The shapes everything else builds on (PLAN.md decisions 3-7, 11, 13-14).

## Steps

1. `export-file.schema.json`: `{ v: 1, title, items: write items, answers?: [{ key, answer: "check" | "cross" }],
   notes?: [{ key, text, thread? }] }`; items reference `write-item.schema.json`, no copy. Cards are keyed (the
   write items' own `key`) so answers and notes name their card.
2. `write-request.schema.json`: an optional `import: { into: "new" | "current", file: <export file> }` (or the
   shape that reuses the request best; say which). A route for export in `openapi.json`
   (`GET /boards/{board}/export?region=&notes=`). `npm run gen`.
3. `packages/format/src/export/`: `upgradeExport` (a step list by `v`, empty, tested with a fake v0 step in the
   test only), `conditionExport` (drops what the schema does not know, names each drop; fills required defaults).
4. `BoardHost`: `saveFile?`, `openFile?`, `print?` (types and doc comments only); `plugin.md` § the hooks; the flag
   `boardFiles` (off); `api.md`. Refusal and drop words in `packages/format/src/words/`.
5. Tests: schema accepts an export of each node kind; the upgrade chain; conditioning (an unknown field and kind
   dropped and named, a missing title defaulted).

## Validation

`npm run check`, `npm run gen -- --check`, `npm run verify`, `npm test`. Port 8410.

## Constraints

No git commands that change state. No PII in examples. Deviation: stop and report. Each behaviour starts with a failing
test. Sentences in words files. Budgets never block: report measured numbers.

## On Completion

Fill Implementation Notes, update your TASK-STATUS row and notes, append one LOG line:
`[[YYYY-MM-DD HH:MM]] [category] ID: [what changed] → Task: [[cortex-tasks/board/2026-11-19_board-app_export-import-print/<file>]]`

## Implementation Notes

**Status**: Pending
