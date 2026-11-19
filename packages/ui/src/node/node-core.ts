// Node pattern, layer 1 (core): what a node shows and which actions it offers. No DOM, so
// every rule here is unit-tested under plain Node; the element only applies the result.
import type { ActionId, NodeSize, ParkBundle, ViewNode } from '#format';
import { NODE_TYPES } from '#format';
import type { BoardState, ItemStatus, ProposalRow } from '#actions';
import type { CardReply } from './node-notes.ts';
import { litReplies } from './node-notes.ts';
import type { CardUpdates, UpdatesView } from './node-updates.ts';
import { type AppCardInput, type AppCardView, appView } from './node-app.ts';
import { updatesView, updateWords } from './node-updates.ts';
import type { NodeMarks } from './node-marks.ts';
import { nodeMarks } from './node-marks.ts';
import { ACTIONS, statusOf } from '#actions';
import * as uiCommonWords from '../words/ui-common.ts';
import * as nodeWords from '../words/node.ts';
import { datedOf, timelineLabel } from './node-date.ts';

/** What a card's accessible name says for its status (D-045): the answer by name, or the status's word. A card whose
 *  note waits for the agent's answer is "Replied" (D-046; the person's word, replied-word ruling 1: agents read
 *  `with-agent`); an old More context reads as a note. */
export const STATUS_NAME: Record<ItemStatus, string> = {
  open: uiCommonWords.open, acknowledged: 'checked', dropped: 'crossed', commented: nodeWords.replied, context: nodeWords.replied, later: nodeWords.savedForLater,
};

export const isItem = (n: ViewNode): boolean => n.n !== undefined;

/** Whether the card asks for an answer (D-045, answer-model ruling 4): only such a card shows a
 *  status, on its answer mark and in its name. A card that only informs shows none and never counts. */
export const asksAnswer = (n: ViewNode): boolean => isItem(n) && NODE_TYPES[n.kind].answer;

/** The review actions an item offers (its kind's, `NODE_TYPES`); non-items offer none. */
export const offers = (n: ViewNode): ActionId[] => (isItem(n) ? [...NODE_TYPES[n.kind].actions] : []);

/** Whether an action is the current status (its answer is lit). */
export const isPressed = (action: ActionId, status: ItemStatus): boolean =>
  ACTIONS[action].status !== undefined && ACTIONS[action].status === status;

/** The accessible name; `selected` adds ", selected" last (3_FE_01 ruling 9, mockup 05), since a
 *  list item can carry no aria-selected and the selection must be perceivable without colour.
 *  `extra` comes before it: what the card's tabs say, such as ", 1 proposal" (FE_01). A dated card's full date
 *  follows its kind (FIX_02 S3), so moving card to card a screen reader hears what the eye reads first. */
export function nodeLabel(n: ViewNode, status: ItemStatus, selected = false, extra = ''): string {
  const num = isItem(n) ? nodeWords.item(n.n) : '';
  const dated = datedOf(n);
  const date = dated ? nodeWords.dateInName(timelineLabel(dated).full) : '';
  const st = asksAnswer(n) ? `, ${STATUS_NAME[status]}` : '';
  return `${num}${NODE_TYPES[n.kind].label}${date}: ${n.title}${st}${extra}${selected ? nodeWords.selected : ''}`;
}

// A card's notes and the agent's replies (split out, card-polish FE_02): re-exported, so this stays the import.
export * from './node-notes.ts';

/** The node's width (D-030): its tier, and whether the person picked it (the selection bar's Width, D-099 3). */
export interface SizeState {
  tier: NodeSize;
  picked: boolean;
}

/** One open proposal on a card (D-018, api.md 93), as the page passes it in: found by the conditions
 *  table (`proposal.open`, or `proposal.stale` when the card changed since), worded from the ledger.
 *  `when` is its time in the person's clock; `agent` the proposing agent's label. The page's
 *  `ProposalRow` (#actions) without the card's number: the card is the one it is passed in. */
export type CardProposal = Omit<ProposalRow, 'n'>;

/** What the conditions table says about a card, passed in by the page like the selection. */
export interface CardConditions {
  /** Its open proposals (the proposals flag); none or absent, the disc carries no proposal. */
  proposals?: readonly CardProposal[];
  /** The versions the person has not seen and the stepper (the cardUpdates flag, FE_02). */
  updates?: CardUpdates;
  /** The agent added the card in the board's latest round and the person has not seen it (`item.new`, the newCards flag). */
  new?: boolean;
  /** The handover is still owed on a card in Later (`item.awaiting`, the handover flag, FE_03). */
  awaiting?: boolean;
  /** The agent's handover for the card, once written (the handover flag). */
  handover?: ParkBundle;
  /** The agent's replies that belong on the card (the cardReplies flag). */
  replies?: readonly CardReply[];
  /** The node's latest version: the change badge settles to a quiet "vN" once seen, from v2. */
  ver?: number;
  /** An app card's app from list_apps (`{}` until it answers; none with the appCards flag off), and whether a past version shows (node-app.ts). */
  app?: AppCardInput;
}

/** One proposal in the box beside the card: who proposes, what, from where and when, and the names
 *  of its Accept and Reject. Out of date, `why` says so and Accept can't be pressed (ruling 3). */
export interface ProposalEntry {
  seq: number; head: string; what: string; from: string; stale: boolean; why?: string; accept: string; reject: string;
}

/** The proposal box's name and its proposals, newest first. */
export interface ProposalsView { box: string; entries: ProposalEntry[] }

/** The box for an item's open proposals; undefined with none. */
export function proposalsView(n: ViewNode, list: readonly CardProposal[] = []): ProposalsView | undefined {
  if (!isItem(n) || !list.length) return undefined;
  const entries = [...list].sort((a, b) => b.seq - a.seq).map((p): ProposalEntry => {
    const verb = `${ACTIONS[p.action].label.toLowerCase()} ${n.n}`;
    const who = p.agent ?? nodeWords.theAgent;
    return {
      seq: p.seq, stale: p.stale, what: `${ACTIONS[p.action].label} ${n.n}: ${p.reason}`,
      head: p.stale ? nodeWords.proposedOutOfDate(who) : nodeWords.proposes(who),
      from: [p.source, p.when].filter(Boolean).join(' · '),
      ...(p.stale && { why: nodeWords.changedAfterThisWasProposed(n.n) }),
      accept: nodeWords.acceptVerb(verb, p.stale), reject: nodeWords.reject(verb),
    };
  });
  return { entries, box: nodeWords.proposalsBox(list.length, n.n) };
}

/** What the proposals add to the card's name: ", 2 proposals, 1 out of date". */
function proposalWords(list: readonly CardProposal[]): string {
  const k = list.length;
  const st = list.filter((p) => p.stale).length;
  return k ? nodeWords.proposalsInName(k, st) : '';
}

/** The handover, a section of the node's body (FE_03 ruling 2, DESIGN_01): its heading, the park bundle's headed
 *  sections, then the sources. */
export interface HandoverView {
  tab: string;
  sections: { head: string; text: string }[];
  sources: string[];
}

const HANDOVER_HEADS = [
  ['situation', nodeWords.situation], ['background', nodeWords.background], ['assessment', nodeWords.assessment], ['recommendation', nodeWords.recommendation],
] as const;

/** The section for an item's written handover; undefined with none, or while it is still owed
 * (a later "Later" outdates the old bundle until the agent writes a new one). */
export function handoverView(n: ViewNode, bundle?: ParkBundle, awaiting = false): HandoverView | undefined {
  if (!isItem(n) || !bundle || awaiting) return undefined;
  return {
    tab: nodeWords.handover,
    sections: HANDOVER_HEADS.map(([key, head]) => ({ head, text: bundle[key] })),
    sources: bundle.sources ?? [],
  };
}

/** Everything a drawn node shows for the person's current state; `update()` applies it. */
export interface NodeState {
  status: ItemStatus;
  pinned: boolean;
  /** In the person's selection (3_FE_01): view state the page passes in, never a ledger fact. */
  selected: boolean;
  /** The node's accessible name: number, kind, title, (for cards that ask) status, and "selected". */
  label: string;
  /** The card's width tier; absent unless the page passed a tier (the nodeSize flag). */
  size?: SizeState;
  /** The proposal box (FE_01); absent with no open proposal. */
  proposal?: ProposalsView;
  /** The steps in the history box (FE_02); absent with nothing unseen. */
  updates?: UpdatesView;
  /** The handover section (FE_03); absent until the agent writes it. */
  handover?: HandoverView;
  /** The person bookmarked the card (`BoardState.bookmarks`, D-099 2): the number shows it and the name says
   *  ", bookmarked". */
  bookmarked?: true;
  /** The board is locked (`BoardState.locked`, N40 ruling 4), or its ledger read-only (`BoardState.readOnly`, D-085):
   *  the answer and a proposal's answers are paused (paused.ts); the bookmark is not. */
  paused?: true;
  /** The ledger is read-only (`BoardState.readOnly`, D-085 3): the bookmark is paused too, since read-only writes no bookmark. */
  readOnly?: true;
  app?: AppCardView; // an app card's state view (node-app.ts `appView`); it takes no size control
  /** What the marks on the node's edges show (D-099; node-marks.ts). */
  marks: NodeMarks;
}

/** `tier` comes from the page (`sizeTier` in packages/layout, which this layer may not import), and
 *  so do `selected` (the page's selection module, 3_FE_01) and `c` (the conditions table, FE_01). */
export function nodeState(n: ViewNode, s: BoardState, tier?: NodeSize, selected = false, c: CardConditions = {}): NodeState {
  const status = statusOf(s, n.id);
  const awaiting = isItem(n) && c.awaiting === true;
  const handover = handoverView(n, c.handover, awaiting);
  const picked = s.sizes.has(n.id);
  const updates = updatesView(n, c.updates);
  const proposal = proposalsView(n, c.proposals);
  const fresh = isItem(n) && c.new === true;
  const bookmarked = isItem(n) && s.bookmarks.has(n.id);
  const app = n.kind === 'app' && c.app ? appView(n, c.app) : undefined;
  const replies = litReplies(c.replies, c.new === true || (!!updates && !updates.done));
  const open = c.proposals?.filter((p) => !p.stale).sort((a, b) => b.seq - a.seq)[0]?.action;
  const marks = nodeMarks(n, {
    status, notes: s.items.get(n.id)?.notes ?? [], ...(replies && { replies }), bookmarked, fresh, ...(updates && { updates }),
    ...(c.ver !== undefined && { ver: c.ver }), ...((open === 'ack' || open === 'drop') && { proposed: open }), awaiting,
  });
  return {
    status,
    pinned: s.pins.has(n.id),
    selected,
    label: nodeLabel(n, status, selected,
      `${awaiting ? nodeWords.awaitingContext2 : ''}${handover ? nodeWords.handoverReady : ''}${proposal ? proposalWords(c.proposals!) : ''}${updateWords(updates)}${app?.words ?? ''}${fresh ? nodeWords.freshInName : ''}${bookmarked ? nodeWords.bookmarkedInName : ''}`),
    ...(proposal && { proposal }), ...(updates && { updates }), ...(handover && { handover }),
    ...(bookmarked && { bookmarked: true as const }), ...((s.locked || s.readOnly) && { paused: true as const }),
    ...(s.readOnly && { readOnly: true as const }), ...(app && { app }),
    marks,
    ...(tier && n.kind !== 'app' ? { size: { tier, picked } } : {}),
  };
}
