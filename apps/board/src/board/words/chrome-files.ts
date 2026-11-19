// Words: chrome-files. Export, import and print: the "⋯" menu's rows, the one dialog, and what it says once done.
// Keys: vision-board.chrome-files.<name>. Plain code: no imports but other words files and types.

// ---- ToolbarMenu.svelte
export const print = 'Print…';
export const exportBoard = 'Export…';
export const importBoard = 'Import…';
export const printTip = 'Print this board, or save it as a PDF from the print dialog';
export const exportTip = 'Save this board as a file that Import opens again';
export const importTip = 'Open an exported board, as a new board or into this one';
export const goBackToNowToExport = 'Go back to now to export: an export holds the board as it is now';
/** The rows' names in the "⋯" tooltip (toolbar.ts `moreTitle`); Print and Export are the dialog's buttons too. */
export const printName = 'Print';
export const exportName = 'Export';
export const importName = 'Import';

// ---- FilesForm.svelte
export const printBoard = 'Print board';
export const printContainer = 'Print container';
export const exportBoardHeading = 'Export board';
export const exportContainer = 'Export container';
export const importHeading = 'Import a board';
export const printBoardBody = 'Prints the board as it shows now, fitted to one page. To keep a PDF, choose Save as PDF in the print dialog.';
export const printContainerBody = (title: string): string => `Prints the container “${title}” as it shows now, fitted to one page. To keep a PDF, choose Save as PDF in the print dialog.`;
export const exportBoardBody = 'Saves this board as it is now (its containers, cards and links, and your ✓ and ✗) as a .vboard.json file. Import opens it again here or in another folder. No history goes with it.';
export const exportContainerBody = (title: string): string => `Saves the container “${title}” as it is now (its cards and links, and your ✓ and ✗) as a .vboard.json file. Import opens it again here or in another folder. No history goes with it.`;
export const importBody = 'Opens a .vboard.json file. Its cards arrive as new cards with new numbers, in containers of their own; nothing already here changes.';
export const borderBoard = 'Container borders';
export const borderContainer = 'Container border';
export const notes = 'Include the conversations on notes';
export const notesHint = 'Your notes and the agents\' replies to them.';
export const into = 'Import into';
export const intoNew = 'A new board';
export const intoCurrent = 'This board';
export const goImport = 'Choose file…';
export const exporting = 'Exporting…';
export const importing = 'Importing…';
export const printing = 'Printing…';
export const leftOut = 'Imported. These parts of the file were left out:';

// ---- board-files.ts
export const notAnExportFile = 'That file isn\'t an export file (.vboard.json): it holds no board to import.';
export const noBoardOpen = 'No board is open.';
export const imported = (title: string): string => `Imported “${title}”.`;
export const exported = (name: string): string => `Saved ${name}.`;
