// Words: region. A container: modes, widths, notes, retired and fresh counts, settings and its answered count.
// Keys: vision-board.region.<name>. Plain code: no imports but other words files and types.

// ---- region-core.ts
export const grid = 'Grid';
export const flow = 'Flow';
export const lanes = 'Lanes';
export const radial = 'Radial';
export const column = 'Column';
export const row = 'Row';
export const aNumberedSetToWork = 'A numbered set to work through in order';
export const connectedStepsAndWhereThey = 'Connected steps and where they branch';
export const severalFlowsSideBySide = 'Several flows side by side, one per lane';
export const oneSubjectEverythingRelatedAround = 'One subject, everything related around it';
export const oneCardUnderAnotherIn = 'One card under another, in card order';
export const oneCardBesideAnotherIn = 'One card beside another, in card order';
export const theAgentChoseForThis = (MODE_LABEL: string): string => `The agent chose ${MODE_LABEL} for this container.`;
export const matchCardWidths = 'Match card widths';
export const match = 'Match';
export const own = 'Own';
export const noCardsMoved = 'No cards moved';
export const notMoved = 'Not moved';
export const unsent = 'Unsent';
export const sentWaitingForTheAgent = 'Sent, waiting for the agent';
export const answered = 'Answered';
export const readOnlyUntilTheAgent = 'Read-only until the agent answers';
export const commentOnContainer = (title: string): string => `Comment on container ${title}`;
export const n1UnsentNote = (base: string): string => `${base}, 1 unsent note`;
export const n1SentNoteWaitingFor = (base: string): string => `${base}, 1 sent note waiting for the agent`;
export const cardRetired = (count: number): string => `${count} card${count === 1 ? '' : 's'} retired`;
export const retired = (count: number): string => `${count} retired`;
export const fromThisContainer = (words: string): string => `${words} from this container`;
export const fromThisContainerShowV = (words: string, version: number, count: number): string =>
  `${words} from this container. Show v${version}, where ${count === 1 ? 'it' : 'they'} last appeared`;
export const ofAnswered = (answered: number, count: number): string => `${answered} of ${count} answered`;

// ---- region-fresh.ts
export const newCards = (k: number): string => `${k} new card${k === 1 ? '' : 's'}`;
export const updatedCards = (k: number): string => `${k} updated card${k === 1 ? '' : 's'}`;
export const newText = (added: number): string => `${added} new`;
export const updated = (updated: number): string => `${updated} updated`;
export const inThisContainer = (long: string): string => `${long} in this container`;

// ---- region-template.ts
export const moveContainer = (title: string): string => `Move container ${title}`;
export const moveContainerAltArrows = 'Move container · Alt+arrows';
export const noteOnContainer = (title: string): string => `Note on container ${title}`;
export const editNoteOnContainer = (title: string): string => `Edit note on container ${title}`;
export const removeNoteOnContainer = (title: string): string => `Remove note on container ${title}`;
export const move = 'move ·';
export const enter = 'Enter';
export const apply = 'apply ·';
export const esc = 'Esc';
export const close = 'close';
export const settingsFor = (esc: string): string => `Settings for ${esc}`;
export const resetPlaces = 'Reset places';
export const putContainerBack = 'Put container back';
export const removeContainer = 'Remove container';
export const everythingHereIsAnswered = 'Everything here is answered.';
export const retired2 = 'retired';
export const createdThisContainer = 'Created this container';
export const removeAccess = (esc: string): string => `${esc}: remove access`;
export const removeAccess2 = 'Remove access';

// ---- region-core.ts
export const cardWidths = (w: string | number): string => `Card widths: ${w}`;

// ---- region-fresh.ts
export const and = ' and ';
