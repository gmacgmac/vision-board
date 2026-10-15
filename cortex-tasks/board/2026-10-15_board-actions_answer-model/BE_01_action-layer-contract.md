# BE_01_action-layer-contract: Action layer and contract

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md)
> **Plan**: [PLAN.md](./PLAN.md)

---

## Objective

Make ✓ and ✗ the only answers and give them no meaning, let the agent's answer to a note clear the
card, drop More context from what cards offer, and report each card's current answer instead of
every click.

## Context

PLAN.md rulings 1, 2, 4 (count test), 5, 6, 7 (the fold), 9 and 12, and D-045. The ledger format does not
change. Read PLAN.md § Current State first: it names the code each ruling touches.

## Inputs

- **Files to modify**: `packages/format/src/node-types.ts` (`ANSWER_ACTIONS`, `NOTE_ACTIONS`, the
  `answer` doc), `packages/actions/src/registry.ts` (`DECIDED`, `CLOSED`, labels the agent reads),
  `notes.ts` (`itemOf`), `action-words.ts` (`MEANINGS` and `meaningOf` go), `board-state.ts` (`counts`), `pending.ts`
  (`asReported`, `responsesAfter`, `replyScope`), `unsent.ts` (`foldUnsent`), `reply.ts`,
  `board-message.ts`, `packages/mcp/src/info.ts`, `packages/format/schema/openapi.json`,
  `docs/specification/api.md`.
- **Patterns to follow**: note edits folded into their note (`asReported`); `isDecided`; the
  "locked" derived state shared by server and page (`note-lock.ts`, popovers-larger-thread ruling 5).

## Steps

1. [x] **Tests first** (unit, `packages/actions/tests/`): a note on a decision leaves it open and owed;
   ✓ and ✗ answer it; `counts` leaves a finding out and reports `answered`; `check_responses` reads
   `check` / `cross` and has no `means`; card 20's sequence (✓, a note, the agent's `reply` to it)
   leaves the card open and unmarked, and the same with an `append`; ✓ then clear after the cursor reports nothing for that card; ✓ then
   ✗ reports only ✗; a clear of a ✓ the agent already read reports the clear; ✓ then clear before a
   Send leaves nothing unsent; an old `context` line still folds, reads as a note and is owed; the
   ✓ made after the agent's answer counts as usual.
2. [x] Rulings 5 and 6: `node-types.ts` lists, `DECIDED` = `CLOSED`; update every doc comment that says
   a comment decides.
3. [x] Ruling 1: remove `MEANINGS`; `check` / `cross` at the API edge (one map, like `fromLine` /
   `toLine`); the numbered reply and Send message write ✓ and ✗.
4. [x] Ruling 7: in the fold, the agent's answer to a card's latest note voids the person's ✓, ✗ and
   Later made before that note; the card also carries a derived "answered by the agent, not yet
   seen" state that `boardState` passes to the page. Name it and record it in TASK-STATUS.md Shared
   Foundations.
5. [x] Ruling 9: fold answers per card after the cursor in `asReported` / `responsesAfter`, comparing
   with the card's status at the cursor; the same in `foldUnsent` and `replyScope`. Keep
   `inCardOrder` as it is.
6. [x] Ruling 12: OpenAPI version bump (`check_responses`: `check` / `cross`, no `means`, folded
   answers; `get_board` counts word); `api.md` section "The answer model (D-045)"; `info.ts` instructions without
   "more context"; `npm run gen`, `npm run map`.
7. [x] Append D-045 to `docs/decisions.md` exactly as PLAN.md gives it (approved, 53).

## Validation

- [x] The five gates exit 0, one after another (npm test and test:pages: FE_01's failures named in the notes): `npm run check`, `npm test`, `npm run verify`,
  `npm run gen` (no diff after), `npm run test:pages` (FE_01's failures expected and named in notes).

## Constraints

- Project rules (`.kiro/steering/vision-board-proj.md`): contract first (rule 6), one action layer
  (rule 8), files about 300 lines (500 hard), tests first.
- If deviation is needed, stop and say so. No git commits. No PII in examples.
- Fill Implementation Notes below and append your own LOG line.

## Implementation Notes

**Status**: Completed (2026-10-15)

**Derived state name (ruling 7): `unseenAnswer`.** `ItemState.unseenAnswer?: true` on each item
`boardState` gives (and `get_board`'s `itemState`); `unseenAnswer(s, id)` in
`packages/actions/src/clears.ts`. It holds from the agent's answering line until the person's next
card `seen` line or act naming the card (`LedgerState.looked`). It also makes `item.unseen` hold, so
`pageConditions().unseen` and `seenOnSelect` already include the card: selecting it sends a `seen`
that ends it. The page's "N updates" tab still counts versions (`ver > max(seen, 1)`), so after a
`reply` alone that count is 0: FE_01 decides how the marker reads then.

**What changed (action layer and contract).**
- `node-types.ts`: `ANSWER_ACTIONS` = ack, drop, comment, later; `NOTE_ACTIONS` = comment, later.
- `registry.ts`: `CLOSED` = acknowledged, dropped; `DECIDED` is the same set (`DECIDED = CLOSED`).
  Labels: ack "Check" (reply word ✓), drop "Cross" (reply word ✗). `context` keeps its entry (old
  lines, server still accepts) but has no key, no status, reply word `comment`; `ITEM_ACTIONS` drops
  it, so `validateAct` no longer refuses it on any kind. New: `ACTION_OUT` / `actionOut` (ack→check,
  drop→cross, the API edge), `ReportedAction`, `MARK_ACTIONS` (ack, drop, later, reopen).
  `ItemStatus` still lists `context` (never produced now) so page code compiles; FE_01 may drop it.
- `action-words.ts` and its test (`meanings.test.ts`) deleted: `MEANINGS`, `meaningOf`,
  `actionWord`, `otherWords`, `Meaning` are gone from the front door.
- `notes.ts`: `itemOf(log, cut)` (a note, `comment` or old `context`, marks an open card
  `commented`, never answers; nothing at or before `cut` counts); `markOf`, `closedAfter`.
- `clears.ts` (new): `foldClears` (fold, on `reply` with `to` and on `node`), `cutOf`,
  `unseenAnswer`. Fold state: `LedgerState.clears`, `LedgerState.looked`.
- `conditions.ts`: `owedOn` owes a card's latest note unless a ✓ or ✗ came after it (✓ then a note:
  the note is owed); `item.unseen` adds `unseenAnswer`.
- `pending.ts`: `latestMarks` folds each card's ✓/✗/Later/clear after the cursor (compared with the
  card's mark at the cursor, both with the agent's latest clear applied); `responsesAfter`,
  `replyScope` use it. `unsent.ts` `foldUnsent` folds the same way against the last Send.
- `response-order.ts`: `ReportedAct.action` is `ReportedAction`; no `means`.
- `board-state.ts`: `counts` returns `{ total, answered, later, open }`; items carry `unseenAnswer`.
- `reply.ts`: ✓ / ✗ / "saved for later"; "Still open" = every card that asks without ✓, ✗ or Later,
  notes or not.
- Contract: `openapi.json` 1.23.0 (minor, following the precedent of 1.13.0 and 1.16.0, which also
  took things away; api.md states no explicit semver rule). `check-responses-response.schema.json`
  `reported` = anyOf `mark` (check/cross) and `act` (every other action); api `common.schema.json`:
  `itemState.unseenAnswer`, descriptions. `info.ts` instructions. `npm run gen`, `npm run map`.
  api.md 144-146 "The answer model"; D-045 appended verbatim; `packages/actions/README.md` and the
  root `README.md` wording.

**Page changes made only to keep things compiling or rendering (FE_01, please own them):**
`packages/ui/src/node/node-template.ts` (tooltip = `ACTIONS[a].label`, was `actionWord`),
`apps/board/src/board/key-help.ts` (row label = registry label, `withWords`/`otherWords` gone),
`apps/board/src/board/toolbar-counts.ts` (`decided: c.answered`, the shell field and "decided" word
unchanged), `apps/board/src/gallery/node-section.ts` (`matrix` skips a status with no fixture card:
without it the whole gallery threw on the `context` row), `packages/ui/tests/node-template.test.ts`
(the `actionWord` test replaced by a Check/Cross tooltip test).

**Gates.** `npm run check` 0. `npm run verify` 0 (fold.ts trimmed to 300). `npm run gen` no diff
(`--check`). `npm test`: 1219 pass, 15 fail, all FE_01's page modules: `packages/ui/tests`
node-core (offers lists, nodeState status/pressed for `context` x5), node-flag (button order),
node-proposal x3 ("Cross 47", "Accept: check 47" from the registry labels), region-core ("N of M
decided" count); `apps/board/tests` every-node-page (Hide decided: an answered note now leaves the
question open), gallery-fixture (statuses matrix: no `context`), key-help ("Acknowledge (Yes, Done)"),
proposals x2 (labels). `npm run test:pages`: 347 pass, 63 fail, 15 did not run, no page errors; the
failures are FE_01's: gallery and section screenshots (the node matrix lost its `context` row and
cards have four buttons), Yes/No/Done and Acknowledge/Drop names, the M key and More context, "N
decided" in `#counts`, proposal labels, Hide decided after a reply, the chat's "1 (question): yes",
and move-and-later's Later click landing under the toolbar on the shorter card.

**For the maintainer (protected files, not edited):** `.kiro/steering/vision-board-proj.md` lines
10 and 134-135 still list "acknowledge, drop, comment, ask for more context"; `docs/principles.md`
132 says "Decisions (acknowledge, drop, approve)". Proposed: "✓ or ✗, a note, save for later".
`docs/specification/components.md` 435-436 (node states, `action-words.ts`) is FE_01's step 4.
**Left as is (scope):** `get_board`, `list_open` and `show_node` still report `status`
`acknowledged` / `dropped`, and the agent's `propose` still sends `ack` / `drop`; only
`check_responses` maps at the edge, as the task names.

**Follow-up: fold time** (coordinator, after FE_01). With BE_01's changes, `npm run test:timing`
went over budget: server start on the 100,000-event ledger took 1.7-1.9 s against 1,000 ms. A
scratch timing script and a CPU profile of `foldLedger` on that ledger put about 4.5 s of self time
(three runs) in `unsent.ts` `foldUnsent`. The cause was `foldMark`: on every ✓, ✗, Later or clear it
scanned every unsent line since the last Send, with a binary search for each, to find the card's
earlier mark. The fix keeps each card's unsent mark line in `LedgerState.unsentMarks` (board ->
card id -> seq, emptied by a Send), so a newer mark replaces it without a scan. Behaviour is
unchanged and every answer-model test passes. `foldLedger` went from about 1,520-1,810 ms to
138-172 ms (HEAD: 143 ms by FE_01's measure), and server start to 561 ms. `fold.ts` stays under
300 lines (the `look` helper became a one-liner). In the same pass, `retire.ts` reads an old
`context` note as a note: `owedKind` gives `comment` for any owed note, so the person's warning says
"still has an unanswered comment" and the agent's refusal says "has a comment you haven't
answered". The "still waits for the more context you asked for" and "asks for more context" texts
are gone, and a container's note always uses the comment wording. Tests updated: `retire.test.ts`
and `apps/board/tests/remove-words.test.ts`. Gates after the follow-up: `check` 0; `npm test` 1243/1243 and `test:timing` 7/7; `verify` 0
warnings; `gen` no diff; `test:pages` 430 pass, 2 fail. The 2 failures are
`person-remove.spec.ts:249` (gallery Remove section, light and dark): the only pixels that differ
are card 35's warning (its gallery note was edited to the old `context` kind), which now says "still
has an unanswered comment". That is the requested wording, but its baseline in
`tests/pages/__screenshots__/person-remove.spec.ts/` needs re-baselining by FE_01 or the coordinator
(not touched here, as asked): `npx playwright test --config tests/pages/playwright.config.ts
tests/pages/person-remove.spec.ts --update-snapshots`.

## On Completion

1. Fill Implementation Notes; set Status to `Completed`; update your row in TASK-STATUS.md.
2. Append your LOG line to `cortex/LOG.md` (one line, newline-terminated, append-only):
   `[[YYYY-MM-DD HH:MM]] [board-actions] BE_01: <what you did> → Task: [[cortex-tasks/board/2026-10-15_board-actions_answer-model/BE_01_action-layer-contract.md]]`
