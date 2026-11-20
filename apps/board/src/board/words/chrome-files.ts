// Words: chrome-files. Export, import and Save as PDF: the "⋯" menu's rows, the one dialog, and what it says once done.
// Keys: vision-board.chrome-files.<name>. Plain code: no imports but other words files and types.

// ---- ToolbarMenu.svelte
export const print = 'Save as PDF…';
export const exportBoard = 'Export…';
export const importBoard = 'Import…';
export const printTip = 'Save this board as a PDF, one page the size of the board';
export const exportTip = 'Save this board as a file that Import opens again';
export const importTip = 'Open an exported board, as a new board or into this one';
export const goBackToNowToExport = 'Go back to now to export: an export holds the board as it is now';
/** The rows' names in the "⋯" tooltip (toolbar.ts `moreTitle`); Save as PDF and Export are the dialog's buttons too. */
export const printName = 'Save as PDF';
export const exportName = 'Export';
export const importName = 'Import';

// ---- FilesForm.svelte
export const printBoard = 'Save board as PDF';
export const printContainer = 'Save container as PDF';
export const exportBoardHeading = 'Export board';
export const exportContainer = 'Export container';
export const importHeading = 'Import a board';
export const printBoardBody = 'Saves the board as it shows now as a PDF: one page, the size of the board.';
export const printContainerBody = (title: string): string => `Saves the container “${title}” as it shows now as a PDF: one page, the size of the container.`;
export const exportBoardBody = 'Saves this board as it is now (its containers, cards and links, and your ✓ and ✗) as a .vboard.json file. Import opens it again here or in another folder. No history goes with it.';
export const exportContainerBody = (title: string): string => `Saves the container “${title}” as it is now (its cards and links, and your ✓ and ✗) as a .vboard.json file. Import opens it again here or in another folder. No history goes with it.`;
export const importBody = 'Opens a .vboard.json file. Its cards arrive as new cards with new numbers, in containers of their own; nothing already here changes.';
export const borderBoard = 'Container borders';
export const borderContainer = 'Container border';
/** Save in light or dark (point 615), the screen's theme first. */
export const printIn = 'Save in';
export const light = 'Light';
export const dark = 'Dark';
export const notes = 'Include the conversations on notes';
export const notesHint = 'Your notes and the agents\' replies to them.';
export const into = 'Import into';
export const intoNew = 'A new board';
export const intoCurrent = 'This board';
export const goImport = 'Choose file…';
export const exporting = 'Exporting…';
export const importing = 'Importing…';
export const printing = 'Saving…';
export const leftOut = 'Imported. These parts of the file were left out:';

// ---- board-files.ts
export const notAnExportFile = 'That file isn\'t an export file (.vboard.json): it holds no board to import.';
export const noBoardOpen = 'No board is open.';
export const fileTooLarge = (most: string): string => `That file is over ${most}, the most an import takes here. Export fewer containers, or leave out the conversations on notes, and import that.`;
export const imported = (title: string): string => `Imported “${title}”.`;
export const exported = (name: string): string => `Saved ${name}.`;
