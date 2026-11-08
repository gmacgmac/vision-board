// Words: chrome-go-to-card. Go to card and the open-items chip.
// Keys: vision-board.chrome-go-to-card.<name>. Plain code: no imports but other words files and types.

// ---- GoToCard.svelte
export const enter = 'Enter';
export const go = 'go ·';
export const close = 'close';
export const showV = (version: number): string => `Show v${version}`;

// ---- OpenChip.svelte
export const goToAnOpenCard = 'Go to an open card';
export const openItemsChooseOneTo = 'Open items: choose one to go to it';
export const openItems = 'Open items';

// ---- GoToCard.svelte, with search (cardSearch flag)
export const findACard = 'Find a card';
export const cardNumberOrWords = 'Card number or words';
export const steps = '↑↓';
export const step = 'step ·';
// ---- KeyHelp.svelte, with search
export const findACardByItsWords = 'Find a card by its words';
