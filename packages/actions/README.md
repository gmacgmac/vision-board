# packages/actions

Everything a person or agent can do on the board, as a typed action (acknowledge, drop, comment,
more context, later, reopen, pin, mode, and more later). Buttons, keyboard shortcuts and agents
call the same actions, and each one is recorded in the transcript (rule 8).

- **Depends on**: `packages/format`.
- **Used by**: `packages/ui`, `apps/board`.
- **Public API** (`src/index.ts`): the registry (`ACTIONS`, `ITEM_ACTIONS`, `DECIDED`), record
  building and validation (`makeRecord`, `validateRecord`), the transcript reducer
  (`reduceTranscript`, `statusOf`, `counts`), and the numbered reply (`replyText`).
