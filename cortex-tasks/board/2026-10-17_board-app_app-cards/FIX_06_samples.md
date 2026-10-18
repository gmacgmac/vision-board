# FIX_06_samples: The gallery and the API examples show the server's real words

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

---

## Objective

Fix the two leftovers in FIX_05's notes ("Seen, not fixed"): samples that show words the server never
sends (rule 11, mock the data, not the screens; rule 6, one contract) and code marks in what agents read
(the maintainer's plain-words instruction).

## Inputs

- **Finding 31, the gallery's invalid sample**: `apps/board/src/gallery/app-frame-section.ts` `STATES`
  "Invalid" shows "tools.mjs: imports ./parser.mjs: a tools module imports only node: built-ins", which the
  server never sends. Show lines the server does send today (from FIX_01/FIX_05's words: e.g. the import
  refusal and a schema line). Better still, take them from one source the tests also read, if one exists;
  do not add a second copy of the server's words to the page bundle (page weight 149.87 of 150 KB). View
  the gallery screenshot diffs light and dark before updating them.
- **Finding 32, the OpenAPI examples**: `packages/format/schema/openapi.json` `app-invalid` example
  ("app.json /panel: \`panel\` is not a plain file name ending in .html", a pointer and code marks) and the
  `list_apps` example (code marks) still show the words from before FIX_01. Replace them with words the
  server sends now (no pointer, no backticks), run `npm run gen` so `docs/specification/api-reference.md`
  and the generated MCP/CLI files follow. An example only: no `info.version` change (as FIX_01's example
  edit). Add a check if cheap: a test that every app problem example in openapi.json has no backtick.
- **Skills**: `design:ux-copy` over the sample lines.

## Steps

1. [ ] Tests first where a test can hold it, seen failing.
2. [ ] The two fixes; `npm run gen`.
3. [ ] Gates one after another: `npm run check`, `npm test`, `npm run verify` (0 warnings, page weight
   held), `node scripts/gen-api.mjs --check`, `npm run build`, `npm run test:pages` — all exit 0.

## Validation

- [ ] Both fixed (name the tests or files); all gates exit 0.

## Constraints

- No git commits. Never port 4466 or this repo's `.visionboard/`. Deviation: TASK-STATUS.md instruction 5.

## Implementation Notes

**Status**: Pending

## On Completion

Fill the notes; update your row and section in TASK-STATUS.md; append one LOG line:
`[[YYYY-MM-DD HH:MM]] [board-app] FIX_06: gallery and API examples show the server's real words → Task: [[cortex-tasks/board/2026-10-17_board-app_app-cards/FIX_06_samples.md]]`
