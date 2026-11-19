// Words: format-export. Why an export file can't be read, and each part of one an import leaves out (D-107).
// Keys: vision-board.format-export.<name>. Plain code: no imports but other words files and types.

// ---- export/upgrade.ts
export const notAnExportFile = 'This is not a Vision Board export file: it has no format version (`v`).';
export const newerExport = (v: number, current: number): string =>
  `This export file is version ${v}, made by a newer Vision Board; this one reads up to version ${current}. Update Vision Board to import it.`;
export const noStepFrom = (v: number, current: number): string =>
  `This export file is version ${v}, which this Vision Board can't bring up to version ${current}.`;

// ---- export/condition.ts
export const untitledBoard = 'Imported board';
export const untitledContainer = 'Imported container';
export const untitledCard = 'Untitled card';
export const unknownField = (at: string): string => `${at}: not a field Vision Board knows`;
export const refused = (problem: string): string => `${problem}; left out`;
export const notAnEntry = (at: string): string => `${at}: not something an export holds`;
export const replaced = (problem: string, by: string): string => `${problem}; it is now "${by}"`;
export const itemLeftOut = (why: string): string => `${why}; the item is left out`;
export const notInAnExport = (at: string, type: string): string => `${at}: a \`${type}\` item is not part of an export`;
export const unknownKind = (at: string, kind: string): string => `${at}: card kind \`${kind}\` is unknown`;
export const missing = (at: string, field: string): string => `${at}: has no ${field}`;
export const noContainer = (at: string, region: string): string => `${at}: its container \`${region}\` is not in the file`;
export const byNumber = (at: string): string => `${at}: names a card by its number on the board it came from`;
export const fromItsBoard = (at: string): string => `${at}: belongs to the board it came from`;
export const noSuchKey = (at: string, key: string): string => `${at}: no card or container in the file has key \`${key}\``;
export const keyOrKeys = (at: string): string => `${at}: names one card or container by \`key\`, or two or more cards by \`keys\`, never both`;
export const notAList = (at: string): string => `${at}: not a list`;
export const notAsked = (at: string, key: string): string => `${at}: card \`${key}\` asks for no ✓ or ✗`;
export const answerOneOf = (at: string): string => `${at}.answer: one of check, cross`;
