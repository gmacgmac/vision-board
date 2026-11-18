// Words: node. A node: accessible names, its marks, proposals, handover, history, times and an app window's buttons.
// Keys: vision-board.node.<name>. Plain code: no imports but other words files and types.

// ---- node-core.ts
export const replied = 'Replied';
export const savedForLater = 'Saved for later';
export const item = (n: number | undefined): string => `Item ${n}, `;
export const theAgent = 'The agent';
export const proposedOutOfDate = (who: string): string => `${who} proposed · out of date`;
export const proposes = (who: string): string => `${who} proposes`;
export const changedAfterThisWasProposed = (n: number | undefined): string => `${n} changed after this was proposed. Ask the agent to look again.`;
export const reject = (verb: string): string => `Reject: ${verb}`;
export const proposal = 'Proposal';
export const situation = 'Situation';
export const background = 'Background';
export const assessment = 'Assessment';
export const recommendation = 'Recommendation';
export const handover = 'Handover';
export const awaiting = 'Awaiting';
export const awaitingContext2 = ', awaiting context';
export const handoverReady = ', handover ready';

// ---- node-history.ts
export const nothingHasHappenedToThis = 'Nothing has happened to this card yet';
export const cardHistory = (n: number | undefined): string => `Card ${n} history`;
export const history = (title: string): string => `${title}: history`;
export const history2 = 'History';
/** The history box beside a node (FE_03 run 2): its head and its ×. */
export const historyOfN = (n: number | string | undefined): string => `History of ${n}`;
export const closeHistory = 'Close history';

// ---- node-template.ts
export const allow = 'Allow';
export const allowed = 'Allowed';
export const stopApp = 'Stop app';
export const back = 'Back';
export const next = 'Next';
export const youReUpToDate = 'You\'re up to date';
export const changes = 'Changes';
export const reject2 = 'Reject';
export const accept = 'Accept';
export const sources = 'Sources';
export const auto = 'Auto';
export const problems = 'Problems';

// ---- node-time.ts
export const today = (clock: string): string => `Today ${clock}`;
export const yesterday = (clock: string): string => `Yesterday ${clock}`;

// ---- node-core.ts
export const acceptVerb = (verb: string, stale: boolean): string => `Accept: ${verb}${stale ? ' (out of date)' : ''}`;
export const selected = ', selected';
export const freshInName = ', new';
export const bookmarkedInName = ', bookmarked';

// ---- The proposals box and name. Plural and branch logic lives here, not in the card.
/** The box's accessible name: "Proposal on item 3", "Proposals on item 3". */
export const proposalsBox = (k: number, n: number | undefined): string => `${k === 1 ? 'Proposal' : 'Proposals'} on item ${n}`;
/** What the proposals add to the card's name: ", 2 proposals, 1 out of date". */
export const proposalsInName = (k: number, stale: number): string =>
  `, ${k} proposal${k > 1 ? 's' : ''}${stale ? `, ${stale === k ? '' : `${stale} `}out of date` : ''}`;

// ---- node-marks.ts: the marks on the node's edges (D-099). The keys ride in the names, as the menus show them.
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

// ---- node-date.ts: a dated node's header (D-105 4): short on the node (upper case by CSS, so it reads naturally),
// the full date for assistive technology. Times as written, with no zone (decision 3).
export const monthsShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;
export const monthsLong = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'] as const;
/** A month: "Oct 2026", "October 2026". */
export const dateMonth = (month: string, year: string): string => `${month} ${year}`;
/** A day on the node, with no year (the year is on the line): "Oct 13". */
export const dateDay = (month: string, day: string): string => `${month} ${day}`;
/** A day in full: "13 October 2026". */
export const dateDayFull = (day: string, month: string, year: string): string => `${day} ${month} ${year}`;
/** A time on the node: "Oct 13 · 14:30". */
export const dateTime = (day: string, time: string): string => `${day} · ${time}`;
/** A time in full: "13 October 2026, 14:30". */
export const dateTimeFull = (day: string, time: string): string => `${day}, ${time}`;
