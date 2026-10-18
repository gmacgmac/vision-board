# FIX_05_file-lines: Name each file once; read app.json saved with a byte-order mark

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

---

## Objective

Fix the two things FIX_04's notes saw ("Seen, not fixed"), under the maintainer's fewest-words instruction
and ruling 10 (the invalid state lists the problems for the agent to fix).

## Inputs

- **Finding 29, the file named twice**: per-file problems read "panel.html: panel.html is over the 1 MB
  limit. Make it smaller." The page's `problemLine` adds "<file>: ", and the server's words name the file
  again. Word them on the server (`apps/board/server/apps/manifest.ts`, FIX_01's `fieldWords` seam and
  FIX_04's JSON line) so the card reads "panel.html: over the 1 MB limit. Make it smaller." Check every
  per-file line the server can send (size, missing file, a path outside the folder, a link out, the
  tools module's load and import problems) and name the file once in each. Agents read `list_apps` too:
  the `file` field still names it. No page code.
- **Finding 30, a byte-order mark**: an app.json that starts with a byte-order mark (some editors add one)
  reads "not valid JSON" though it is fine. Strip one leading mark before parsing in `manifestOf`; the hash
  stays over the file's bytes as they are (ruling 7). No page code.
- Tests: `apps/board/tests/app-folder.test.ts` (and `api-apps.test.ts` where they assert the old words);
  page specs or gallery samples that quote the old words follow (search `tests/pages/`, `apps/board/src/gallery/`).
- Docs or the skill's scenarios that quote these words follow.
- **Skills**: `design:ux-copy` on the changed lines.

## Steps

1. [ ] Tests first, each seen failing.
2. [ ] The two fixes. If a screenshot shows the changed words, view the diff light and dark before updating.
3. [ ] Gates one after another: `npm run check`, `npm test`, `npm run verify` (0 warnings, page weight
   held), `node scripts/gen-api.mjs --check`, `npm run build`, `npm run test:pages` — all exit 0.

## Validation

- [ ] Both no longer reproduce (name the tests); all gates exit 0.

## Constraints

- No git commits. Never port 4466 or this repo's `.visionboard/`. Deviation: TASK-STATUS.md instruction 5.

## Implementation Notes

**Status**: Pending

## On Completion

Fill the notes; update your row and section in TASK-STATUS.md; append one LOG line:
`[[YYYY-MM-DD HH:MM]] [board-app] FIX_05: name each file once; read app.json with a byte-order mark → Task: [[cortex-tasks/board/2026-10-17_board-app_app-cards/FIX_05_file-lines.md]]`
