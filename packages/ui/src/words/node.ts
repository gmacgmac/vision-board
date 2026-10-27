// Words: node. A card: state labels, accessible names, proposals, handover, history, times and the buttons on it.
// Keys: board.node.<name>. Plain code: no imports but other words files and types.

// ---- node-core.ts
export const replied = 'Replied';
export const savedForLater = 'Saved for later';
export const item = (n: number | undefined): string => `Item ${n}, `;
export const flagItem = (n: number | undefined, FLAG_KEY: string): string => `Flag item ${n} (${FLAG_KEY})`;
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

// ---- node-template.ts
export const movedByYou = 'Moved by you';
export const show = 'Show';
export const flag = (FLAG_KEY: string): string => `Flag · ${FLAG_KEY}`;
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
export const flaggedInName = ', flagged';

// ---- The proposals tab, box and name. Plural and branch logic lives here, not in the card.
/** The tab's accessible name: "Proposal on item 3", "2 proposals on item 3, out of date". */
export const proposalsOnItem = (k: number, n: number | undefined, stale: boolean): string =>
  `${k === 1 ? 'Proposal' : `${k} proposals`} on item ${n}${stale ? ', out of date' : ''}`;
/** The box's accessible name: "Proposal on item 3", "Proposals on item 3". */
export const proposalsBox = (k: number, n: number | undefined): string => `${k === 1 ? 'Proposal' : 'Proposals'} on item ${n}`;
/** What the proposals add to the card's name: ", 2 proposals, 1 out of date". */
export const proposalsInName = (k: number, stale: number): string =>
  `, ${k} proposal${k > 1 ? 's' : ''}${stale ? `, ${stale === k ? '' : `${stale} `}out of date` : ''}`;
