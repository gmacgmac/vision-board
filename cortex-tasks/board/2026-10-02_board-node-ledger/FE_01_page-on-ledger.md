# FE_01_page-on-ledger: The page reads and writes through the ledger

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md) (step 2)

## Objective

The board page loads boards and sends actions over the BE_03 routes, then the old view and
transcript code is deleted, so one path is left.

## Context

The page draws a `View` and a `BoardState` (`apps/board/src/board/controller.ts`, `render.ts`).
BE_01's projection keeps both shapes, so layout and rendering do not change. Board v3 (`<vb-node>`)
redraws the cards later; this task only swaps the data path.

## Inputs

- **Modify**: `apps/board/src/board/io.ts`, `controller.ts`, `apps/board/src/shell/*.svelte` (wording),
  `packages/actions/src/index.ts`, `packages/format/src/index.ts`, `packages/format/src/view.ts`
  (header comment), `packages/format/README.md`, `apps/board/README.md`
- **Delete**: `packages/actions/src/reduce.ts`, `record.ts`; `packages/format/src/transcript.ts`
  (move `ACTION_IDS` and `ActionId` into `ledger.ts`)
- **Reuse**: BE_03 routes; `boardState`, `replyText`, `ACTIONS` (actions)

## Steps

1. [ ] `io.ts`: `listBoards`, `loadBoard`, `sendAct`, `watchBoard` on `/api/boards`.
2. [ ] `controller.ts`: an action sends `{ action, n: Number(id), ver }` (plus text, x, y, region,
   mode). `ver` comes from the load response. The server is the only validator; its problems
   show in the existing error toast.
3. [ ] Wording: "session" becomes "board" on screen. Empty state: "No boards yet. Run
   `npm run demo` to open the example boards."
4. [ ] Delete the old modules once `grep` finds no caller; `npm run map` to regenerate
   `docs/specification/modules.md`.
5. [ ] `view.ts` header: the projection layout reads, folded from the ledger, never a file.
6. [ ] The steering file's "Where things live" row still says "the view file and the
   transcript". It is protected: write the replacement wording in the notes for the maintainer.

## Validation

- [ ] `npm test`, `npm run check`, `npm run verify` exit 0 each
- [ ] `controller.ts` still under 500 lines (it carries a 300-line warning today)

## Constraints

No visual change. No new dependency. No commits. Deviation: stop and ask.

## Implementation Notes

**Status**: Pending
