// Words: go-to-card. Go to card and the open-items chip.
// Keys: board.go-to-card.<name>. Plain code: no imports but other words files and types.

// ---- go-to-card.ts
export const noCard = (n: number): string => `No card ${n}`;
export const cardIsHiddenWithThe = (n: number): string => `Card ${n} is hidden with the answered cards (H shows them)`;
export const cardWasRemoved = (n: number): string => `Card ${n} was removed`;
export const showVWhereItLast = (version: number): string => `Show v${version}, where it last appeared`;
