# packages/actions

Everything a person or agent can do on the board, as a typed action (✓ and ✗, a note, later,
clear, pin, mode, and more later). Buttons, keyboard shortcuts and agents
call the same actions, and each one is recorded in the project ledger as an `act` event (rule 8).

- **Depends on**: `packages/format`, `packages/search`.
- **Used by**: `packages/ui`, `apps/board`.
- **Public API** (`src/index.ts`): the registry (`ACTIONS`, `ITEM_ACTIONS`, `DECIDED` = `CLOSED`: only ✓
  and ✗ answer a card, D-045; `ACTION_OUT`, ✓ as `check` and ✗ as `cross` at the API edge), the
  ledger fold (`foldLedger`, `applyEvent`, `emptyState`; every map keyed by a card's identity,
  `id`), one board as the page reads it (`boardState`, `statusOf`, `counts`, in `board-state.ts`,
  keyed like the View by board number), board numbers out (`numbers.ts`, api.md 125: `numberOf`,
  `cardName`, `eventOut`, `noteOut`, `proposalOut`, `linkOut`; every read view and every word an
  agent or the person reads names a card by its number on its board), retiring cards
  (`retire.ts`, api.md 126-127, 141-142: `retireCards`, `retireProblem`, and `owedNotice`, the person's
  warning before they remove cards; `unsent.ts` `dropRetired`), the person's private flags
  (`card-flags.ts`, api.md 128: `flagsOn`; no agent read looks at them) and hidden notes (`card-notes-hidden.ts`, api.md 156: `notesHiddenOn`, the same), archived boards
  (`archive.ts`, api.md 135-137: `boardVisibility`, the one check of whether agents see a board,
  `visibleToAgents`, `archivedProblem`, `UNAVAILABLE`, `archivedBoards`), locked boards (`lock.ts`,
  api.md 138-140: `boardLocked`, which counts an archived board, `writeProblem`, the one "may this
  line be written" check, `passesLock`, `lockedProblem`, `LOCKED`, `LOCKED_PERSON`), app cards
  (`apps.ts`, api.md 150-151, D-047: `foldAppAct`, the one allowed hash per app in
  `LedgerState.appAllowed`; `appRules`; `appOf`, the app a card names; `namedApps` and `appCards`,
  the cards on a board now that name an app), each card's times (`card-times.ts`, card-polish FE_03:
  `foldCardTimes`, folded into `LedgerState.times`, ids and times only, no words; `cardTimeRows`, the
  history box's rows, matched and worded by `card-history.ts` `cardsAbout`, `saidOf` and `historyRow`), the
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
  asking agent; `boardNews`, the one rule behind `board.new` and `board.changed`; `freshCards`,
  the new and updated cards the toolbar's "N new" list and the containers' pills read, and the
  containers they make fresh (`fresh.ts`, `container.fresh`); from where a board's cards are new,
  for `item.new`, is `rounds.ts` (`newFrom`); what the next Send carries, for
  `board.unsent`, is `unsent.ts`, by `isAnswer` in the registry, the test `replyScope` uses too, and for the
  chat's agent (`sendTo`) only what it may read, by `concerns` in `permissions.ts`),
  what an agent owes and the person's responses (`pendingItems`, `responsesAfter`, `replyScope`, in
  `pending.ts`), the API's read views (`nodeDetail`, `linkedDetails`, `containerDetail`,
  `openItems`, `openContainers`, `boardAccess`, `boardList`, in `reads.ts`), the numbered reply
  (`replyText`, in parts `replyLines`), what a chat message carries from the board (`board-message.ts`:
  `boardBlocks`, the selection headed "The person selected these cards:" then `roundOf`, the answers
  since the agent was last told; one writer for the server's prompt and the composer's preview), and
  the agent's answer clearing a card (`clears.ts`: the fold's clears, and `unseenAnswer` until the
  person looks, D-045). Each card's ✓, ✗, Later and clear reach the agent folded to its latest
  (`pending.ts` `latestMarks`, and `unsent.ts` for Send). The board's cards as search documents (`boardSearchDocs`, `SEARCH_FIELDS`, `search-docs.ts`; title, body, container, notes, replies), for `#search`.
- **Answers** (`src/answers/`, ARCH_04): the pure queries a host asks of the folded ledger, each with
  its test in `tests/`: the board as the page and `get_board` read it (`boardData`, `boardJson`,
  `answeredIds`; `board-data.test.ts`), what needs attention on the page (`pageConditions`), the
  unseen updates and what was seen (`unseenCount`, `unseenSteps`, `seenDue`, `seenMarks`,
  `seenOnSelect`, `seenVer`; `updates.test.ts`), the retired cards (`retiredCounts`, `lastShown`,
  `pastLines`; `retired-markers.test.ts`), the open proposals' rows (`proposalRows`, `answerable`,
  `acceptAllPlan`; `proposal-rows.test.ts`), where Go to card goes (`goTarget`; `go-target.test.ts`),
  the words of a removal (`cardsWords`, `containerWords`; `remove-words.test.ts`), and the chat's
  chips (`Chip`, `cardChip`, `noteChip`, `boardChip`, `resolveChip`, and `turnOf`, `roundOf` with a refusal for a
  board the ledger does not hold; a board chip's ref is the board and the head it was added at, it resolves to
  `boardJson` of the board as it is now, and is refused only when the board is gone or archived, never as
  changed; `chips.test.ts`). The page keeps what it does with them (the act
  and the words of a proposal answer, the Go to card box, `numberedView`, `canApply`).
- **Awareness tables** (D-033): what belongs to what (`REFERENCES`), who may write what
  (`PERMISSIONS`) and what needs attention (`CONDITIONS`) are each one typed table, derived from
  the folded ledger; a new kind without a row is a type error, and every row has a test. A check
  needed in more than one place is a row, never a local check.
