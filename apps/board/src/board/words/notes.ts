// Words: notes. Notes: the toasts for saving and removing, and the group pins.
// Keys: vision-board.notes.<name>. Plain code: no imports but other words files and types.

// ---- group-pins.ts
export const notesOnGroupsOfCards = 'Notes on groups of cards';

// ---- notes.ts
export const notSaved = (problem: string): string => `Not saved: ${problem}`;
export const container = (region: string): string => `container ${region}`;
export const cards = (count: number): string => `${count} cards`;
/** The toast after a note is saved: "Note on 3 added". */
export const noteOn = (on: string | number, action: string): string =>
  `Note on ${on} ${{ comment: 'added', 'note-edit': 'saved', 'note-remove': 'removed' }[action] ?? 'saved'}`;

// ---- region-notes.ts
export const notRemoved = (problem: string): string => `Not removed: ${problem}`;
export const noteOnContainerRemoved = (title: string): string => `Note on container ${title} removed`;
