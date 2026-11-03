// A ledger opened read-only (D-085, ledgers-and-read-only PLAN decisions 11-14): nothing is written into its folder until
// the person presses Edit. Not D-043's lock (lock.ts), which closes one board and lets the person's flags through: a
// read-only ledger takes no line at all, from anyone. The words each caller is told; the server refuses with the problem
// `read-only` (409) and its reads carry `readOnly: true`, and the page pauses with the person's words. Pure.
import * as actionsRefusalsWords from './words/actions-refusals.ts';

/** What an agent is told when it writes on a read-only ledger: nothing was written; the person can press Edit. */
export const READ_ONLY = actionsRefusalsWords.thisLedgerIsOpenRead;
/** What the person is told when a change waits for Edit. */
export const READ_ONLY_PERSON = actionsRefusalsWords.readOnlyPressEditTo;
