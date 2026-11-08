// Words: folders. The folder picker, the folder chip and the page title that names the folder.
// Keys: vision-board.folders.<name>. Plain code: no imports but other words files and types.

// ---- FolderChip.svelte
export const folderOpenAnotherFolder = (folderName: string | number, path: string | number): string => `Folder ${folderName}: ${path}. Open another folder`;

// ---- FolderPicker.svelte
export const board = (n: number): string => ` (${n} board${n === 1 ? '' : 's'})`;
export const readingFolders = 'Reading folders…';
export const chooseAProjectFolderUnder = 'Choose a project folder under ~';
export const visionBoardFound = (boards: string | number): string => `Vision Board found${boards}`;
export const noVisionBoardHere = 'No Vision Board here';
export const opening = 'Opening…';
export const open = 'Open';
export const board2 = 'board';
export const hasAVisionBoard = ', has a Vision Board';
export const openFolderChooseAProject = 'Open folder — choose a project folder';
export const openFolder = 'Open folder';
export const underYourHomeFolder = 'Under your home folder.';
export const chooseAProjectFolderUnderYour = 'Choose a project folder under your home folder.';
export const currentFolder = 'Current folder';
export const copyTheFullPath = 'Copy the full path';
export const copied = 'Copied';
export const pathCopied = 'Path copied';
export const couldNotCopySelectThe = 'Could not copy: select the path and copy it by hand';
export const folderPath = 'Folder path';
export const cloudStorage = 'Cloud storage';
export const recent = 'Recent';
export const inText = (name: string | number): string => `In ${name}`;
export const noFoldersInHere = 'No folders in here.';
export const onlyTheFirstFoldersAre = (count: number): string => `Only the first ${count} folders are listed.`;

// ---- folder.ts
export const visionBoard = (folderName: string): string => `${folderName} · Vision Board`;

// ---- FolderPicker.svelte
export const theBoardThenShowsThat = (here: string | number): string => `${here} The board then shows that folder's boards, and the chat works there.`;
export const thisFolderIsOpenNow = (boards: string | number): string => `This folder is open now${boards}.`;
