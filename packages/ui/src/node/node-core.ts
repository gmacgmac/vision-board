// Node pattern, layer 1 (core): what a node shows and which actions it offers. No DOM, so
// every rule here is unit-tested under plain Node; the element only applies the result.
import type { ActionId, NodeSize, ParkBundle, ViewNode } from '#format';
import { NODE_TYPES } from '#format';
import type { BoardState, ItemStatus } from '#actions';
import type { CardReply, NotesView } from './node-notes.ts';
import { notesView } from './node-notes.ts';
import type { CardUpdates, UpdatesView } from './node-updates.ts';
import { type AppCardInput, type AppCardView, appView } from './node-app.ts';
import { updatesView, updateWords } from './node-updates.ts';
import { ACTIONS, statusOf } from '#actions';
import * as uiCommonWords from '../words/ui-common.ts';
import * as nodeWords from '../words/node.ts';

/** The footer's word for a status on a card that asks (D-045): ✓ and ✗ have none, since the lit mark
 *  is the state and the board gives it no meaning. A card whose note waits for the agent's answer is
 *  "Replied" (D-046; the person's word, replied-word ruling 1: agents read `with-agent`); an old More
 *  context reads as a note. */
export const STATUS_LABEL: Record<ItemStatus, string> = {
  open: uiCommonWords.open, acknowledged: '', dropped: '', commented: nodeWords.replied, context: nodeWords.replied, later: nodeWords.savedForLater,
};

/** What a card's accessible name says for its status: the footer's word, or the lit mark by name. */
export const STATUS_NAME: Record<ItemStatus, string> = { ...STATUS_LABEL, acknowledged: 'checked', dropped: 'crossed' };

export const isItem = (n: ViewNode): boolean => n.n !== undefined;

/** Whether the card asks for an answer (D-045, answer-model ruling 4): only such a card shows a
 *  status, in its footer and its name. A card that only informs shows none and never counts. */
export const asksAnswer = (n: ViewNode): boolean => isItem(n) && NODE_TYPES[n.kind].answer;

/** Review buttons shown on an item; non-items offer none. */
export const offers = (n: ViewNode): ActionId[] => (isItem(n) ? [...NODE_TYPES[n.kind].actions] : []);

/** Whether an action's button shows as pressed for the current status. */
export const isPressed = (action: ActionId, status: ItemStatus): boolean =>
  ACTIONS[action].status !== undefined && ACTIONS[action].status === status;

/** The accessible name; `selected` adds ", selected" last (3_FE_01 ruling 9, mockup 05), since a
 *  list item can carry no aria-selected and the selection must be perceivable without colour.
 *  `extra` comes before it: what the card's tabs say, such as ", 1 proposal" (FE_01). */
export function nodeLabel(n: ViewNode, status: ItemStatus, selected = false, extra = ''): string {
  const num = isItem(n) ? nodeWords.item(n.n) : '';
  const st = asksAnswer(n) ? `, ${STATUS_NAME[status]}` : '';
  return `${num}${NODE_TYPES[n.kind].label}: ${n.title}${st}${extra}${selected ? nodeWords.selected : ''}`;
}

/** The flag's key (cardFlag flag, field report batch 2 ruling 3): F alone is Fit (commands.ts). */
export const FLAG_KEY = 'Shift+F';

/** The flag button's name: it stays put, and aria-pressed says whether the card is flagged. The
 * flag is the person's private mark, never sent to an agent (api.md 128). */
export const flagLabel = (n: ViewNode): string => nodeWords.flagItem(n.n, FLAG_KEY);

export function buttonLabel(action: ActionId, n: ViewNode): string {
  const def = ACTIONS[action];
  return nodeWords.item2(def.label, n.n, def.key ? ` (${def.key.toUpperCase()})` : '');
}

// A card's notes and the agent's replies (split out, card-polish FE_02): re-exported, so this stays the import.
export * from './node-notes.ts';

/** The size control's state (D-030): the card's tier, whether the person picked it, the trigger's
 *  label, and what the trigger shows in place of the glyph ("◆ S" for a pick, empty otherwise). */
export interface SizeState {
  tier: NodeSize;
  picked: boolean;
  label: string;
  shown: string;
}

export const SIZE_LETTER: Record<NodeSize, string> = { s: 'S', m: 'M', l: 'L' };

export const sizeLabel = (v: { tier: NodeSize; picked: boolean }): string =>
  nodeWords.cardSizeChangeSize(SIZE_LETTER[v.tier], v.picked);

/** One open proposal on a card (D-018, api.md 93), as the page passes it in: found by the conditions
 *  table (`proposal.open`, or `proposal.stale` when the card changed since), worded from the ledger.
 *  `when` is its time in the person's clock; `agent` the proposing agent's label. */
export interface CardProposal {
  seq: number; action: 'ack' | 'drop'; reason: string; source?: string; when: string; agent?: string; stale: boolean;
}

/** What the conditions table says about a card, passed in by the page like the selection. */
export interface CardConditions {
  /** Its open proposals (the proposals flag); none or absent shows no PROPOSAL tab. */
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
  /** The groupNoteOnce flag: the card leaves out notes on a group of cards and the replies to them,
   *  which the group's own pin shows once (`notesView`'s `apart`). */
  groupNotesApart?: boolean;
  /** An app card's app from list_apps (`{}` until it answers; none with the appCards flag off), and whether a past version shows (node-app.ts). */
  app?: AppCardInput;
}

/** One proposal in the box beside the card: who proposes, what, from where and when, and the names
 *  of its Accept and Reject. Out of date, `why` says so and Accept can't be pressed (ruling 3). */
export interface ProposalEntry {
  seq: number; head: string; what: string; from: string; stale: boolean; why?: string; accept: string; reject: string;
}

/** The PROPOSAL tab (OUT OF DATE when every proposal is) and its box, newest first. */
export interface ProposalsView { tab: string; stale: boolean; label: string; box: string; entries: ProposalEntry[] }

/** The tab and box for an item's open proposals; undefined with none. */
export function proposalsView(n: ViewNode, list: readonly CardProposal[] = []): ProposalsView | undefined {
  if (!isItem(n) || !list.length) return undefined;
  const stale = list.every((p) => p.stale);
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
  const k = list.length;
  return {
    tab: stale ? nodeWords.outOfDate2 : nodeWords.proposal, stale, entries,
    label: nodeWords.proposalsOnItem(k, n.n, stale),
    box: nodeWords.proposalsBox(k, n.n),
  };
}

/** What the proposals add to the card's name: ", 2 proposals, 1 out of date". */
function proposalWords(list: readonly CardProposal[]): string {
  const k = list.length;
  const st = list.filter((p) => p.stale).length;
  return k ? nodeWords.proposalsInName(k, st) : '';
}

/** The HANDOVER tab and its box (FE_03 ruling 2): the park bundle's headed sections, then the sources. */
export interface HandoverView {
  tab: string; label: string; box: string;
  sections: { head: string; text: string }[];
  sources: string[];
}

const HANDOVER_HEADS = [
  ['situation', nodeWords.situation], ['background', nodeWords.background], ['assessment', nodeWords.assessment], ['recommendation', nodeWords.recommendation],
] as const;

/** The tab and box for an item's written handover; undefined with none, or while it is still owed
 * (a later "Later" outdates the old bundle until the agent writes a new one). */
export function handoverView(n: ViewNode, bundle?: ParkBundle, awaiting = false): HandoverView | undefined {
  if (!isItem(n) || !bundle || awaiting) return undefined;
  return {
    tab: nodeWords.handover, label: nodeWords.handoverOnItem(n.n), box: nodeWords.handoverOnItem(n.n),
    sections: HANDOVER_HEADS.map(([key, head]) => ({ head, text: bundle[key] })),
    sources: bundle.sources ?? [],
  };
}

/** The footer state word of a card whose handover is owed, and the tip over it (FE_03 ruling 1). */
export const AWAITING = { word: nodeWords.awaiting, tip: nodeWords.awaitingContext } as const;

/** Everything a drawn node shows for the person's current state; `update()` applies it. */
export interface NodeState {
  status: ItemStatus;
  pinned: boolean;
  /** In the person's selection (3_FE_01): view state the page passes in, never a ledger fact. */
  selected: boolean;
  /** The node's accessible name: number, kind, title, (for cards that ask) status, and "selected". */
  label: string;
  /** The status word in the footer, "Open" included; empty for ✓ and ✗ (the lit mark shows it) and
   *  on a card that only informs (D-045). */
  statusWord: string;
  /** The person's notes: the pin and the "Your note" block, put away or not; absent with no notes. */
  notes?: NotesView;
  /** aria-pressed for each offered action. */
  pressed: Partial<Record<ActionId, boolean>>;
  /** The card's size tier and control; absent unless the page passed a tier (the nodeSize flag). */
  size?: SizeState;
  /** The PROPOSAL tab and its box (FE_01); absent with no open proposal. */
  proposal?: ProposalsView;
  /** The "N updates" tab and the stepper (FE_02); absent with nothing unseen. */
  updates?: UpdatesView;
  /** The NEW tab (stage5-follow-ups FE_01): a card the agent added after the person first opened the board. */
  fresh?: true;
  /** The handover is still owed (FE_03): `statusWord` then reads "Awaiting", with `AWAITING.tip` over it. */
  awaiting?: true;
  /** The HANDOVER tab and its box (FE_03); absent until the agent writes it. */
  handover?: HandoverView;
  /** The person flagged the card (`BoardState.flags`, field report batch 2 ruling 3): the flag
   *  button shows pressed and the name says ", flagged". */
  flagged?: true;
  /** The board is locked (`BoardState.locked`, N40 ruling 4): the review buttons, the size control,
   *  the note pin and a proposal's answers are paused (paused.ts); the flag is not. */
  paused?: true;
  app?: AppCardView; // an app card's state view (node-app.ts `appView`); it takes no size control
}

/** `tier` comes from the page (`sizeTier` in packages/layout, which this layer may not import), and
 *  so do `selected` (the page's selection module, 3_FE_01) and `c` (the conditions table, FE_01). */
export function nodeState(n: ViewNode, s: BoardState, tier?: NodeSize, selected = false, c: CardConditions = {}): NodeState {
  const status = statusOf(s, n.id);
  const pressed: Partial<Record<ActionId, boolean>> = {};
  for (const a of offers(n)) pressed[a] = isPressed(a, status);
  const notes = notesView(n, s.items.get(n.id)?.notes ?? [], c.replies, s.notesHidden?.get(n.id), c.groupNotesApart);
  const awaiting = isItem(n) && c.awaiting === true;
  const handover = handoverView(n, c.handover, awaiting);
  const picked = s.sizes.has(n.id);
  const proposal = proposalsView(n, c.proposals);
  const updates = updatesView(n, c.updates);
  const fresh = isItem(n) && c.new === true;
  const flagged = isItem(n) && s.flags.has(n.id);
  const app = n.kind === 'app' && c.app ? appView(n, c.app) : undefined;
  return {
    status,
    pinned: s.pins.has(n.id),
    selected,
    label: nodeLabel(n, status, selected,
      `${awaiting ? nodeWords.awaitingContext2 : ''}${handover ? nodeWords.handoverReady : ''}${proposal ? proposalWords(c.proposals!) : ''}${updateWords(updates)}${app?.words ?? ''}${fresh ? nodeWords.freshInName : ''}${flagged ? nodeWords.flaggedInName : ''}`),
    statusWord: awaiting ? AWAITING.word : asksAnswer(n) ? STATUS_LABEL[status] : '',
    ...(awaiting && { awaiting: true as const }),
    ...(notes && { notes }), ...(proposal && { proposal }), ...(updates && { updates }), ...(fresh && { fresh: true as const }), ...(handover && { handover }),
    ...(flagged && { flagged: true as const }), ...(s.locked && { paused: true as const }), ...(app && { app }),
    pressed,
    ...(tier && n.kind !== 'app' ? { size: { tier, picked, label: sizeLabel({ tier, picked }), shown: picked ? `◆ ${SIZE_LETTER[tier]}` : '' } } : {}),
  };
}
