# FIX_04_two-words: Two wording slips FIX_03 saw

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

---

## Objective

Fix the two slips in FIX_03's notes ("Seen, not fixed"), so every word on an app card says what happened
in plain words (the maintainer's standing instruction; ruling 10).

## Inputs

- **Finding 27, the wrong toast**: Check again on an invalid app whose folder has since gone toasts
  "<name> updated" while the card says "not found". `apps/board/src/board/app-words.ts` `retryDone` must
  pick its words from the new state: gone → "<name> not found." (or the existing missing words), changed →
  "<name> updated", same → the existing "still …" words. Unit test in `apps/board/tests/app-words.test.ts`.
  Page code: a few bytes; the page has 131 B gzip left; never raise the budget.
- **Finding 28, a parser's words on the card**: a half-written app.json lists "app.json: app.json is not
  valid JSON: Expected ',' or '}' after property value in JSON at position 38". The file is named twice
  (`problemLine` adds it, `apps/board/server/apps/manifest.ts` `manifestOf` says it again) and the rest is
  the parser's message. Word it on the server: "app.json: not valid JSON (check commas and brackets near
  line N)" or shorter; keep a line number if it is cheap and true, drop the parser's sentence. Same for any
  other file this path reads as JSON. Test in `apps/board/tests/app-folder.test.ts`. No page code.
- Docs that quote these words follow (apps.md, the skill's scenarios if they quote it).
- **Skills**: `design:ux-copy` on both new wordings.

## Steps

1. [ ] Tests first, each seen failing.
2. [ ] The two fixes.
3. [ ] Gates one after another: `npm run check`, `npm test`, `npm run verify` (0 warnings, page weight
   held), `node scripts/gen-api.mjs --check`, `npm run build`, `npm run test:pages` — all exit 0.

## Validation

- [ ] Both slips no longer reproduce (name the tests); all gates exit 0.

## Constraints

- No git commits. Never port 4466 or this repo's `.visionboard/`. Deviation: TASK-STATUS.md instruction 5.

## Implementation Notes

**Status**: Pending

## On Completion

Fill the notes; update your row and section in TASK-STATUS.md; append one LOG line:
`[[YYYY-MM-DD HH:MM]] [board-app] FIX_04: two wording slips on app cards → Task: [[cortex-tasks/board/2026-10-17_board-app_app-cards/FIX_04_two-words.md]]`
