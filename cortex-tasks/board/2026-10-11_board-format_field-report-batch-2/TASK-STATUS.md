---
task_name: Field report batch 2 - retire, card numbers per board, the flag, column and row
created: 2026-10-11
status: in-progress
tracker: cortex-tasks/tracker.md#N24,N35,N36
---

# Field report batch 2 - Task Status

> **Plan**: [PLAN.md](./PLAN.md). Go given (524).

| # | ID | Task | Model | Status | Notes |
|---|-----|------|-------|--------|-------|
| 1 | BE_01 | Contract, ledger v12 | Opus 5.5 | Contract done; gates wait on BE_02 | Contract tests, verify, gen green; check/test red by design (see notes) |
| 2 | BE_02 | Actions and server | Opus 5.5 | Done | check, verify, gen green; npm test 1017/1021, the 4 failing are FE_01's (see notes) |
| 3 | FE_01 | Page | Opus 5.5 | Done | check, test 1041/1041, verify, gen, test:pages 347/347 green (see notes) |
| 4 | T_01 | Skill | Opus 5.5 | Planned | |
| 5 | VERIFY_01 | By hand | Orchestrator | Planned | |

## Implementation Notes

### BE_01

**Status**: contract done 2026-10-11. Stopped at the contract as briefed: the types now say `id`,
so `check` and `npm test` stay red until BE_02 renames the action layer and server (and FE_01 the
mode names in ui). Nothing of BE_02's or FE_01's was done beyond two schema-path literals.

**The design (api.md 125).** A card's identity is its ledger number: the file keeps writing it `n`
on every line, v2 to v12, and code calls it `id`. `fromLine` / `toLine` (`packages/format/src/
ledger-line.ts`) is the only place one becomes the other (also where `list` reads as `column`).
The board number `n` is never stored: it is the card's place in its board's drawing order
(`LedgerIndex.cards`, `LedgerBoard.cards`; `boardNumber(ix, id)`, `cardId(ix, board, n)`), so old
lines get theirs the same way and retired cards keep theirs. `LedgerNode` carries `id` only, so
every reader that took `.n` for the identity is now a compile error, not a silent slip.
Why not write `id` on v12 lines: the file would hold two names for one thing for ever, and the act
rules (shared by the sent form, the stored line and `check_responses`) would need a second copy.

**Built.**
- `ledger.ts`: v12; event types speak `id`; `RetireEvent { board, cards, region? }`; `flag`,
  `unflag`; `PRIVATE_ACTIONS`, `isPrivateAct`; `CARD_EVENTS`; `LIST_RENAMED`. `view.ts`: `MODES`
  grid, flow, lanes, radial, column, row; `RENAMED_MODES`. `ledger-shape.ts` (the file's shape):
  retire, the flag's rules, `list` refused from v12.
- `ledger-index.ts`: `maxId`, `nodes` {board, ver, n}, `cards`, `retired`, `retiredRegions`;
  `contextProblems(ix, e, name?)` (the server passes a namer giving board numbers); refusals on
  retired cards and containers; `retire-rules.ts` (the retire line); the access rules moved to
  `access-rules.ts` (same exports) to stay under 300 lines.
- `board-view.ts`: the View in board numbers (node ids, `n`, links, centre); retired cards and
  containers left out; `nodesOf` = on the board now, `everyNodeOf` = with retired.
- Schemas: every ledger `$id` at `/ledger/12/`; common: v12, `mode` (current), `lineMode` (+ list),
  `notList`, `cards`; region and act: `noList` on the sent form, `rules`/`lineRules` from v12; act:
  `flag`, `unflag` (one card, no `ver`, no `region`); new `events/retire.schema.json` (sent `n` or
  `region`; stored `board`, `cards`, `region?`); `ledger-event`, `write-item` gain it. API:
  `cardNumber` / `cardNumbers` (`api/common.schema.json`) on every card in a body or answer;
  write result `retired`; node detail and `show_container` `retired`. OpenAPI 1.16.0:
  `read_ledger` is the page's (x-agent false, cookie, no VB-Project, no 409: the MCP tool and
  `vb read-ledger` are gone); `get_board`, `show_node`, `write_board` and `nodePath` say board
  numbers, retire and the modes. `npm run gen`, `npm run map` run.
- Tests: `packages/format/tests/board-numbers.test.ts` (9); `schema-cases.ts` at v12 with retire,
  flag and list cases; `schema.test.ts` (list words, retire sent forms); `openapi.test.ts`,
  `route-table.test.ts`, `help-format.test.ts` expectations.
- Docs: `api.md` 125-130, the operations table, front matter; `packages/format/README.md`.
- Outside format, only the schema paths: `apps/board/server/schema.ts` `LEDGER_EVENT_ID`,
  `apps/board/server/write-board.ts` `KEY_ID`.

**Gates.** `verify` ok (0 warnings); `gen --check` current; contract tests (format, schema,
openapi, route table, gen-api, MCP tools, cli help) 133 pass, 0 fail. Red, as expected:
- `check`: tsc 170 errors in 34 files (actions src and tests, server `ledger.ts`, `write-board.ts`,
  `reads.ts`, layout `board.ts`, ui `region-core.ts`, `region-icons.ts`, `board-data.ts`, tests);
  the page's svelte-check 82 in 14. Every one is `n` -> `id` on events, `LedgerNode.n` gone,
  `maxN` -> `maxId`, or `Record<Mode, ...>` naming `list` and lacking `column`/`row`.
- `npm test`: 1023, 703 pass, 320 fail (apps/board 194, actions 88, mcp 19, layout 8, cli 6, ui 5):
  the server stamps with `ix.maxN` and the fold reads `e.n`, so writes fail and folds lose cards.
- `test:pages`: not run (nothing can be written until BE_02).

**Hand-off to BE_02.**
1. Rename mechanically where tsc points: events' `n` -> `id` (seen's union: `'id' in e`),
   `maxN` -> `maxId`, `LedgerNode.n` -> `.id`, proposals `{ id, ver }`; fold maps stay keyed by
   identity. Read a board number only through `boardNumber(s.index, id)`.
2. I/O layer (`server/ledger.ts`): stamp the line as now (`n` = identity, a new card
   `ix.maxId + 1`); schema and `eventProblems` check the line; `fromLine(line)` is what
   `contextProblems`, `indexEvent`, `applyEvent` and `validateAct` get; append the line; serve
   lines (`toLine`) to `read_ledger`.
3. The edge, in: every sent `n`, `from`, `to`, `nodes`, `region.center`, retire `n`, act and
   seen `n`/`nodes`, the `show_node` path: `cardId(ix, board, n)` on the path's board (`{ key }`
   as now); a number the board has not given fails `invalid` at its pointer ("board b has no card
   9"). Out: every card in an answer via `boardNumber` (View, `state`/`versions` keys, open items,
   pending, proposals, notes' `nodes`, links, node detail, write results, `check_responses` acts,
   chat cards, the Send message and `replyText`); words via `contextProblems(ix, e, name)`.
4. `retire` in `write-board.ts`: `n` -> that card; `region` -> every card whose place now
   (`placeOf`) is it (moves count); permissions as a node update (83); refuse while a card is owed
   (`item.owed`'s helper: comment or More context unanswered, Later with no park) with words naming
   the card and what to do; store `{ type: 'retire', board, cards, region?, key }`; answer
   `retired` (board numbers); replay by key.
5. Retired out of every read and count: `nodesOf` already drops them (check every other
   `s.nodes` walk); proposals on them end `closed`; `show_node` and `show_container` add `retired`;
   `DRAWING_EVENTS` gains `retire`; `eventBoard` reads its `board`.
6. Flag: `act.ts` allows `flag`/`unflag` on any card of any kind (they are not review actions in
   `NODE_TYPES`), person only; fold the flags for the page; leave `PRIVATE_ACTIONS` out of
   `acts`/`responsesAfter`/`check_responses` and its wait, `replyText`/`replyScope`/Send message,
   `isAnswer` (`board.unsent`), `seeCards` (94), every head (`heads`, `drawnHeads`, `agentHeads`,
   so `list_boards`' `seq`), `get_board`, `show_node`, `show_container`, `list_open`, `pending`.
7. `read_ledger` needs the person's cookie now: the API harness and the tests that call it.
8. `packages/layout/src/board.ts`: `column` (the old `list`) and the new `row`; ui
   `region-core.ts`/`region-icons.ts` need entries to compile (FE_01 owns the names shown).
9. Test the edge on two boards: on one board identity equals board number, so a slip passes.

**For FE_01.** The page reads lines from `read_ledger`: `fromLine` each (`io.ts`, `live.ts`,
`versions.ts`), so its fold is by identity and `boardView` is in board numbers; translate with
`cardId(state.index, board, n)` / `boardNumber`. Act bodies send board numbers. The "N cards
retired" marker: `retire` lines without `region`, by the container each card was in at `seq - 1`,
opening that board version. Mode names `column`, `row`; the gallery ledger at v12.

**Asked of the maintainer** (my readings, each easy to turn):
1. Retiring a whole container takes the container off the board too (its id never used again on
   that board); the "N cards retired" marker is for cards retired one at a time from a container
   that stays.
2. `read_ledger` becomes the page's only (the MCP tool and the `vb` command go): its lines carry
   identities and flags, which no agent may read.
3. A flag is not "seeing" the card (94) and moves no board head, so nothing an agent reads changes.
4. A new write naming `list` is refused with words, not quietly stored as `column`.

**Proposed D-041 (protected file, not edited):**

> ## D-041 Each board numbers its cards; the ledger number stays the identity
> - **Date**: 2026-10-11 · **Status**: Proposed · **From**: maintainer (chat 511, 516, 519, 520, 524; tracker N35)
> - **Decision**: Each board numbers its cards from 1 in the order drawn (`n`), and every request,
>   answer, MCP tool, `vb` command and the page name a card by its number on the operation's board.
>   The project-wide ledger number, given once and never reused, stays the card's identity: `id` in
>   code, `n` in the file (unchanged on every line), never shown and never in an agent's answer.
>   Board numbers are worked out on read (ledger v12), so existing boards are renumbered; the
>   server translates at its edge. A retired card keeps its number; no number is given twice on a
>   board. Supersedes the numbering part of D-017 (numbers per project).
> - **Why**: A board's first card should be 1 (field report, N35). D-017 rejected per-board numbers
>   because renumbering would repoint references; here nothing that points at a card changes: every
>   line, index and reference keeps the identity, a card never changes board, so (board, number)
>   and identity map one to one for ever. Only numbers people wrote inside old notes can disagree
>   (accepted).
> - **Alternative rejected**: (board, number) as the identity everywhere (rewrites every index and
>   rule for no gain); project numbers taught to the agent (the field report's complaint stands);
>   writing `id` on new lines (the file would hold two names for one thing for ever).
> - **Task**: [[cortex-tasks/board/2026-10-11_board-format_field-report-batch-2/PLAN.md]]
### BE_02

**Status**: done 2026-10-11. The action layer and the server speak ledger v12; the page compiles
but its behaviour (reading lines, board numbers in its own reads, the marker, the flag UI, mode
names) is FE_01's, with the hand-off below.

**Built.**
- **Rename** where tsc pointed: events `n` -> `id`, `maxN` -> `maxId`, `LedgerNode.id`, and the
  action layer's own identities too (`Proposal.id`, `Ask.id`, `Condition.id`); every fold map is
  keyed by identity. `WriteItem` stays line-shaped (identity in `n`, as the file holds it).
- **Out (board numbers)**: `packages/actions/src/numbers.ts` (`numberOf`, `cardName`, `eventOut`,
  `noteOut`, `proposalOut`, `linkOut`). The action layer's read views are the API's answer shapes,
  so they give numbers themselves: `nodeDetail`, `linkedDetails`, `containerDetail` (region centre
  too), `openItems`, `pendingItems`, `responsesPage` (`check_responses`' acts through `eventOut`),
  `replyScope` (so `replyText` and the Send message), `boardState` (now `board-state.ts`, keyed like
  the View; notes' `nodes` by number). Words name numbers: `validateAct`, `proposeProblem`,
  `retireProblem`, and `contextProblems` gets `cardName` from the server. Server: `get_board`'s
  `versions`, the `act` and `mark_seen` answers (`eventOut`), write results (`n`, `retired`), the
  chat prompt and its chips.
- **In**: `apps/board/server/edge.ts` (`cardOn`, `cardsIn`, `noCard`) is the one place a number
  becomes an identity, on the path's board: `act` and `mark_seen` (`n`, each of `nodes`),
  `show_node`'s path (404 as before), `send_chat`'s `cards` (chat-prompt.ts), and write items
  through `write-refs.ts` (`n`, or a link's `from`/`to`, `region.center`, retire `n`; `{ key }` as
  before). A number the board has not given: `invalid` at its pointer, "board b has no card 9".
- **I/O** (`server/ledger.ts`): `append` takes a line (identity in `n`), stamps `ix.maxId + 1`,
  checks the line (schema, `eventProblems`), then `fromLine` for `validateAct`, `contextProblems`,
  `indexEvent`, `applyEvent`; `events()` are code events; `read_ledger` serves `toLine`.
- **retire** (`write-board.ts`): `eventOf` -> `retireLine` (`cards` filled by `retireCards`: the card,
  or every card whose place now is the container), the new `PERMISSIONS.retire` row (the container
  named, else each card's container now, then the board), `checkOwed` (`retireProblem`, on
  conditions.ts' `owedOn`, now exported), then the ledger's context; `/cards` pointers point at the
  item's `n` or `region`; replay by key (a container retire's `cards` are not compared: they depend
  on when it ran); the answer's `retired` in numbers.
- **Retired out**: `retire.ts` folds a retire (open proposals end `closed`; a retired container is
  kept for `show_container`); `DRAWING_EVENTS` and the references table (`retire` scope) know it;
  `boardState` (modes, container notes and places) and `container.owed` skip retired containers;
  `nodeDetail` carries `retired`; `containerDetail` answers a retired container with `retired` and
  lists the cards that left with it (the person's move into it no longer shows once it is gone).
- **The flag**: registry `flag` and `unflag` (`onItem: false`, so never an answer; no `key`: F is
  Fit today); `card-flags.ts` (`LedgerState.flags`, `flagsOn`); `applyEvent` returns early for
  `isPrivateAct` (no head of any kind, not in `acts`, no seen, no unsent, no key); `BoardState.flags`
  by number, which `get_board` never sends.
- **Layout**: `column` (the old list, now sorted by `n`) and `row` (left to right in card order,
  GAP apart, tops aligned); interim `MODE_LABEL`, `MODE_HINT`, `MODE_ICON` entries in packages/ui.
- **Splits at a seam**: write-board.ts -> `write-problem.ts` (an item's problem), `write-refs.ts`
  (the cards an item names); fold.ts -> `board-state.ts` (one board as the page reads it).
- **Found on the way**: `write_board` treated a reply's `to` (a `seq`) as a card (`REFS`), so a
  reply could be refused when its `to` matched a card on another board; now `refsOf(type)`.
- **Tests**: new `packages/actions/tests/retire.test.ts` (6) and `card-flags.test.ts` (4),
  `apps/board/tests/api-retire.test.ts` (3) and `api-flag.test.ts` (3, with the edge: act,
  mark_seen, a radial centre); a permissions `retire` row; references `retire`, `act:flag`,
  `act:unflag`; a versions retire case; layout `row` and `column`. The API harness seeds `q`/`d` as
  pricing's numbers (1, 2) and `qId`/`dId` as identities; expectations on board b (cards 5, 6 are
  its 4 and 5) and pricing moved to numbers, which caught slips while building.
- **Docs**: api.md 126-127 (deviation 2; show_container lists the cards that left), the
  packages/actions and apps/board READMEs, `npm run map`.

**Deviations.**
1. The out-translation lives in the action layer's read views (they are the answer shapes; the
   page reads them too), not in the server; the in-translation is the server's edge as planned.
2. A container retire also waits while the container's own latest note has no reply (assumption
   B's "nothing the person asked for goes missing"). Undo: the last lines of `retireProblem`.
3. `pageConditions` (the page) still gives identities (`c.id`, with a comment): FE_01's.
4. A flag moves the ledger's position (`head`, the View's `version`) like any line on any board;
   no board head moves (`list_boards`' `seq`). The tests compare without the position.
5. `packages/cli/tests/roundtrip.test.ts`: the `read-ledger` test now checks vb has no such command.
6. `read_ledger` page-only: nothing beyond BE_01's contract. To reverse, give the agent tools back
   and filter `isPrivateAct` lines for an agent caller in `server/reads.ts` `readLedger`.

**Gates.** `npm run check` 0 errors (tsc and svelte-check); `npm run verify` ok, 0 warnings;
`npm run gen -- --check` current; `npm test` 1021 tests, 1017 pass, 4 fail, all FE_01's (below);
`npm run test:timing` 6/6.

**Hand-off to FE_01.**
1. Unit tests failing on page behaviour FE_01 owns:
   a. `packages/ui/tests/region-core.test.ts` "MODE_HINT holds mockup 05's one-liner for every
      mode": the words for `column` and `row` (interim words in `region-core.ts`).
   b. `packages/ui/tests/region-template.test.ts` "the mode row ends in a divider, Comment and the
      cog": the mode row now draws 6 layouts (interim `row` icon in `region-icons.ts`).
   c. `apps/board/tests/gallery-fixture.test.ts` "a region frame exists for every layout mode": the
      gallery ledger needs a `row` region (and to move to v12).
   d. `apps/board/tests/chat-bridge.test.ts` "chat to board: a change chip selects its cards": the
      fixture's board `c` card is identity 4 but number 1; chat change chips carry board numbers
      (write results' `n`), so the fixture and `source(n)` read per board.
2. The page's reads: `io.ts` `readLedger` is the one place to map `fromLine` (live.ts and
   versions.ts read through it). After that the fold is by identity and `boardData` is in numbers
   (its `versions` already are). Everything the page indexes the fold with a View number must go
   through `cardId(s.index, board, n)` (or `boardNumber` back): `pageConditions` (board-data.ts),
   updates.ts (`unseenCount`, `unseenSteps`, `seenMarks`), parking.ts, proposals.ts (`p.id`),
   notes.ts, item-acts.ts, chat-bridge.ts. The page's own `validateAct` before sending needs the
   event code reads (`id`), while the body it sends keeps `n` = the board number.
3. The flag: `BoardState.flags` (node ids) is ready; acts `flag`/`unflag` `{ n }` (no `ver`); give
   F a home (Fit has it) in the registry `key` or the page's keys.
4. The marker: retire lines with no `region`; their `cards` are identities; the container each was
   in at `seq - 1` (`placeOf` on the state before the line).
5. Mode names: `column`, `row` (labels, hints, icon, which ones show in the row); a sent `list` is
   refused (422 at `/mode`).
6. `npm run test:pages` (run once, 27 min, no screenshots updated): 268 failed, 48 passed, 16 did
   not run. One cause covers nearly all: the page folds `read_ledger`'s lines as code events, so a
   node line's `n` never becomes `id` and no card draws (169 fail on "`vb-node` count 0", 7 on
   `vb-node` not visible, 7 time out waiting for cards). The gallery (`gallery.spec.ts`, 24 + 26 on
   `section[data-pattern]` / `data-feature` sections not visible) folds its fixture ledger the same
   way and also needs it at v12 with a `row` frame. 3 `vb-node-title` text mismatches follow from
   the same fold. Passing: the chat panel's shell, the folder picker, new board and rename, live
   boards with no cards, the toolbar, `same-picture` (3 seeds). Expect most to return with item 2's
   `fromLine` in `io.ts`; then the board-number reads (item 2) and the screenshots for the new mode
   row. Results: `$TMPDIR/vision-board-test-results-4468`.

**Proposed for a protected file (not edited).** `.kiro/steering/vision-board-proj.md`,
terminology: "**Item**: a node that needs a response; it has a stable **number** on its board
(1, 2, 3... in the order drawn, D-041); the ledger knows it by an identity no answer shows." With
D-041 as BE_01 proposed it.
### FE_01

**Status**: done 2026-10-11, on the uncommitted working tree (BE_01 and BE_02 as they left it).

**Built.**
- **Reads.** `io.ts` `readLedger` maps every line with `fromLine` (live.ts and versions.ts read
  through it), so the held state is by identity and `list` reads `column`. Act, card seen and
  put_board answers come back in board numbers: `card-numbers.ts` (`idOf`, `numOf`,
  `answerEvent`) turns them back before `live.own` applies them in place; the sender passes the
  board the act was sent to, so a board switch mid-flight cannot mistranslate.
  `pageConditions` gives board numbers (`numberOf`); `updates.ts` (`unseenCount`, `unseenSteps`,
  `seenMarks`, new `seenVer`), `update-flow.ts` (a stepper keeps its board) and `parking.ts` (new
  `board()` dep) index the fold through `idOf`. proposals.ts, notes.ts, item-acts.ts and
  chat-bridge.ts already read board numbers (BoardState, the View, write results), so nothing
  changed there. The page has no `validateAct` call of its own (only a comment in access.ts), so
  nothing to move to `id`.
- **Retire.** `retired.ts` `retiredCounts`: cards retired one at a time (a retire line whose seq
  is no container retire's), counted on the container each was in (the person's last move, else
  its last version's container: `placeOf` falls back to the drawn container once the moved-to one
  is gone, which a test caught), only containers still on the board (or Later); `version` = the
  last run before the latest such retire, none when there is none or versionView is off. ui:
  `RegionState.retired`, `retiredMarker` (words and name), a `vb-region-retired` button after the
  count (aria-disabled with no version, gives way first on a short title line); render.ts merges
  it; wiring.ts sends a press to `showVersion`. Retired cards and containers leave the board
  through BE_01/BE_02's `boardView`/`boardState` (tested on the page).
- **The flag** (`cardFlag` flag, on). ui: `FLAG_KEY`, `flagLabel`, `FLAG_ICON`,
  `NodeState.flagged`, `nodeTemplate(n, { flag })` draws `button.vb-flag[data-flag]` last in the
  card's toolbar after Later (constant name, aria-pressed), `data-flagged` on the card, ", flagged"
  in its name. Page: `flag-flow.ts` (`flagAct` = `{ action, n }` no `ver`, `flaggedIds`,
  `nextFlagged`, `createFlagFlow`), Shift+F in keys.ts (only on a focused card, before the shifted
  commands; F stays Fit; with the flag off Shift+F falls through to Fit as before), the key list
  row (key-help.ts), `FlaggedChip.svelte` ("N flagged", a chip that is a button; Toolbar and the
  gallery share it), `shell.flagged`, `Board.nextFlagged`. The chip goes from the focused card, or
  from the card it went to last (a press on the chip takes focus off the card), wrapping; hidden
  flagged cards are skipped with a toast. Off: no button, key, chip or ", flagged".
- **Modes.** `MODE_HINT` column "One card under another, in card order", row "One card beside
  another, in card order"; icons: three small cards stacked / side by side (the first draft looked
  like lanes); the popover holds six tiles (680px wide; two rows of three when compact).
- **Gallery.** Ledger lines 252-274 at v12: `frame-list` redrawn as "Column mode" (mode column,
  its cards retitled), a `frame-row` "Row mode" frame with two cards (one acknowledged), and a new
  board `marks`: a container of three cards, two flagged (one redrawn after its flag), and a
  container two cards were retired from singly after a person act (so the marker has a version).
  New sections `flag-section.ts` (data-feature cardFlag) and `retired-section.ts` (data-feature
  retiredMarker); `fixture.ts` `marks`.
- **Splits.** node-core.ts -> `node-updates.ts` (the changed card's tab and stepper);
  controller.ts -> `toolbar-counts.ts` (the toolbar's numbers). controller.ts is at 300.
- Docs: apps/board/README.md (the page's reads and the new modules), node and region pattern.json
  (flaggedStates, attributes, six modes), `npm run map`.
- **Tests.** New: `apps/board/tests/card-numbers.test.ts` (3: both ways, `list` reads `column`,
  answers applied on a second board), `flag-flow.test.ts` (5, including the Send message and chat
  chips reading the same with and without flags), `retired.test.ts` (4), `api-modes.test.ts` (2:
  column and row taken, a sent `list` 422 at `/mode` and at `/items/3/region/mode`),
  `packages/ui/tests/node-flag.test.ts` (2), a `retiredMarker` and a template test in the region
  tests, a key-list test; updates.test.ts gained a two-board test. Page:
  `tests/pages/flag-retire.spec.ts` (16: the flag button, Shift+F, F still Fit, identities stored,
  kept through a redraw and a reload, the chip stepping and wrapping, nothing new to send and no
  agent read, flag off, axe; retire marker opening the past version, a container retired whole,
  marker off, number 2 never reused; Column and Row in the row, a row laid left to right, `list`
  422; a second board's buttons, updates and seen by number; the two gallery sections with axe and
  screenshots). `tests/pages/board-lines.ts`: one helper that reads a board's lines with cards by
  board number, for the specs that check what the page stored. I wrote these alongside the code,
  not strictly before it; two caught real slips (`retired.test.ts`: `placeOf` falls back to the
  drawn container once the moved-to one is gone; the page spec: a press on the chip took focus
  off the card, so it restarted at the first).

**Existing specs changed, and why.**
1. `chat-bridge.test.ts`: change chips carry board numbers (write results), so board c's card is
   its 1, not the ledger's 4 (ruling 2).
2. `updates.test.ts`, `parking.test.ts`, `gallery-fixture.test.ts`: the new `board` argument;
   expectations in board numbers (the updates board's 96, 97, 98, 103 are its 1 to 4) (ruling 2).
3. `packages/actions/tests/heads.test.ts` (BE_02's): its oracle walk now skips private acts, as the
   fold does; the gallery ledger is the first fixture with flags (ruling 3, BE_01's reading 3).
4. `packages/ui` region tests: the six modes and their hints, the marker in the title line (ruling 4).
5. Page: `board.spec.ts` and `gallery.spec.ts` mode lists and counts (six layouts, Column and Row;
   the narrow row expands to 8 stops; 25 frames; the full-page screenshot also turns off cardFlag and
   retiredMarker like every other feature section) (ruling 4); `same-picture.spec.ts` names the
   mixed board's cards 1-17, not 1001-1017, and picks column and row (it had passed for BE_02 only
   because every refused act is skipped) (rulings 2, 4); `card-updates`, `new-cards`, `proposals`
   specs read stored lines through `board-lines.ts`, since the file holds identities (ruling 2).

**Screenshots updated** (each viewed, actual against expected): `board` (light, dark): the flag
button in every footer, six mode icons; `gallery` (light, dark): six mode icons and tiles, the
column and row frames, card numbers per board on the notes and containers samples; `card-updates`,
`parking-replies`, `proposals` gallery sections (light, dark): card numbers per board (96 -> 1 and
so on; "drop 92" -> "drop 1"), and the mode row on the container sample; `send-access` gallery
(light, dark): six mode icons (the hover frame's count gives way sooner); `versions` gallery
banner (light, dark): the gallery board's latest past version is v257 now (its v12 lines);
`key-bubble` open and gallery (light, dark): the Shift+F row. New: `flag-retire` flag and retired
sections (light, dark).

**Deviations and readings.**
1. Shift+F for the flag (the orchestrator's call; F is Fit). Shift+F acts only with focus on a
   card; elsewhere it stays Fit.
2. `row` ships without its own flag: the modes are the contract's (ruling 4), and the column icon
   and the popover change with or without one, so a flag could not keep the old screenshots.
   The flag UI and the marker are behind `cardFlag` and `retiredMarker` (both on).
3. The marker counts every card retired singly from a container and opens the version before the
   latest such retire (so the most recently retired cards show; earlier ones may already be gone
   there). When no earlier version exists (drawn and retired in one run of the agent's, with no
   person line between), it only counts, aria-disabled; likewise with versionView off.
4. A flag moves the ledger's position, so the Send message's "(vN)" differs (BE_02 deviation 4);
   nothing else in it does.
5. Chip: it focuses the next flagged card (focus.ts pans it into view) and does not select it.
6. The chip is hidden while a past version shows.

**Gates** (run one after another; no test server left running): `npm run check` 0 errors;
`npm test` 1041/1041 and timing 6/6; `npm run verify` ok, 0 warnings; `npm run gen -- --check`
current; `npm run test:pages` 347 passed, 0 failed.

**Proposed for protected files (not edited).**
1. `tokens.css`, under "Item states": `--vb-state-flag: light-dark(#c2410c, #fb923c); /* the
   person's flag (field report batch 2): APCA Lc 74.5 / -56.6 on the card, 65.1 / -55.5 on
   sunken */`. node.css and board.css already read `var(--vb-state-flag, var(--vb-kind-risk))`, so
   the token takes over as soon as it lands; until then the risk orange stands in (Lc 64.7 / -52.5
   on the card), which a risk card's own colour shares.
2. `.kiro/steering/vision-board-proj.md` rule 3: "Node states (open, acknowledged, dropped,
   commented, needs context, saved for later, decided, flagged) are tokens too." Terminology:
   "**Flag**: the person's private mark on a card, kept in the ledger and never sent to an agent."

### T_01
### VERIFY_01
