# FE_01_page-on-ledger: The page reads and writes through the ledger

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md) (step 2)

## Objective

The board page loads boards and sends actions over the BE_03 routes, then the old view and
transcript code is archived, so one live path is left.

## Context

The page draws a `View` and a `BoardState` (`apps/board/src/board/controller.ts`, `render.ts`).
BE_01's projection keeps both shapes, so layout and rendering do not change. Board v3 (`<vb-node>`)
redraws the cards later; this task only swaps the data path.

## Inputs

- **Modify**: `apps/board/src/board/io.ts`, `controller.ts`, `apps/board/src/shell/*.svelte` (wording),
  `packages/actions/src/index.ts`, `packages/format/src/index.ts`, `packages/format/src/view.ts`
  (header comment), `packages/format/README.md`, `apps/board/README.md`
- **Archive (move to `prototypes/archive/view-format-v1/code/`)**: `packages/actions/src/reduce.ts`,
  `record.ts`; `packages/format/src/transcript.ts` (first move `ACTION_IDS` and `ActionId` into
  `ledger.ts`; first move `counts` and `statusOf` out of `reduce.ts` into `fold.ts`, reading
  `boardState`, since the page still uses them); `apps/board/server/sessions.ts` if BE_03 left
  it in place
- **Reuse**: BE_03 routes; `boardState`, `replyText`, `ACTIONS` (actions)

## Steps

1. [x] `io.ts`: `listBoards`, `loadBoard`, `sendAct`, `watchBoard` on `/api/boards`.
2. [x] `controller.ts`: an action sends `{ action, n: Number(id), ver }` (plus text, x, y, region,
   mode). `ver` comes from the load response. The server is the only validator; its problems
   show in the existing error toast.
3. [x] Wording: "session" becomes "board" on screen. Empty state: "No boards yet. Run
   `npm run demo` to open the example boards."
4. [x] `git mv` the old modules into the archive once `grep` finds no caller (the archive is
   outside `npm run verify` and the type check, so nothing runs from it); add them to the
   archive README. Then `npm run map` to regenerate `docs/specification/modules.md`.
5. [x] `view.ts` header: the projection layout reads, folded from the ledger, never a file.
6. [x] The steering file's "Where things live" row still says "the view file and the
   transcript". It is protected: write the replacement wording in the notes for the maintainer.

## Validation

- [x] `npm test`, `npm run check`, `npm run verify` exit 0 each
- [x] `controller.ts` still under 500 lines (it carries a 300-line warning today)

## Constraints

No visual change. No new dependency. No commits. Deviation: stop and ask.

## Implementation Notes

**Status**: Completed 2026-10-03

- **`io.ts`** (86 lines): `listBoards`, `loadBoard`, `sendAct`, `watchBoard` on `/api/boards`.
  `loadBoard` turns the response's plain-object `state` back into the `BoardState` maps; types
  `BoardSummary`, `BoardData` (`seq`, `view`, `state`, `versions`), `ActFields`.
- **`controller.ts`** (340 lines, was 336; the existing 300-line warning stays): a node act sends
  `{ action, n: Number(id), ver: versions[id] }` (plus `text`, `x`, `y`); a mode act sends
  `{ action, region, mode }`. No client-side check: the server is the only validator and a refusal
  shows in the existing error toast (`fail`). After a successful act the page reloads the board
  (the server's fold is the only fold), so no reducer runs in the browser.
- **One behaviour kept on purpose**: `view.version` is now the ledger position (BE_01), so every
  person act advances it. The old "same version -> relayout, new version -> rebuild cards and toast
  'The agent drew vN'" test would fire on every click. `take()` now compares the drawing with the
  version left out: same drawing -> relayout only; changed drawing -> rebuild and the same toast.
- **Wording**: board picker label "Board" (`id="board"`), shell `boards`/`boardId`, Toolbar prop
  `onboard`, reply hint `reply.ts <board>`, empty state "No boards yet. Run npm run demo to open
  the example boards." (backticks dropped: the message is plain text).
- **Moved before archiving**: `ACTION_IDS`, `ActionId` -> `packages/format/src/ledger.ts`
  (`ledger-shape.ts` imports them from there); `statusOf`, `counts` -> `packages/actions/src/fold.ts`
  (unchanged bodies, reading `BoardState` as `boardState` returns it). Front doors updated.
- **Archived** (`git mv`, after `grep` found no caller) to `prototypes/archive/view-format-v1/code/`:
  `transcript.ts`, `reduce.ts`, `record.ts`, `sessions.ts`, kept byte for byte (their import paths
  no longer resolve). Listed in the archive README and `prototypes/README.md`.
  `docs/specification/modules.md` regenerated with `npm run map`.
- **READMEs**: `packages/format/README.md` (ledger first, `View` as projection, public API now
  lists `ACTION_IDS`/`ActionId` under the ledger plus `readLedger`, the drawn fold and `boardView`),
  `apps/board/README.md` (the page calls the routes only through `io.ts`). Outside the listed
  inputs: `packages/actions/README.md` public API (it named the archived `makeRecord`,
  `validateRecord`, `reduceTranscript`), flagged for review.
- **Tests**: no existing test changed; none added. `actions.test.ts` already imports `statusOf`
  and `counts` from the actions front door, which now serves them from `fold.ts`.
- **Gates**: `npm test` exit 0 (71/71), `npm run check` exit 0 (svelte-check 0 errors, 0 warnings;
  tsc clean), `npm run verify` exit 0 after `npm run map` (one existing warning, `controller.ts`).
- **Browser** (`npm run demo`, http://localhost:4466, then stopped; `temp/demo` removed): roadmap
  board renders with the same layout as before step 2 (compared with the checkpoint
  `checkpoint/u3-step2-start` served from a scratch worktree). Ack 1, drop 2, comment 3, mode
  Review -> list and an Alt+arrow pin on 5 all landed in the ledger (seq 37-41) and survived a
  reload; reply panel reads "1 ok 2 drop 3 comment: ..."; empty project shows the new empty
  state; 0 console errors or warnings. Only on-screen difference: the version chip and picker
  show the ledger position (v36, then v41) where they showed v1; item numbers 7-16 are 8-17 since
  BE_04.
- **Not exercised in the page**: an agent redraw arriving over SSE (there is no agent write route
  until U4, and the server does not watch the file); a server refusal in the toast (the dialog
  blocks the one refusal a click can cause; `curl` shows the 422 with problems).
- **Steering, proposed wording for the maintainer** ("Where things live" row, protected file not
  edited): `| The file formats the agent and the board share | packages/format/ (the project
  ledger, .visionboard/ledger.jsonl; the View is the projection folded from it) |`
- **Left for later** (outside inputs): `packages/layout/src/types.ts` comments still say pins and
  modes come "from the transcript"; `packages/format/src/validate.ts` still says "view file".
- Security: none found. No new dependency. The page sends no `by`, `seq` or `at`; the server
  stamps them.
