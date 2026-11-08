// Words: actions-history. A card's history: what the person or the agent did, in a row.
// Keys: vision-board.actions-history.<name>. Plain code: no imports but other words files and types.

// ---- card-history.ts
export const drewV = (ver: number | undefined): string => `drew v${ver}`;
export const onCards = (cards: number): string => ` on ${cards} cards`;
export const editedNote = (n: number): string => `edited note ${n}`;
export const askedForMoreContext = 'asked for more context';
export const repliedToANote = 'replied to a note';
export const repliedToNote = (n: number): string => `replied to note ${n}`;
export const markedIt = 'marked it ✓';
export const markedIt2 = 'marked it ✗';
export const reopenedIt = 'reopened it';
export const savedItForLater = 'saved it for later';
export const parkedIt = 'parked it';
export const setItsSizeBackTo = 'set its size back to automatic';
export const setItsSizeTo = (SIZE_WORD: string): string => `set its size to ${SIZE_WORD}`;
export const movedItToLater = 'moved it to Later';
export const movedItToAnotherContainer = 'moved it to another container';
export const placedIt = 'placed it';
export const resetItsPlace = 'reset its place';
export const proposed = (mark: string | undefined): string => `proposed ${mark}`;
export const acceptedTheProposal = (mark: string): string => `accepted the proposal (${mark})`;
export const turnedDownTheProposal = 'turned down the proposal';
export const allowedTheApp = 'allowed the app';
export const stoppedTheApp = 'stopped the app';
export const removedIt = 'removed it';
export const you = 'You';
export const agent = 'Agent';
export const sentNote = (n: number, cards: string | number): string => `sent note ${n}${cards}`;
