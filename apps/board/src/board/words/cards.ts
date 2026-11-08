// Words: cards. Cards: flag, move, select, finder and history.
// Keys: vision-board.cards.<name>. Plain code: no imports but other words files and types.

// ---- finder.ts
export const later = 'Later';
export const item = (title: string, count: number): string => `${title} · ${count} item${count === 1 ? '' : 's'}`;

// ---- flag-flow.ts
export const flaggedGoToTheNext = (k: number): string => `${k} flagged · go to the next one`;
export const flagRemoved = 'flag removed';
export const theFlaggedCardsAreHidden = 'The flagged cards are hidden: turn off Hide answered to see them.';

// ---- link-marks.ts
export const linkFromTo = (from: string, to: string, label: string): string => `Link from ${from} to ${to}: ${label}`;

// ---- move-menu.ts
export const moveCardTo = (count: number): string => `Move ${count} card${count === 1 ? '' : 's'} to`;

// ---- selection.ts
export const selectionCleared = 'Selection cleared';
export const cardSelected = (count: number): string => `${count} card${count === 1 ? '' : 's'} selected`;

// ---- moves.ts
export const movedTo = (count: number, title: string): string => `${count === 1 ? '1 card' : `${count} cards`} moved to ${title}`;
