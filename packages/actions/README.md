# packages/actions

Everything a person or agent can do on the board, as a typed action (acknowledge, drop, comment,
more context, later, reopen, pin, mode, and more later). Buttons, keyboard shortcuts and agents
call the same actions, and each one is recorded in the project ledger as an `act` event (rule 8).

- **Depends on**: `packages/format`.
- **Used by**: `packages/ui`, `apps/board`.
- **Public API** (`src/index.ts`): the registry (`ACTIONS`, `ITEM_ACTIONS`, `DECIDED`), the
  ledger fold (`foldLedger`, `applyEvent`, `applyItem`, `boardState`, `statusOf`, `counts`),
  act validation (`validateAct`), and the numbered reply (`replyText`).
