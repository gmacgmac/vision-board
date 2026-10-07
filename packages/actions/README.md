# packages/actions

Everything a person or agent can do on the board, as a typed action (acknowledge, drop, comment,
more context, later, reopen, pin, mode, and more later). Buttons, keyboard shortcuts and agents
call the same actions, and each one is recorded in the project ledger as an `act` event (rule 8).

- **Depends on**: `packages/format`.
- **Used by**: `packages/ui`, `apps/board`.
- **Public API** (`src/index.ts`): the registry (`ACTIONS`, `ITEM_ACTIONS`, `DECIDED`), the
  ledger fold (`foldLedger`, `applyEvent`, `emptyState`, `boardState`, `statusOf`, `counts`), the
  references table (`references.ts`, D-033: `REFERENCES`, one row per kind in `REFERENCE_KINDS`
  saying what it belongs to; `scopeOf`, the board, container and cards any ledger line touches;
  `placeOf`, the container a card is in now; `eventBoard`, behind each board's head in
  `LedgerState.heads`), act validation (`validateAct`), the permissions table (`permissions.ts`,
  D-033, D-034: `PERMISSIONS`, one row per write item kind saying what an agent needs, board first,
  then container; `canWrite`, its one-line call; `mayAnswer` and `mayAnswerIn`, what an agent may
  answer on a card or a whole container), grants (`holders`, `creatorOf`, `grantRequests`, of a
  board or a container), the conditions table (`conditions.ts`, D-033: `CONDITIONS`, one row per
  kind in `CONDITION_KINDS` saying what it is about, who is told, where the page shows it, when it
  holds and ends; `conditionsOf`, everything that needs attention for a board and an asking agent;
  `boardNews`, the one rule behind `board.new` and `board.changed`),
  what an agent owes and the person's responses (`pendingItems`, `responsesAfter`, in
  `pending.ts`), the API's read views (`nodeDetail`, `linkedDetails`, `containerDetail`,
  `openItems`, `openContainers`, `boardAccess`, `boardList`, in `reads.ts`), and the numbered reply
  (`replyText`).
- **Awareness tables** (D-033): what belongs to what (`REFERENCES`), who may write what
  (`PERMISSIONS`) and what needs attention (`CONDITIONS`) are each one typed table, derived from
  the folded ledger; a new kind without a row is a type error, and every row has a test. A check
  needed in more than one place is a row, never a local check.
