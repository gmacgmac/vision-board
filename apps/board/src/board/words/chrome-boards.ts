// Words: chrome-boards. The board picker, rename, archive, lock and the archived list.
// Keys: vision-board.chrome-boards.<name>. Plain code: no imports but other words files and types.

// ---- ArchivedList.svelte
export const archivedBoards = 'Archived boards';
export const agentsDonTSeeThese = 'Agents don\'t see these boards. Restore one to bring it back and open it.';
export const lastUpdated = (dayOf: string | number): string => `Last updated ${dayOf}`;
export const restoring = (title: string | number): string => `Restoring ${title}`;
export const restore = (title: string | number): string => `Restore ${title}`;
export const restoring2 = 'Restoring…';
export const restore2 = 'Restore';
export const noArchivedBoards = 'No archived boards.';
export const close = 'Close';

// ---- BoardAgents.svelte
export const agentsWhoCanDrawOn = 'Agents who can draw on this board';
export const agents = 'Agents';
export const canDrawOnThisBoard = 'Can draw on this board';
export const madeThisBoard = 'made this board';
export const removeSAccessToThis = (label: string | number): string => `Remove ${label}'s access to this board`;

// ---- BoardDialog.svelte
export const theNewTitleShowsIn = 'The new title shows in the picker and to every agent that reads this board.';
export const oneBoardPerTopicAn = 'One board per topic. An agent asks you before it draws on a board you made.';
export const title = 'Title';
export const typeATitle = 'Type a title';
export const summary = 'Summary';
export const optional = 'optional';
export const renaming = 'Renaming…';
export const rename = 'Rename';
