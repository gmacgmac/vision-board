---
category: board-app
status: completed
completed: 2026-10-12
created: 2026-10-12
tracker: cortex-tasks/tracker.md#N24
---

# The person removes cards and containers

> **From**: maintainer, 2026-10-12 (chat 652, 653: a, b, c ok) · **Model**: Opus 5.5 · **Go**: given;
> starts after the zoom-level task is committed

## Rulings (maintainer; do not reopen)

1. **A person version of retire** (652A): "Remove card" on a card (its menu, and on a selection of
   cards), and "Remove container" in a container's settings, each with a short confirm naming what
   goes ("Remove card 4 'Venue lead time'?", "Remove container 'Notes' and its 3 cards?").
2. **Same rules as an agent's retire** (652B): removed cards and containers leave the board and stay
   in the ledger with their versions and notes; numbers are kept and never reused; the container's
   "N cards retired" marker and board version history show them. One path: the existing retire in
   the action layer (`packages/actions/src/retire.ts`, the ledger `retire` event), not a second one.
3. **The person may remove a card that's still owed an answer** (652C); the confirm warns ("Card 4
   still has an unanswered comment."). Agents keep their refusal.
4. A locked or archived board refuses it (D-042, D-043): the controls pause with the lock's reason.
5. Agents see the removal like an agent's retire (the card is gone from reads; `retired` in
   `show_node`/`show_container`); anything they owed on it is no longer owed.

## Steps

1. [x] Contract first: how a person's retire is recorded (the same `retire` event with `by: person`,
   or a person act; say which and why), OpenAPI if a route changes, `npm run gen`, api.md.
2. [x] Failing tests first: remove a card, a selection, a container; owed card warned and removed;
   numbers never reused; the marker; locked/archived refused; agents' reads; keyboard; axe light and
   dark.
3. [x] Build: the confirm reuses `ConfirmDialog`; flag `personRemove`, on by default; gallery entry;
   screenshots after viewing the diffs.
4. [x] Docs: api.md, components.md.

## Validation

- [x] The five gates exit 0, one after another.

## Constraints

- Project rules (`.kiro/steering/vision-board-proj.md`): contract first, patterns first, one job per
  file about 300 lines (500 hard), tests first, tokens only, every state, accessibility.
- No git commits or stash. Protected files: propose wording. Scratch in the system temp folder (never
  the repo's `temp/`); stop only your own processes and leave none running; never touch
  `.visionboard/` or real home-folder files; don't use the board on 4466.
- Fill Implementation Notes below and append your own LOG line.

## Implementation Notes

**Status**: done 2026-10-12. The five gates exit 0, one after another: `npm test` 1205 + 7 timing,
`npm run check` (svelte-check 0, tsc 0), `npm run verify` (0 warnings), `npm run gen -- --check`
current, `npm run test:pages` 413 passed.

**Contract (step 1): the same `retire` event with `by: person`, not a person act.** Ruling 2 asks
for one path; the `retire` line already carries everything every reader needs (`board`, `cards`,
`region?`), so the fold (`foldRetire`, `keepRetiredRegion`), the ledger's context rules
(`retireContext`: already retired, unknown container, Later), the reads (`show_node`/`show_container`
`retired`), the agents' views and the page's "N cards retired" marker read a person's line exactly
as an agent's, with no second fold to keep in step. An act would have needed its own fold, its own
`retired` wiring and its own marker rules. Ledger v16 (`LEDGER_FORMATS` 2-16, every ledger `$id` at
`/ledger/16/`, OpenAPI 1.21.0): the stored retire schema takes `by: person` from v16
(`$defs/rules`; hand twin `PERSON_TOO.retire = 16`, as the person's `board` line from v9). New person
operation **`retire_cards`**, `POST /api/boards/{board}/retire` (x-agent false, the person cookie),
body `{ cards }` (board numbers, one or more, each once) or `{ region }`, never both
(`api/retire-request.schema.json`); answer 201, the stored line by board number (`eventOut`). A
selection is one line. Why a new operation and not `act`: the act route records act events only
(its body is the act schema); the person's `board` line set the precedent (`put_board`). Registry:
`RETIRE_ACTIONS` (`remove-cards`, `remove-container`, `needsConfirmation`). `npm run gen`; api.md
141-142 and the operations table.

**Built.**
- Action layer (`packages/actions`): `retire.ts` `owedNotice` (the person's warning, ruling 3: "Card
  4 still has an unanswered comment.", "... still waits for the more context you asked for.", "... is
  saved for later and its handover isn't written yet.", more than three in one sentence "Cards 4, 7,
  9 and 2 more are still owed an answer.", then "Container 'Notes' still has an unanswered comment.");
  the agent's words and refusal unchanged (`owedKind` shared). `unsent.ts` `dropRetired`, called by
  `foldRetire`: an answer on cards that all left the board (or a note on a container that left)
  waits for no Send, for an agent's retire too (ruling 5: nothing on it is owed; the Send message
  reads the board as it is, so Send was lit for nothing). Owed conditions, `pending`, `list_open`
  already skip retired cards. The person's line is no agent drawing (like their `board` line): it
  moves the board's head, makes no version, no `board.drawn`/`board.changed`; history shows the cards
  in the versions before it.
- Server: `writes.ts` `retire_cards` (`personBoard`, `cardsIn`, `retireCards` for a container, then
  `ledger.append` by the person, which asks the one write check: locked 423 `LOCKED_PERSON`,
  archived `invalid` "restore it from the board picker first"); `edge.ts` `cardsIn` also turns
  `cards` (pointer `/cards/i`).
- Page: `remove-words.ts` (pure words), `remove-flow.ts` (askConfirm via the shell's
  `ConfirmDialog`, then `sender.retire`, toast, focus back to the stage), `sender.ts` `retire`
  (Outgoing `retire`, so a past version and a lock refuse it), `io.ts` `retireCards`,
  `card-numbers.ts` `answerEvent` translates `cards`. Selection bar command `remove` ("Remove card",
  "Remove cards" with several; Delete, Backspace; `selectionButtons` in commands.ts, shared with the
  gallery); key bubble row (Selection). Container settings: "Remove container" row
  (`RegionFrameOptions.remove`, `data-remove-region`, never on Later), paused on a locked board
  (`vb-region` PAUSED list); `removeRegion` handler in `ACTING`, so the past view and the lock guard
  it. Flag `personRemove` (on). `controller.ts` stays at 300 lines (`exposeWork` folded to one line).
- `packages/ui` `region-row.ts`: the settings menu's Up/Down now move between rows (Home/End to the
  ends); before, every arrow went to the first row, so a third row had no keyboard path. A menu row
  that is `data-paused` lets its click through so the page says why.
- Gallery: `gallery/remove-section.ts` (the menu open, the same locked, three confirms worked out from
  the fixture ledger, `Fixture.ledger` added); the selection bar samples show "Remove cards" (pill
  stages widened 520 to 660 so the open bar fits); the key bubble's open sample keeps room above it.

**Tests added.** `apps/board/tests/api-person-retire.test.ts` (6: one card, a selection in one line,
numbers never reused, an owed card refused for the agent and removed by the person with nothing owed
or unsent after, a container with a moved-in card and an unanswered note, refusals, locked 423 and
archived, no version), `remove-words.test.ts` (3), `retired.test.ts` (+1: a v16 person line of three
cards counts on each container), `packages/actions/tests/retire.test.ts` (+3: `owedNotice`, the fold,
a pre-v16 person line refused); `schema-cases`/`schema.test` v16 lines (person retire valid; before
v16 broken); `tests/pages/person-remove.spec.ts` (9: the bar, Delete/Backspace with Cancel and an
owed warning, the container menu, keyboard throughout, a past version, a locked board, the flag off,
axe light and dark with the confirm and the menu open, the gallery section's screenshots). Updated:
OpenAPI 1.21.0, the route table, the operations table, `lock.test.ts` no longer pins the latest
format, harness person ops, the bar's button lists in `selection-pill` and `zoom-and-lasso` specs,
the full-page gallery screenshot runs with `-personRemove`.

**Screenshots** (each viewed, actual against expected). New: `person-remove.spec.ts/remove-{light,dark}`.
Changed: `key-bubble.spec.ts/key-bubble-open-{light,dark}` and `key-bubble-gallery-{light,dark}`
(the Remove card row; the gallery sample's open list no longer covers its "Open" heading),
`selection-pill.spec.ts/selection-pill-gallery-{light,dark}` ("Remove cards" in the open bar; wider
stages so the hover sample no longer runs into the area bar). No other screenshot changed.

**Deviations / for the maintainer.**
1. A card has no menu of its own, so "Remove card on a card (its menu)" is the selection bar: a click
   (or Space) selects the card and the bar offers "Remove card"; Delete and Backspace do the same.
2. `every-node.spec.ts`'s mixed-group axe test now collapses the bar to its pill before axe: the
   wider open bar happened to cover the upper container's grip (axe target-size). Bars drawn above
   the board have always covered what is under them; say if you'd rather the label were "Remove".
3. `dropRetired` also applies to an agent's retire (an answer on a card the agent retired no longer
   lights Send).
4. Agents aren't told the person may remove cards (skill unchanged, rule 17): they see it as a retire.
5. No protected file changed. A decision entry could read: "D-044 The person removes cards and
   containers with the same `retire` line as an agent (`by: person`, ledger v16, `retire_cards`); no
   owed check for the person, who is warned; agents keep theirs." (proposed wording).
