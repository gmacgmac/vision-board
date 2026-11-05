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

### Run 1 (2026-11-05, Opus 5.5, worktree `.claude/worktrees/fix-02`, branch `feat/fix-02`)

**Changes Made**
- Tests first: `apps/board/tests/api-read-only.test.ts` (the chat refusal `/read-only.*Switch to Editing/`; `editRefused`
  "Try again once it stops editing."), `ledger-move.test.ts` ("(or switch to Editing)"); `tests/pages/{read-only,
  read-only-writes,read-only-controls}.spec.ts` import `READ_ONLY_PERSON as REASON` from `#actions` (no copy);
  `read-only.spec.ts` and `read-only-toggle.spec.ts` chip name "Read-only: switch to Editing to change this ledger";
  `read-only-controls.spec.ts` gallery "last" skips `[data-feature="updateSignals"]` (VERIFY_01-R2).
- Words: `apps/board/src/shell/words/editing.ts` `readOnlyPressEdit` "Read-only: switch to Editing to change this
  ledger", `editRefused` "… Try again once it stops editing." (as the server's `editRefused`; the toggle's
  `toggleRefused` keeps "Press again"), the toggle comment no longer leans on "press Edit"; `shell/words/chat.ts`
  `readOnlySwitchToEditing` "This ledger is read-only. Switch to Editing to start a chat here." (key renamed, reader
  `shell/chat-rules.ts` `READ_ONLY`); `server/words/server-chat.ts` `noChatWhileReadOnly` "… Switch to Editing first.".
- Item 4: `packages/actions/src/words/actions-refusals.ts` `readOnlyPressEditTo` → `readOnlySwitchToEditing`; its one
  reader `packages/actions/src/read-only.ts` `READ_ONLY_PERSON` (every other reader imports `READ_ONLY_PERSON`); the
  file's comments say "switches to Editing".
- Gallery: `read-only-controls-section.ts` quotes `${READ_ONLY_PERSON}` (cannot drift) and "Switching to Editing gives
  the controls back."
- Agent-facing: `common.schema.json` `readOnly` "until the person makes it editable" (was "presses Edit"): the same
  meaning, host-neutral like `READ_ONLY`; `npm run gen` changed only `api-reference.md` (the description is not in the
  tool list, so `LIST_CAP` is untouched).
- Docs: `api.md` (problem table `read-only`, Edit's refusal quote, `READ_ONLY_PERSON` quote), `plugin.md` open point 12
  (the person's reason names Editing; the bot's is already host-neutral); `updated:` lines.
- Screenshots re-taken: `read-only-toggle-{light,dark}` and `read-only-{light,dark}` (the gallery's reason and the
  "Edit refused" toast only; diffs looked at).

**Verification** (tier: normal)
- `read-only`, `read-only-writes`, `read-only-controls`, `read-only-toggle` together: 36 passed (light and dark
  screenshots, axe, APCA in the specs). One run had `read-only-controls` fail on an aborted `app-panels/calculator`
  request (unrelated to words); alone 3 of 3 green, together again green.
- `gallery.spec.ts` 16 passed (no section screenshot changed). `test:plugin` 83 passed. `plugin-skill.test.ts` 8 pass.
- `npm test` 2398 of 2400: `live-read-only.test.ts` (not owned, quotes the chat words: REQUEST) and
  `api-ledgers.test.ts` "the folder open now…" which needs a build (`set-cookie` null without `dist/`; green after
  `npm run build`, also red on the base without my change). `gen -- --check` current; `check` 0 errors; `verify` ok.

**Caught Beyond the Brief**
- `apps/board/tests/live-read-only.test.ts` asserts `/read-only\. Press Edit/` on the chat words: fails now (REQUEST).
- "presses Edit" left in comments/descriptions not owned: `packages/actions/src/board-state.ts` (`readOnly` doc comment),
  `apps/board/src/board/status.ts`, `apps/board/src/board/boards/lock-flow.ts` (quotes the old reason),
  `packages/format/schema/api/problem.schema.json` `$comment`, gallery `editing-section.ts` description (FIX_01; it is in
  the `read-only`/`read-only-toggle` screenshots, so changing it re-takes those), `components.md` (FIX_01 item 6;
  974 quotes `stateTip`'s old words).
- Key `readOnlyPressEdit` (`shell/words/editing.ts`) now holds "switch to Editing"; renaming it reaches
  `shell/editing.ts` (not owned): REQUEST.
- With the flag off, "switch to Editing" still reads true: the chip says Read-only then Editing after the menu's Edit.

**Deviations**: none.

### Run 2 (2026-11-05, Opus 5.5, same worktree; the orchestrator's grants FIX_02-R1..R3)
- R1 `live-read-only.test.ts` `/read-only\. Switch to Editing/`; R2 `readOnlyPressEdit` → `readOnlySwitchToEditing`
  (`shell/words/editing.ts`, reader `shell/editing.ts` `stateTip`); R3 comments "switch(es) to Editing" in
  `board-state.ts` `readOnly`, `status.ts` `readOnly`, `lock-flow.ts` (names `READ_ONLY_PERSON`), `problem.schema.json`
  `$comment` "makes it editable" (`gen` changed nothing). After `npm run build`: `npm test` 2400 + 14 pass, `gen -- --check`
  current, `check` 0 errors.

## On Completion

Notes here (Changes Made, Verification, Caught Beyond the Brief, Deviations); your TASK-STATUS row; one LOG line,
`[board-app] FIX_02: … → Task: [[cortex-tasks/board/2026-11-05_board-ui_insert-markdown-signals/FIX_02_edit-wording.md]]`, ending in a
newline; the return block.
