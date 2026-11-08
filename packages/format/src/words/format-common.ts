// Words: format-common. Sentences more than one area of the format says, said once.
// Keys: vision-board.format-common.<name>. Plain code: no imports but other words files and types.

// ---- app-shape.ts
export const mustBeAnObject = (f: string): string => `${f}: must be an object`;
export const appIdIsItsFolder = (f: string): string => `${f}.id: the app's id, its folder's name in the ledger folder's apps/`;

// ---- ledger-shape.ts
export const lanesRequiredForLanesMode = (f: string): string => `${f}.lanes: required for lanes mode`;

// ---- data-folder.ts
export const ledgerNameTooLong = (max: number): string => `A ledger's name is at most ${max} characters.`;
export const ledgerNameChars = 'A ledger\'s name uses lowercase letters, digits and -, and starts with a letter or digit, like a board id.';
export const ledgerNameTaken = (name: string): string => `"${name}" is the name of a file or folder the board keeps; choose another name for the ledger.`;
