# FIX_03_app-card-size: An app card keeps its size when its app breaks or goes

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

---

## Objective

Fix VERIFY_02 finding 25 (TASK-STATUS.md § VERIFY_02 and `VERIFY_02_findings.md`, with screenshots): an
app card with no `w`/`h` of its own changes size when `list_apps` can't give the manifest's size, and
three claims say it never does.

## Context

Ruling 3: the panel size is the card's `app.w`/`h`, else the manifest's `size`, else 360×320. When the
manifest is invalid or the folder is gone, the page falls back to 360×320, so the card grows or shrinks
and the board under it jumps. Page weight is 149.86 of 150 KB gzip (143 bytes left): never raise the
budget.

## Inputs

- **(b), server, no page code**: `list_apps` sends an invalid manifest's `size` when the `size` field
  itself is valid (`apps/board/server/apps/state.ts`, the one state function; the response schema already
  allows `size`, or check it does). API test that an invalid manifest with a good `size` reports it.
- **(c), page, only if it fits the budget**: `apps/board/src/board/app-state.ts` keeps the last size
  `list_apps` gave for an app while that app is `missing` (the one cache; no second copy). Page test: a card
  with no `w`/`h` keeps its box when its folder goes and when its manifest breaks.
- **(a), docs**: what still moves is a card with no `w`/`h` while the page waits for its first `list_apps`
  answer, and (if (c) does not fit) a missing app. Narrow the three claims to say so in plain words:
  `docs/specification/components.md` § App card, the headers of `packages/ui/src/node/node-app.ts` and
  `node-app.css`. Add one line to the skill only if it is wrong (it already tells agents to give `w`, `h`).
- **Optional, a few bytes of CSS only**: the quiet row's words shift about 22 px sideways on Allow
  (VERIFY_02 notes); align them with the ask box's text if that costs only CSS bytes within the budget.
- **Skills**: `cortex-docs` · `design:design-critique` on the changed states light and dark.

## Steps

1. [x] Tests first, each seen failing (API for (b), page for (c)).
2. [x] The fixes, then the claims. View every screenshot diff light and dark before updating it.
3. [x] Gates one after another: `npm run check`, `npm test`, `npm run verify` (0 warnings, page weight
   held), `node scripts/gen-api.mjs --check`, `npm run build`, `npm run test:pages` — all exit 0.

## Validation

- [x] Finding 25 no longer reproduces for an invalid manifest (and a missing app if (c) landed); every
  claim matches the code; all gates exit 0.

## Constraints

- No git commits. Never port 4466 or this repo's `.visionboard/`. Deviation: TASK-STATUS.md instruction 5.

## Implementation Notes

**Status**: Completed (2026-10-18). (b), (c) and (a) landed; the optional CSS polish was tried and not kept.

**What changed.**
- **(b), server**: `apps/board/server/apps/manifest.ts`: `AppFolder.size` (the manifest's `size`, else the default) is set
  in `manifestOf` whenever no schema problem sits at the top or under `size` (`SIZE_AT`), so a broken app.json with a
  good `size` (an unknown field, another id, a missing panel) still gives it; `state.ts` `appState` sends `folder.size`
  (the one state function; no page code). The response schema already allowed `size` in any state.
- **(c), page**: `apps/board/src/board/app-state.ts` `readOnce`: each answer is stored as `{ size: <last size>, ...app }`,
  so an answer with no size keeps the last one list_apps gave (the one cache; no second copy). **+12 B gzip**
  (153,457 → 153,469; 149.87 of 150 KB, 131 B left).
- **(a), claims** (plain words): `components.md` § App card 2 ("Only a new size moves it…": a card with no `w`/`h` is the
  default until list_apps first gives the manifest's, then keeps its size while app.json has problems or the folder is
  gone) and § 8 State; the headers of `node-app.ts` and `node-app.css`; also `node-template.ts` `appSlot` and
  `node/pattern.json` `vb-app-ask` ("so the row never moves the card"); `apps.md` § Panel size (list_apps sends the size
  while `size` itself is good) and § Kept true by. The skill is right as it is (SKILL.md § Apps: "`app: { id, w, h }`").

**Proof by name** (each seen failing first):
- (b): `apps/board/tests/api-apps.test.ts` "finding 25: list_apps gives the size of an app.json with other problems while
  its size is good, so a card with no size keeps it" (failed: every size undefined). Cases: unknown field and another id
  → the manifest's size; no `size` → the default; `w` 2000, an extra field in `size`, half-written JSON, `[]` → none.
- (c), and (b) through the page: `tests/pages/app-follow.spec.ts` "a card with no size of its own keeps its box when its
  app.json breaks and when its folder goes, so nothing under it moves (finding 25)" (manifest 320×180, card with no
  `w`/`h`; failed before (b) at the unknown-field step, and with (b) alone at the half-written app.json step: box
  354×324 → 394×464 each time). Steps: unknown field (select), half-written app.json (Check again), fixed, folder gone
  (select), back (Check again): one box throughout.

**What still moves** (the claims say so): a card with no `w`/`h` while the page waits for its first list_apps answer
(the default, then the manifest's size), and one whose app is gone or unreadable since the page opened (the default
until list_apps first gives a size). A new size the agent writes moves it too, as it should.

**Deviation, inside the rulings (decision 7):** (c) keeps the last size for every answer that gives none, not only
`missing`: also an app.json that can't be read or whose `size` is wrong. Same one line, and the task's title ("breaks or
goes"): a half-written app.json while the agent saves it would jump otherwise. (b) sends the default for a broken
app.json with no `size` field (ruling 3's "else the default"; the schema's description stays true).

**Optional CSS polish: not kept.** Padding the quiet row like the ask box (`node-app.css`, −8 B gzip) stops the 12 px
shift on Allow, but design-critique (light and dark, `$TMPDIR/vb-fix03/sheet-row.png`) found it worse: "Allowed to run"
and "Nothing to allow" then sit on an indent of their own, off the left edge the title and the panel share, on every
allowed card, which is seen far more often than the Allow moment; on Allow the words move only as the whole box goes,
so it reads as the box closing. Reverted before the gates; no screenshot changed.

**Design review** (design-critique, light and dark, a scratch board from `tests/pages/app-server.ts` on its own port;
`$TMPDIR/vb-fix03/shots-{before,after}/`, `sheet-notice.png`): a card with no `w`/`h` (manifest 320×180) keeps one box
(394×324 at its matched width) through ready, unknown field, half-written app.json and folder gone; each state's view
fills the kept slot; the problems list scrolls in its box at 180 px. No new words. Gallery states unchanged.

**Seen, not fixed** (outside this task; for VERIFY_03 to weigh):
1. Check again on an invalid app whose folder has since gone toasts "<name> updated" (`app-words.ts` `retryDone`
   says "updated" for any change not from `missing`); the card itself says "not found".
2. A half-written app.json lists "app.json: app.json is not valid JSON: Expected ',' or '}' after property value in
   JSON at position 38": the file named twice (`problemLine` adds it; `manifest.ts` `manifestOf` says it again) and the
   parser's words.

**Gates** (one after another after the last code change, 2026-10-18): `npm run check` 0 (348 files, 0 errors, 0
warnings; tsc 0); `npm test` 0 (1479 pass, 0 fail: 1478 + 1 new; `test:timing` 7 pass); `npm run verify` 0 ("verify: ok
(0 warning(s))"); `node scripts/gen-api.mjs --check` 0 ("generated files are current"); `npm run build` 0; `npm run
test:pages` 0 (533 passed, 11.3 min: 532 + 1 new). Built page 153,469 B gzip (149.87 of 150 KB, 131 B left). Logs:
`$TMPDIR/vb-fix03/logs/`. No process of mine left running; this repo's `.visionboard/` and port 4466 untouched.

**Long File Strategy**: the page test was appended (one chunk under 50 lines) and the scratch script written in two
chunks; every other change an exact-string edit. No connection error.

## On Completion

Fill the notes; update your row and section in TASK-STATUS.md; append one LOG line:
`[[YYYY-MM-DD HH:MM]] [board-app] FIX_03: app card keeps its size when its app breaks or goes → Task: [[cortex-tasks/board/2026-10-17_board-app_app-cards/FIX_03_app-card-size.md]]`
