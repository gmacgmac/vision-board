# FIX_02_edit-wording: "Switch to Editing" everywhere, and the tests that quote it

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

## Objective

With the read-only toggle (PLAN Decision 11) the person sees "Read-only" / "Editing", never an "Edit" button, so
every sentence that says "press Edit" now says to switch to Editing, true with the toggle on and off (the menu's
Edit), and every test that quotes the old words follows. BOT_01 reworded the first set (its Run 1 notes).

## Items

1. Tests quoting the reworded sentences: `apps/board/tests/api-read-only.test.ts` ("…Try again once it stops
   editing."), `apps/board/tests/ledger-move.test.ts` ("(or switch to Editing) to finish the move");
   `tests/pages/{read-only,read-only-writes,read-only-controls}.spec.ts` `REASON`: import `READ_ONLY_PERSON` from
   `#actions` instead of a copy; re-take `read-only-toggle.spec.ts` screenshots (the gallery quotes the reason).
2. `read-only-controls.spec.ts` gallery "…last…" selector skips `[data-feature="updateSignals"]`, as the three
   other specs already do (VERIFY_01-R2).
3. "press Edit" still in: `apps/board/server/words/server-chat.ts`, `apps/board/src/shell/words/{chat,editing}.ts`
   (`readOnlyPressEdit`, `editRefused`), `apps/board/src/gallery/read-only-controls-section.ts`,
   `packages/format/schema/api/common.schema.json` `readOnly` (agent-facing; then `npm run gen`; the tool list
   has 8 characters left under `LIST_CAP`, so no net growth), `docs/specification/{api,plugin}.md`.
4. Rename the key `readOnlyPressEditTo` (`packages/actions/src/words/actions-refusals.ts`, `packages/actions/src/read-only.ts`
   and every reader) to say what it now says.

## Steps

Failing tests first where a sentence changes; one search for "press Edit" / "Press Edit" over the repo at the end
(code, words, schema, docs, gallery; the skill already says "switch it to Editing"): none left but history (LOG,
task notes, decisions).

## Validation

- [ ] `npm test`; the four read-only page specs (+ toggle) light and dark; `gen -- --check`; `check`;
      `test:plugin`; `apps/board/tests/plugin-skill.test.ts`

## Constraints

Deviation from a PLAN decision: stop and report (`DEVIATION`). No PII in examples. No git commits. Long writes in
chunks. Only your files; other needs under `REQUESTS`. Behind the flag each piece already uses; off is
exactly the old behaviour.

## Implementation Notes

_Re-run? Add a `### Run N` block; never overwrite an earlier run._

## On Completion

Notes here (Changes Made, Verification, Caught Beyond the Brief, Deviations); your TASK-STATUS row; one LOG line,
`[board-app] FIX_02: … → Task: [[cortex-tasks/board/2026-11-05_board-ui_insert-markdown-signals/FIX_02_edit-wording.md]]`, ending in a
newline; the return block.
