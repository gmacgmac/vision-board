// Words: toolbar. The toolbar, its menu, zoom level, chips and the version banner.
// Keys: vision-board.toolbar.<name>. Plain code: no imports but other words files and types.

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
export const hideAnsweredItemsH = (key: string): string => `Hide answered items · ${key}`;
export const theme = (theme: string | number): string => `Theme: ${theme}`;
export const reply = 'Reply';
/** "Reply", or "Reply (3)" with answers to send. */
export const reply2 = (answered: number): string => `Reply${answered ? ` (${answered})` : ''}`;
export const openOrCloseTheChat = 'Open or close the chat · T';
export const chat = 'Chat';

// ---- ToolbarMenu.svelte
export const goBackToNowTo = (locked: boolean): string => `Go back to now to ${locked ? 'unlock' : 'lock'} this board`;
export const noBoardIsOpen = 'No board is open';
/** The other-folders switch, inverted (D-120, chat 850-851): ticked while only this repo's agents may join. */
export const repoAgentsOnly = 'Repo agents only';
export const repoAgentsOnlyTip = 'Only agents working in this repo can join. Untick to let agents from other repos in; they still need your grant to write.';
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
export const moreTitle = (o: { theme: boolean; centre: boolean; lock: boolean; locked: boolean; archive: boolean; folder: boolean; ledger?: boolean; also?: readonly string[]; files?: readonly string[] }): string =>
  `More: ${moreAlso(o.also ?? [])}${o.theme ? 'Theme, ' : ''}Hide answered${o.centre ? ', Centre cards' : ''}, Reply${o.lock ? `, ${o.locked ? 'Unlock' : 'Lock'} board` : ''}${o.archive ? ', Archive board' : ''}${(o.files ?? []).map((f) => `, ${f}`).join('')}${o.folder ? ', Open folder' : ''}${o.ledger ? ', New ledger' : ''}`;

// ---- The adaptive header (adaptiveHeader flag: Toolbar.svelte, HeaderFields.svelte, ZoomMenu.svelte)
export const whereYouAre = 'Where you are';
export const containers = 'Containers';
export const folder = 'Folder';
export const openCards = 'Open cards';
export const newCards = 'New cards';
export const bookmarked = 'Bookmarked';
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

// ---- The "⋯" menu's Skin rows (D-100 2: ToolbarMenu.svelte): one per skin, the board's own ticked.
export const skinGroup = 'Skin';
export const skinName = (skin: string): string => (skin === 'command-lens' ? 'Command Lens skin' : 'Default skin');
export const skinTip = 'How this board\'s nodes look, for everyone who opens it';

// ---- The header's flow menu (D-100 5, BE_01: FlowMenu.svelte): Across, Down and Auto for the
// whole board, the person's choice ticked; a container's own choice (its layout control) still wins.
export const directionGroup = 'Flows';
export const directionTitle = (d: string): string => `${directionName(d)}. Change which way this board's flows run`;
export const directionName = (d: string): string => `Flows: ${d === 'across' ? 'Across' : d === 'down' ? 'Down' : 'Auto'}`;
export const directionTip = (d: string): string => (d === 'auto'
  ? 'Each flow runs the way it was drawn, unless you chose for its container'
  : `Every flow on this board runs ${d === 'down' ? 'top to bottom' : 'left to right'}, unless you chose for its container`);
