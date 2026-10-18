# FIX_07_last-words: Problems end cleanly; examples match the server

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

---

## Objective

Fix three of the four slips in FIX_06's notes ("Seen, not fixed"), under the plain-words instruction and
rule 6 (examples match the contract). Server and `openapi.json` only; no page code.

## Inputs

- **Finding 33, problems run together**: `apps/board/server/apps/supervisor.ts` `appInvalid` joins the
  problems with a space, so a line with no full stop runs into the next ("…at most 960 app.json: unknown
  field colour Fix them and try again."). End every joined problem cleanly (add a full stop where a line
  has none, or join with "; " and end with "."), one place. Test the exact words in `api-apps.test.ts`.
- **Finding 34, an example that names tools too early**: the `list_apps` example's `calculator` is
  `needs-approval` but lists `evaluate`, `history`; the server sends `tools: []` until Allow and a first
  run (decision 2). Make the example `[]` there (or show tools on an allowed app that has run). Extend
  FIX_06's `app-samples.test.ts` or `openapi.test.ts` so an example can't name tools on an app that isn't
  allowed. `npm run gen`; no `info.version` change.
- **Finding 35, "ending in .html" reads as the folder**: "panel is not a plain file name in the app's
  folder ending in .html" → e.g. "panel must be a file name ending in .html, in the app's folder" (same for
  tools and `.mjs`). Server wording only (`manifest.ts` / `fieldWords` or the schema's own message,
  whichever words it today). Update tests, FIX_06's `gallery.apps.json` and the OpenAPI examples if they
  quote it (its test will tell you).
- **Not this task**: the half-cut last line in a scrolling problems box stays (decision 11).
- **Skills**: `design:ux-copy` on the changed lines.

## Steps

1. [ ] Tests first, each seen failing.
2. [ ] The three fixes; `npm run gen`. View any screenshot diff light and dark before updating.
3. [ ] Gates one after another: `npm run check`, `npm test`, `npm run verify` (0 warnings),
   `node scripts/gen-api.mjs --check`, `npm run build`, `npm run test:pages` — all exit 0.

## Validation

- [ ] The three no longer reproduce (name the tests); all gates exit 0.

## Constraints

- No git commits. Never port 4466 or this repo's `.visionboard/`. Deviation: TASK-STATUS.md instruction 5.

## Implementation Notes

**Status**: Pending

## On Completion

Fill the notes; update your row and section in TASK-STATUS.md; append one LOG line:
`[[YYYY-MM-DD HH:MM]] [board-app] FIX_07: problems end cleanly; examples match the server → Task: [[cortex-tasks/board/2026-10-17_board-app_app-cards/FIX_07_last-words.md]]`
