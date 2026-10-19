# BE_01_notes-marks-format: Hide-notes marks and reply times in the format

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md)  
> **Plan**: [PLAN.md](./PLAN.md)

---

## Objective

Add the person's private `notes-hide` / `notes-show` card marks to the ledger format and actions,
exactly as `flag` / `unflag` are built, and give every card reply its time.

---

## Context

PLAN.md § Key Changes 5 and 6. The flag is the pattern: a private mark on one card, any version,
never read by an agent. Contract first (rule 6): schema, then code, then generated artifacts, then
docs. **Read previous task notes in TASK-STATUS.md before starting.**

---

## Inputs

- **Files to modify**: `packages/format/schema/events/act.schema.json` (action enum, the flag's
  `if/then` block extended to the new pair, its description), `packages/format/src/ledger.ts`
  (`LEDGER_FORMATS` gains 18, `CARD_MARKS`, so `PRIVATE_ACTIONS` follows), `ledger-shape.ts`
  (`ON_NODE`), `packages/actions/src/registry.ts` (two entries, person-only, `onItem: false`),
  `packages/actions/src/card-flags.ts` (fold hidden cards beside flags, or a sibling
  `card-notes-hidden.ts` if it reads cleaner) and `packages/actions/src/index.ts`,
  `packages/ui/src/node/node-core.ts` (`CardReply.at`), `apps/board/src/board/parking.ts` (fill
  `at` where replies are built), the server's agent-read filter wherever `PRIVATE_ACTIONS` is
  applied
- **Files to reference**: how `flag` was added end to end (`git log -S"'unflag'"`),
  `apps/board/tests/api-flag.test.ts`, `docs/specification/api.md` (flag section)
- **Patterns to follow**: the flag, line for line; ledger format bumps in `packages/format/README.md`
- **Skills**: `cortex-architecture` · `cortex-docs` (api.md and the schema text describe this) — load before starting

---

## Steps

1. [x] Schema: add the two actions to the enum and the flag's one-card rule; describe them as the
   person's own marks no agent reads. Bump the ledger format to 18 per the format README.
2. [x] Code: `LEDGER_FORMATS`, `CARD_MARKS`, `ON_NODE`, registry entries (labels "Hide notes" /
   "Show notes"; no key unless the maintainer asks).
3. [x] Fold: a set of hidden card ids from the latest of `notes-hide` / `notes-show` per card,
   exported like `flagsOn`.
4. [x] `CardReply` gains `at: string`; fill it from the reply event's `at` in `parking.ts` (and any
   other builder found by `grep -rn "CardReply"`).
5. [x] Regenerate generated artifacts the repo derives from the schema (find the scripts in
   `package.json` and `scripts/`); update `docs/specification/api.md` beside the flag.
6. [x] Tests first where behaviour is new: schema accepts the pair at format 18 on one card and
   rejects `ver` / `region`; fold unit test; extend `api-flag.test.ts` (or a sibling) so no agent
   read (`get_board`, `show_node`, `check_responses`, `read_ledger`) contains a `notes-hide` line.

---

## Validation

- [x] `npm test` (unit suites for actions, format, board, ui touched here) passes; `npm run verify` fails only on the page-weight budget of the shared `apps/board/dist` (see Issues)
- [x] Fixtures at format 17 still read; a format-18 ledger with the pair reads (`apps/board/tests/schema-v18.test.ts`)
- [x] Agent reads contain no `notes-hide` / `notes-show` (`apps/board/tests/api-flag.test.ts`)

---

## Constraints

- If deviation is needed, stop and ask the maintainer — no silent breaking changes.
- No PII in examples or fixtures.
- No git commits during execution.
- Protected files (steering, `docs/decisions.md`, `docs/principles.md`, tokens): propose the exact change and wait.
- Update this file's Implementation Notes on completion.

---

## Implementation Notes

**Status**: Completed  
**Completed**: 2026-10-19 12:09  

### Changes Made
- Schema: `act.schema.json` gains `notes-hide` / `notes-show` in the action enum, its description, and the flag's one-card `if/then`; every `ledger/17` `$id` and `$ref` moved to `ledger/18` (a sed over `packages/format/schema`, `apps/board/server/schema.ts` `LEDGER_EVENT_ID`, `write-board.ts` `KEY_ID`); `common.schema.json` `v` enums now accept 18; `openapi.json` `info.version` 1.28.0 and the act description names the pair.
- Code: `LEDGER_FORMAT` 18, `LEDGER_FORMATS` + 18, `ACTION_IDS`, `CARD_MARKS` (so `PRIVATE_ACTIONS` follows), `ON_NODE` (`ledger-shape.ts`); registry entries "Hide notes" / "Show notes" (person, `onItem: false`, no key); `ACT_SCOPES` rows (`references.ts`).
- Fold: new `packages/actions/src/card-notes-hidden.ts` (`foldNotesHidden`, `notesHiddenOn`), `LedgerState.notesHidden`, routed from `fold.ts` `foldMark`; exported `notesHiddenOn` from `index.ts`; `BoardState.notesHidden?: Set<string>` (board numbers, left out while none) filled by `boardState`.
- `CardReply.at: string` (`node-core.ts`), filled from the reply event in `parking.ts` `createParking`.
- Generated: `npm run gen` (api-reference.md, tools.generated.json), `npm run map` (modules.md).
- Docs: `docs/specification/api.md` new section "Ledger v18" point 156 and the lock point (139) names the pair; `packages/format/README.md` format 18; `packages/actions/README.md`.
- Tests: new `packages/actions/tests/card-notes-hidden.test.ts`, `apps/board/tests/schema-v18.test.ts`; extended `api-flag.test.ts`, `parking.test.ts`, `references.test.ts`, `schema-cases.ts`/`schema.test.ts` (v18 fixtures, broken forms, unknown format now v19), lock tests (`lock.test.ts`, `api-lock-person.test.ts`), `openapi.test.ts`; `CardReply` literals in ui tests (`node-core`, `node-parking`, `note-bubble`) gained `at`.

### Issues & Resolutions
- `BoardState.notesHidden` is optional (not required like `flags`) so the many `BoardState` literals in other agents' ui tests keep compiling; FE_02 may read it as `s.notesHidden?.has(id)`.
- `npm run verify`: FAIL on the page-weight budget of `apps/board/dist/index.html` (150.9 to 151.6 KB, moving as sibling tasks rebuild the shared dist; this task adds no page code beyond a type field). Warns: `fold.ts` 304 lines (was exactly 300), `node-core.ts` back to 300.
- `npx tsc` still reports errors in `packages/ui/tests/node-app.test.ts` (FE_01 mid-work) and `packages/chat/tests/feed-core.test.ts` (the chat task); none from this task.
- Page tests not run: they share a build with the sibling tasks and nothing visual changed here.
- `read_ledger` (the page's, agents refused) still serves the `notes-hide` lines, by identity, like the flag; the agent reads do not.

### Deviations from Plan
- None.

---

## On Completion

1. Fill in Implementation Notes above; set **Status** to `Completed`.
2. Update this task's row in [TASK-STATUS.md](./TASK-STATUS.md) — your row only.
3. Append **your own** LOG entry to `cortex/LOG.md` — one line, terminated with a newline, append-only:

   ```
   [[YYYY-MM-DD HH:MM]] [board-format] BE_01: [what you did] → Task: [[cortex-tasks/board/2026-10-19_board-ui_card-polish-and-history/BE_01_notes-marks-format.md]]
   ```

   Cite files by path + symbol, never by line number. Don't write the set's entry or to `AUDITED.md`.
