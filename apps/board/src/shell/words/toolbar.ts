// Words: toolbar. The toolbar, its menu, zoom level, chips and the version banner.
// Keys: board.toolbar.<name>. Plain code: no imports but other words files and types.

// ---- LockedChip.svelte
export const theMenu = (LOCKED_PERSON: string | number): string => `${LOCKED_PERSON} (the "⋯" menu)`;
export const locked = 'Locked';

// ---- Toolbar.svelte
export const noBoardsYet = 'No boards yet';
export const archived = (count: number): string => `Archived (${count})…`;
export const version = 'Version';
export const vNow = (version: number): string => `v${version} · now`;
export const boardUpdated = (updated: number): string => `${updated} board${updated === 1 ? '' : 's'} updated`;
export const boardUpdatedWord = (updated: number): string => `board${updated === 1 ? '' : 's'} updated`;
export const newAndUpdatedCardsChoose = 'New and updated cards: choose one to go to it';
export const repliedItems = 'Replied items';
export const replied = 'replied';
export const answeredItems = 'Answered items';
export const answered = 'answered';
export const laterItems = 'Later items';
export const later = 'later';

// ---- ToolbarEnd.svelte
export const hideAnsweredItemsH = 'Hide answered items · H';
export const theme = (theme: string | number): string => `Theme: ${theme}`;
export const reply = 'Reply';
/** "Reply", or "Reply (3)" with answers to send. */
export const reply2 = (answered: number): string => `Reply${answered ? ` (${answered})` : ''}`;
export const openOrCloseTheChat = 'Open or close the chat · T';
export const chat = 'Chat';

// ---- ToolbarMenu.svelte
export const goBackToNowTo = (locked: boolean): string => `Go back to now to ${locked ? 'unlock' : 'lock'} this board`;
export const noBoardIsOpen = 'No board is open';
export const letYouAndTheAgents = 'Let you and the agents change this board again';
export const makeThisBoardReadOnly = 'Make this board read-only for everyone, agents included, until you unlock it';
export const openAnotherFolderOpenNow = (name: string | number): string => `Open another folder (open now: ${name})`;
export const openAProjectFolder = 'Open a project folder';
export const more = 'More';
export const offARowOfCards = 'Off: a row of cards lines up by its tops, a column by its left edges';
export const centreCards2 = 'Centre cards';
export const unlockBoard = 'Unlock board';
export const lockBoard = 'Lock board';
export const goBackToNowToArchive = 'Go back to now to archive this board';
export const hideThisBoardFromEvery = 'Hide this board from every agent and from the picker; restore it from the picker';
export const archiveBoard2 = 'Archive board…';
export const openFolder2 = 'Open folder…';
export const current = 'Current:';

// ---- VersionBanner.svelte
export const pastVersion = 'Past version';
export const viewing = 'Viewing';
export const fromReadOnly = (versionTime: string | number): string => `from ${versionTime} · read-only`;
export const backToNow = 'Back to now';

// ---- ZoomLevel.svelte
export const zoom = (percent: number): string => `Zoom ${percent}%`;

// ---- ToolbarMenu.svelte
/** The More button's tooltip: what its menu holds, now. */
export const moreTitle = (o: { centre: boolean; lock: boolean; locked: boolean; archive: boolean; folder: boolean; also?: readonly string[] }): string =>
  `More: ${moreAlso(o.also ?? [])}Theme, Hide answered${o.centre ? ', Centre cards' : ''}, Reply${o.lock ? `, ${o.locked ? 'Unlock' : 'Lock'} board` : ''}${o.archive ? ', Archive board' : ''}${o.folder ? ', Open folder' : ''}`;

// ---- The adaptive header (adaptiveHeader flag: Toolbar.svelte, HeaderFields.svelte, ZoomMenu.svelte)
export const whereYouAre = 'Where you are';
export const containers = 'Containers';
export const folder = 'Folder';
export const openCards = 'Open cards';
export const newCards = 'New cards';
export const flagged = 'Flagged';
export const openWord = 'open';
export const freshCount = (fresh: number): string => `${fresh} new`;
export const goToNewCard = 'Go to a new or updated card';
export const boardsUpdatedRow = (updated: number): string => `Board${updated === 1 ? '' : 's'} updated`;
/** The group of controls above the "⋯" menu's rows. */
export const moreControls = 'Moved from the bar';
/** The zoom menu's button: the level is its face, so its name says it too. */
export const zoomMenu = (percent: number): string => `Zoom ${percent}%, more zoom controls`;
/** The compact count's tooltip at the narrowest width. */
export const compactCount = (open: number, fresh: number): string => `${open} open${fresh ? `, ${fresh} new` : ''}: the lists are in the "⋯" menu`;
/** What "⋯" also holds at a width, for its tooltip. */
export const moreAlso = (also: readonly string[]): string => (also.length ? `${also.join(', ')}, ` : '');

// ---- LockedChip.svelte
export const thisBoardIsLocked =(LOCKED_PERSON: string | number): string => `This board is locked. ${LOCKED_PERSON}.`;
