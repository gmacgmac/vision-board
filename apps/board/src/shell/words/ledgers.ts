// Words: ledgers. The ledger chip, its list, New ledger… and the New ledger dialog (ledgerFolders flag, D-084).
// Keys: vision-board.ledgers.<name>. Plain code: no imports but other words files and types.

// ---- LedgerPart.svelte (its name, "Ledger", is board/words/chrome-common.ts `ledger`: the "⋯" tooltip says it too)
export const ledgerChoose = (name: string): string => `Ledger ${name}: choose another ledger of this folder, or make a new one`;
export const ledgerOption = (name: string, boards: number, keptOut: boolean): string =>
  `${name} · ${boards} board${boards === 1 ? '' : 's'}${keptOut ? ' · kept out of git' : ''}`;
export const opening = (name: string): string => `Opening ${name}…`;

// ---- LedgerPart.svelte, LedgerRow.svelte
export const newLedger = 'New ledger…';
export const newLedgerTip = 'Make another ledger in this folder, with boards, cards and agents of its own';

// ---- LedgerForm.svelte
export const newLedgerHeading = 'New ledger';
export const aLedgerKeepsIts = 'A ledger keeps its own boards, cards and agents. Make one per area of work, or one to plan in and throw away.';
export const name = 'Name';
export const nameRule = 'Lowercase letters, digits and -, like a board id.';
export const ledgerThere = (name: string): string => `There is a ledger named ${name} already: choose it from the ledger list.`;
export const keepOutOfGit = 'Keep out of git';
export const keepOutOfGitNote = 'Git never sees this ledger or its boards: for planning you will throw away.';
