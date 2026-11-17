// Words: node. A card: state labels, accessible names, proposals, handover, history, times and the buttons on it.
// Keys: vision-board.node.<name>. Plain code: no imports but other words files and types.

// ---- node-core.ts
export const replied = 'Replied';
export const savedForLater = 'Saved for later';
export const item = (n: number | undefined): string => `Item ${n}, `;
export const item2 = (label: string, n: number | undefined, key: string): string => `${label} item ${n}${key}`;
export const theAgent = 'The agent';
export const proposedOutOfDate = (who: string): string => `${who} proposed · out of date`;
export const proposes = (who: string): string => `${who} proposes`;
export const changedAfterThisWasProposed = (n: number | undefined): string => `${n} changed after this was proposed. Ask the agent to look again.`;
export const reject = (verb: string): string => `Reject: ${verb}`;
export const outOfDate2 = 'Out of date';
export const proposal = 'Proposal';
export const situation = 'Situation';
export const background = 'Background';
export const assessment = 'Assessment';
export const recommendation = 'Recommendation';
export const handover = 'Handover';
export const handoverOnItem = (n: number | undefined): string => `Handover on item ${n}`;
export const awaiting = 'Awaiting';
export const awaitingContext = 'Awaiting context';
export const awaitingContext2 = ', awaiting context';
export const handoverReady = ', handover ready';

// ---- node-history.ts
export const nothingHasHappenedToThis = 'Nothing has happened to this card yet';
export const card = (n: number | undefined): string => `card ${n}`;
export const card2 = (title: string): string => `card: ${title}`;
export const historyOf = (cardName: string): string => `History of ${cardName}`;
export const cardHistory = (n: number | undefined): string => `Card ${n} history`;
export const history = (title: string): string => `${title}: history`;
export const history2 = 'History';
/** The history box beside a node (nodeEdges, FE_03 run 2): its head and its ×. */
export const historyOfN = (n: number | string | undefined): string => `History of ${n}`;
export const closeHistory = 'Close history';

// ---- node-template.ts
export const movedByYou = 'Moved by you';
export const show = 'Show';
export const respond = 'Respond';
export const allow = 'Allow';
export const allowed = 'Allowed';
export const stopApp = 'Stop app';
export const back = 'Back';
export const next = 'Next';
export const youReUpToDate = 'You\'re up to date';
export const changes = 'Changes';
export const newBadge = 'NEW';
export const reject2 = 'Reject';
export const accept = 'Accept';
export const sources = 'Sources';
export const sizeOf = (esc: string): string => `Size of ${esc}`;
export const automaticSize = 'Automatic size';
export const auto = 'Auto';
export const problems = 'Problems';

// ---- node-time.ts
export const today = (clock: string): string => `Today ${clock}`;
export const yesterday = (clock: string): string => `Yesterday ${clock}`;

// ---- node-core.ts
export const cardSizeChangeSize = (letter: string | number, picked: boolean): string => `Card size: ${letter}, ${picked ? 'your pick' : 'automatic'}. Change size`;
export const acceptVerb = (verb: string, stale: boolean): string => `Accept: ${verb}${stale ? ' (out of date)' : ''}`;
export const selected = ', selected';
export const freshInName = ', new';
export const bookmarkedInName = ', bookmarked';

// ---- The proposals tab, box and name. Plural and branch logic lives here, not in the card.
/** The tab's accessible name: "Proposal on item 3", "2 proposals on item 3, out of date". */
export const proposalsOnItem = (k: number, n: number | undefined, stale: boolean): string =>
  `${k === 1 ? 'Proposal' : `${k} proposals`} on item ${n}${stale ? ', out of date' : ''}`;
/** The box's accessible name: "Proposal on item 3", "Proposals on item 3". */
export const proposalsBox = (k: number, n: number | undefined): string => `${k === 1 ? 'Proposal' : 'Proposals'} on item ${n}`;
/** What the proposals add to the card's name: ", 2 proposals, 1 out of date". */
export const proposalsInName = (k: number, stale: number): string =>
  `, ${k} proposal${k > 1 ? 's' : ''}${stale ? `, ${stale === k ? '' : `${stale} `}out of date` : ''}`;

// ---- One tab for updates and proposals (oneChangeTab flag, point 444). `updates` is the updates tab's own words ("1 update").
/** The tab: "1 update · proposal", "2 updates · 2 proposals", "1 update · out of date" when every proposal is. */
export const updatesAndProposalsTab = (updates: string, k: number, stale: boolean): string =>
  `${updates} · ${stale ? 'out of date' : k === 1 ? 'proposal' : `${k} proposals`}`;
/** The tab's and the box's accessible name: "1 update and a proposal on item 3", "2 updates and 2 proposals on item 3, out of date". */
export const updatesAndProposalsOnItem = (updates: string, k: number, n: number | undefined, stale: boolean): string =>
  `${updates} and ${k === 1 ? 'a proposal' : `${k} proposals`} on item ${n}${stale ? ', out of date' : ''}`;

// ---- node-marks.ts: the marks on the node's edges (D-099; nodeEdges flag). The keys ride in the names, as the menus show them.
/** The number, a toggle whose name stays put; aria-pressed says whether the node is bookmarked. */
export const bookmarkItem = (n: number | undefined, key: string): string => `Bookmark item ${n} (${key})`;
export const answerWaiting = 'waiting for your answer';
export const answerTicked = 'ticked';
export const answerCrossed = 'crossed';
/** The answer disc: "Answer item 35, waiting for your answer (A tick, X cross)". */
export const answerItem = (n: number | undefined, state: string, tick: string, cross: string): string =>
  `Answer item ${n}, ${state} (${tick} tick, ${cross} cross)`;
/** What a proposal on the disc adds to its name. */
export const proposedTick = ', the agent proposes tick';
export const proposedCross = ', the agent proposes cross';
/** A half of the Tick | Cross switch (a skin whose answer is the switch): a toggle whose name stays put; aria-pressed
 *  says whether it is lit, and pressing the lit half clears it. "Tick item 35 (A)". */
export const halfItem = (word: string, n: number | undefined, key: string): string => `${word} item ${n} (${key})`;
/** The plate's chip for an open proposal (a switch skin; its word is `proposal`): it opens the proposal box. */
export const proposalItem = (n: number | undefined, offer: string): string => `Proposal on item ${n}${offer}`;
export const proposalTip = 'Proposal · open it';
export const badgeNew = 'New';
export const badgeSettled = (ver: number): string => `v${ver}`;
/** The change badge: "2 updates, history of item 4 (H)". */
export const badgeItem = (text: string, n: number | undefined, key: string): string => `${text}, history of item ${n} (${key})`;
/** The notes mark: "No notes on item 4", "3 notes on item 4, agent replied". */
export const notesOnItem = (k: number, n: number | undefined, unread: boolean, key: string): string =>
  `${k === 0 ? 'No notes' : `${k} note${k === 1 ? '' : 's'}`} on item ${n}${unread ? ', agent replied' : ''} (${key})`;
/** A count past what the mark holds. */
export const manyNotes = '99+';
/** The tip over the quiet Awaiting tab on the bottom edge. */
export const awaitingTip = 'The handover is still owed';
/** The tips over a mark (shown after a deliberate hover, at once on keyboard focus). */
export const bookmarkTip = (key: string): string => `Bookmark · ${key}`;
export const answerTip = (tick: string, cross: string): string => `Tick · ${tick}  Cross · ${cross}`;
export const historyTip = (key: string): string => `History · ${key}`;
export const halfTip = (word: string, key: string): string => `${word} · ${key}`;
export const notesTip = (key: string): string => `Notes · ${key}`;
/** A write the person made that did not save, beside the mark it was on. */
export const tickNotSaved = 'Tick not saved. Press to try again.';
export const crossNotSaved = 'Cross not saved. Press to try again.';
/** A press on a locked board or a read-only ledger, beside the mark pressed. */
export const boardIsLocked = 'Board is locked';
export const ledgerIsReadOnly = 'This ledger is read-only';

// ---- node-menus.ts: the number menu, the answer picker and the right-click list (fixed-size menus, D-101).
export const tick = 'Tick';
export const cross = 'Cross';
export const comment = 'Comment';
export const bookmark = 'Bookmark';
export const removeBookmark = 'Remove bookmark';
export const saveForLater = 'Save for later';
export const bringBack = 'Bring back';
export const putBack = 'Moved by you · Put back';
export const numberMenu = (n: number | undefined): string => `Item ${n}`;
export const answerPicker = (n: number | undefined): string => `Answer item ${n}`;
export const actionsOn = (n: number | undefined): string => `Actions on item ${n}`;
