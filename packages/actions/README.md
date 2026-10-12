# packages/actions

Everything a person or agent can do on the board, as a typed action (acknowledge, drop, comment,
more context, later, reopen, pin, mode, and more later). Buttons, keyboard shortcuts and agents
call the same actions, and each one is recorded in the project ledger as an `act` event (rule 8).

- **Depends on**: `packages/format`.
- **Used by**: `packages/ui`, `apps/board`.
- **Public API** (`src/index.ts`): the registry (`ACTIONS`, `ITEM_ACTIONS`, `DECIDED`), the
  ledger fold (`foldLedger`, `applyEvent`, `emptyState`; every map keyed by a card's identity,
  `id`), one board as the page reads it (`boardState`, `statusOf`, `counts`, in `board-state.ts`,
  keyed like the View by board number), board numbers out (`numbers.ts`, api.md 125: `numberOf`,
  `cardName`, `eventOut`, `noteOut`, `proposalOut`, `linkOut`; every read view and every word an
  agent or the person reads names a card by its number on its board), retiring cards
  (`retire.ts`, api.md 126-127, 141-142: `retireCards`, `retireProblem`, and `owedNotice`, the person's
  warning before they remove cards; `unsent.ts` `dropRetired`), the person's private flags
  (`card-flags.ts`, api.md 128: `flagsOn`; no agent read looks at them), archived boards
  (`archive.ts`, api.md 135-137: `boardVisibility`, the one check of whether agents see a board,
  `visibleToAgents`, `archivedProblem`, `UNAVAILABLE`, `archivedBoards`), locked boards (`lock.ts`,
  api.md 138-140: `boardLocked`, which counts an archived board, `writeProblem`, the one "may this
  line be written" check, `passesLock`, `lockedProblem`, `LOCKED`, `LOCKED_PERSON`), the
  references table (`references.ts`, D-033: `REFERENCES`, one row per kind in `REFERENCE_KINDS`
  saying what it belongs to; `scopeOf`, the board, container and cards any ledger line touches;
  `placeOf`, the container a card is in now; `eventBoard`, behind each board's head in
  `LedgerState.heads`), act validation (`validateAct`, with the proposal rules; how a proposal
  ends and where an open one stands is `proposals.ts`, api.md 93), the permissions table (`permissions.ts`,
  D-033, D-034: `PERMISSIONS`, one row per write item kind saying what an agent needs, board first,
  then container; `canWrite`, its one-line call; `mayAnswer` and `mayAnswerIn`, what an agent may
  answer on a card or a whole container), grants (`holders`, `creatorOf`, `grantRequests`, of a
  board or a container), the conditions table (`conditions.ts`, D-033: `CONDITIONS`, one row per
  kind in `CONDITION_KINDS` saying what it is about, who is told, where the page shows it, when it
  holds and ends, and, for a card's label, what the person does that clears it (`clearedBy`,
  read by `clearsOnSelect`); `conditionsOf`, everything that needs attention for a board and an
  asking agent; `boardNews`, the one rule behind `board.new` and `board.changed`; where a board's
  latest round starts, for `item.new`, is `rounds.ts`; what the next Send carries, for
  `board.unsent`, is `unsent.ts`, by `isAnswer` in the registry, the test `replyScope` uses too),
  what an agent owes and the person's responses (`pendingItems`, `responsesAfter`, `replyScope`, in
  `pending.ts`), the API's read views (`nodeDetail`, `linkedDetails`, `containerDetail`,
  `openItems`, `openContainers`, `boardAccess`, `boardList`, in `reads.ts`), the numbered reply
  (`replyText`, in parts `replyLines`), what a chat message carries from the board (`board-message.ts`:
  `boardBlocks`, the selection headed "The person selected these cards:" then `roundOf`, the answers
  since the agent was last told; one writer for the server's prompt and the composer's preview), and what ✓ and ✗ mean on each kind (`MEANINGS`, `meaningOf`, `actionWord`, in
  `action-words.ts`), which the buttons, the key help, `check_responses` (`means`) and the reply read.
- **Awareness tables** (D-033): what belongs to what (`REFERENCES`), who may write what
  (`PERMISSIONS`) and what needs attention (`CONDITIONS`) are each one typed table, derived from
  the folded ledger; a new kind without a row is a type error, and every row has a test. A check
  needed in more than one place is a row, never a local check.
