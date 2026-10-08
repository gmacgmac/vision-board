# BE_01_new-and-rename-board: New board and rename from the page

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md) (rulings 6, 7)
> · **Tracker**: N22 · **Decision**: D-034 · **Model**: Opus 5.5

## Objective

The person can create a new board and rename any board from the picker.

## Rulings (do not reopen)

1. **Contract first**: one person-only operation, `put_board` (`PUT /api/boards/{board}`,
   `x-agent: false`, person cookie), body `{ title, summary? }`: creates the board when the id is
   new, renames it when it exists. Ledger: the `board` line may now be written by the person;
   a person's `board` line for an existing board updates its title and summary (the context
   check allows it for `by: 'person'` only). Format bump to v9 (api.md 11); OpenAPI minor bump;
   regenerate; api.md points appended.
2. **Ownership**: a board the person creates has no agent creator and no holders, so every agent
   must ask for it (D-034); the permissions table's `board` row says so and has its test. Agents
   still can't rename a board they didn't create (today nobody but the person can).
3. **Page**: the picker's last entry "New board…" opens a small dialog (title, optional summary;
   the id is made from the title, unique, lowercase and hyphens); "Rename…" for the open board
   sits next to it (or in the board's menu, if FE_01 made one). Both go through the action layer
   (`packages/actions/src/registry.ts` gains the entries, `needsConfirmation: false`) and the
   one sender. Refused in a past version.
4. The skill notes (`skills/vision-board/NOTES.md`) say that a person-made board needs a board
   grant before an agent writes on it.

## Steps

1. [x] Failing tests first: schema cases; ledger context (person rename allowed, agent refused);
   permissions row; API (create, rename, unknown fields refused, agent can't call it); page
   (New board, then an agent's write on it gets `needs-grant`; Rename updates the picker live).
2. [x] Contract, gen, server, fold, page dialog, skill notes.

## Validation

- [x] The five gates exit 0; `npm run gen -- --check` current.

## Implementation Notes

**Status**: Completed 2026-10-08 (paused overnight by the maintainer, resumed the same day)

**Format and contract (api.md 90-92).** Ledger v9: every `$id` at `/ledger/9/`; `common.schema.json`
`v` and `stampAgent` take 9; the stored `board` schema's `by` is `agent | person`, with `$defs/rules`
(a person line only from v9; hand twin `PERSON_TOO = { board: 9 }` in `ledger.ts`, read by
`ledger-shape.ts`). `ledger-index.ts` `contextProblems` allows a second `board` line for the person
only; `indexEvent` and `board-view.ts` `applyDrawn` keep a renamed board's containers. `fold.ts`:
`drawnHeads` and `runs` count agent lines only, so a rename is no `board.drawn` and no version.
`put_board` (`PUT /api/boards/{board}`, person cookie, `x-agent: false`): body
`api/board-request.schema.json` (the board `core`, closed); 201 created, 200 renamed, the stored
line; `summary` left out clears it. `openapi.json` 1.8.0; `npm run gen` run. Handler `putBoard` in
`server/writes.ts`.

**Ownership (D-034).** A person-made board has no agent creator or holders: the permissions table's
`board` row comment says so; every agent gets `needs-grant` (board only) and its `board` item is
`forbidden` until a board grant. Tested in `permissions.test.ts` and `api-boards.test.ts`.

**Action layer and page.** `BOARD_ACTIONS` (`new-board`, `rename-board`, person,
`needsConfirmation: false`; inputs tested equal to the board `core`). Flag `boardEdit` (on). The
picker ends with an `<hr>` and "New board…" / "Rename board…" (values `:new-board`, `:rename-board`;
off while a past version shows; "No boards yet" on an empty project). `shell/BoardDialog.svelte`
(native `<dialog>`, title required, summary optional, busy and refused states, Esc and Cancel; a stale
`close` event after a quick reopen is ignored, `if (!dlg.open)`). `board/board-edit.ts`: `boardIdFor`
(lowercase, hyphens, accents dropped, unique, within 64) and `createBoardEdit` (New opens the board).
`io.ts` `putBoard`; the one sender gains `board(id, fields)` with the same read-only refusal.
`controller.ts` `saveBoard`, 297 lines (folded `vp.onApply` and `send` to make room). No gallery entry
(the confirm dialog has none).

**Tests.** New: `apps/board/tests/api-boards.test.ts`, `apps/board/tests/board-edit.test.ts`,
`tests/pages/new-board.spec.ts` (on EMPTY_BASE, so the shared server's screenshots are untouched;
axe on both dialogs, dark and light). Extended: schema cases (v9 lines, person board valid and broken),
`ledger-context.test.ts`, `permissions.test.ts`, `conditions.test.ts`, `fold-v3.test.ts`; v8 → v9
literals in the API tests; openapi 1.8.0; route table. Skill note added (`skills/vision-board/NOTES.md`
§ Access). `modules.md` regenerated (`npm run map`).

**Looked at:** New board and Rename board dialogs, light and dark, plus the invalid title state:
readable, focus ring on the title, primary button clear.

**Gates (all exit 0):** `npm run check`; `npm test` (657 + 6 pass); `npm run verify`;
`npm run gen -- --check`; `npm run test:pages` (178 passed, no screenshot diffs, no baseline updated).

## On Completion

Fill in notes, update your row, append your own LOG line (`[board-format] BE_01: …`).
