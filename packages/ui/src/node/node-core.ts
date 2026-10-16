// Node pattern, layer 1 (core): what a node shows and which actions it offers. No DOM, so
// every rule here is unit-tested under plain Node; the element only applies the result.
import type { ActionId, NodeSize, ParkBundle, ViewNode } from '../../../format/src/index.ts';
import { NODE_TYPES } from '../../../format/src/index.ts';
import type { BoardState, ItemNote, ItemStatus } from '../../../actions/src/index.ts';
import type { CardUpdates, UpdatesView } from './node-updates.ts';
import { updatesView, updateWords } from './node-updates.ts';
import { ACTIONS, statusOf } from '../../../actions/src/index.ts';

/** The footer's word for a status on a card that asks (D-045): ✓ and ✗ have none, since the lit mark
 *  is the state and the board gives it no meaning. A card whose note waits for the agent's answer is
 *  "With agent" (D-046); an old More context reads as a note. */
export const STATUS_LABEL: Record<ItemStatus, string> = {
  open: 'Open', acknowledged: '', dropped: '', commented: 'With agent', context: 'With agent', later: 'Saved for later',
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
  const num = isItem(n) ? `Item ${n.n}, ` : '';
  const st = asksAnswer(n) ? `, ${STATUS_NAME[status]}` : '';
  return `${num}${NODE_TYPES[n.kind].label}: ${n.title}${st}${extra}${selected ? ', selected' : ''}`;
}

/** The flag's key (cardFlag flag, field report batch 2 ruling 3): F alone is Fit (commands.ts). */
export const FLAG_KEY = 'Shift+F';

/** The flag button's name: it stays put, and aria-pressed says whether the card is flagged. The
 * flag is the person's private mark, never sent to an agent (api.md 128). */
export const flagLabel = (n: ViewNode): string => `Flag item ${n.n} (${FLAG_KEY})`;

export function buttonLabel(action: ActionId, n: ViewNode): string {
  const def = ACTIONS[action];
  return `${def.label} item ${n.n}${def.key ? ` (${def.key.toUpperCase()})` : ''}`;
}

/** One of the agent's replies under a note, read-only (FE_03 ruling 3). `who` is "Agent reply · label". */
export interface ReplyEntry { seq: number; who: string; text: string }

/** One of the person's notes in the card's "Your note" block (2e_FE_01 ruling 7), with the agent's
 * replies to it, oldest first. `index` is its pin number: its place among the card's notes, in the
 * order they were made. */
export interface NoteEntry { seq: number; index: number; who: string; text: string; sent: boolean; replies?: ReplyEntry[] }

/** A reply that names no note of the card: it takes its place by time (`seq`) among the notes
 * (review-polish decision 8), read-only like any reply. */
export interface OrphanEntry extends ReplyEntry { orphan: true }

/** One entry of a card's conversation: a note with its replies under it, or an orphan reply. */
export type NotesEntry = NoteEntry | OrphanEntry;

export const isNoteEntry = (e: NotesEntry): e is NoteEntry => !('orphan' in e);

/** The card's notes: the numbered pin on its top-right corner (the latest note, the one a press
 * of C or M or a click opens) and the block in its body, with "N notes" over it when there are
 * several. `entries` is the card's whole conversation in chat order, oldest first, top to bottom
 * (review-polish ruling 8): each note then its replies oldest first, an orphan reply by its `seq`
 * among the notes, so a new note is last. Every reader lists it as it is and never sorts again.
 * With only orphans the block shows and there is no pin. A note with no reply carries no `replies`. */
export interface NotesView {
  count?: string;
  entries: NotesEntry[];
  pin?: { seq: number; index: number; sent: boolean; label: string };
}

/** An agent's reply as the page passes it in (cardReplies flag): its `seq`, `to` (the `seq` of the
 * note it answers, if it names one), the label of the agent that wrote it and its words. */
export interface CardReply { seq: number; to?: number; agent?: string; text: string }

/** An old More context reads as a note everywhere (D-045). */
const KIND_WORD: Record<ItemNote['kind'], string> = { comment: 'Your note', context: 'Your note' };

export const replyEntry = (r: CardReply): ReplyEntry => ({ seq: r.seq, who: `Agent reply${r.agent ? ` · ${r.agent}` : ''}`, text: r.text });

/** A list of notes and the agent's replies as one conversation, oldest first, top to bottom
 * (review-polish ruling 8 and decision 8): each note then its replies by `seq`, a reply naming none
 * of the notes (an orphan) by its `seq` among them. The card's block and pin read it through
 * `notesView`; the conversation window reads it for a card or a whole container (ruling 6). */
export function conversation(notes: readonly ItemNote[], replies: readonly CardReply[]): NotesEntry[] {
  const mine = new Set(notes.map((x) => x.seq));
  const byTime = [...replies].sort((a, b) => a.seq - b.seq);
  const orphans = byTime.filter((r) => r.to === undefined || !mine.has(r.to)).map((r): OrphanEntry => ({ ...replyEntry(r), orphan: true }));
  const entries: NotesEntry[] = [];
  let o = 0;
  notes.forEach((x, i) => {
    for (; o < orphans.length && orphans[o]!.seq < x.seq; o += 1) entries.push(orphans[o]!);
    const answers = byTime.filter((r) => r.to === x.seq).map(replyEntry);
    // History once sent or answered (`locked`, popovers-larger-thread ruling 5): grey and read-only.
    const past = x.sent ? ' · Sent' : x.locked ? ' · Answered' : '';
    entries.push({
      seq: x.seq, index: i + 1, sent: x.locked === true || x.sent === true, text: x.text,
      who: `${KIND_WORD[x.kind]} ${i + 1}${x.nodes ? ` · ${x.nodes.length} cards` : ''}${past}`,
      ...(answers.length && { replies: answers }),
    });
  });
  entries.push(...orphans.slice(o));
  return entries;
}

/** The block and pin for an item's notes and the replies to them; undefined with neither. */
export function notesView(n: ViewNode, notes: readonly ItemNote[], replies: readonly CardReply[] = []): NotesView | undefined {
  const entries = conversation(notes, replies);
  if (!entries.length) return undefined;
  const out: NotesView = { ...(notes.length > 1 && { count: `${notes.length} notes` }), entries };
  const made = notes.at(-1);
  if (!made) return out;
  // The pin is the latest note (ruling 8); a note on a group of cards (3_FE_02) names every item it is on.
  const sent = made.locked === true || made.sent === true;
  const on = made.nodes ? `items ${made.nodes.join(', ')}` : `item ${n.n}`;
  const label = sent ? `Note ${notes.length} on ${on}, ${made.sent ? 'sent' : 'answered'}. Show it` : `Note ${notes.length} on ${on}. Edit it`;
  return { ...out, pin: { seq: made.seq, index: notes.length, sent, label } };
}

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
  `Card size: ${SIZE_LETTER[v.tier]}, ${v.picked ? 'your pick' : 'automatic'}. Change size`;

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
    const who = p.agent ?? 'The agent';
    return {
      seq: p.seq, stale: p.stale, what: `${ACTIONS[p.action].label} ${n.n}: ${p.reason}`,
      head: p.stale ? `${who} proposed · out of date` : `${who} proposes`,
      from: [p.source, p.when].filter(Boolean).join(' · '),
      ...(p.stale && { why: `${n.n} changed after this was proposed. Ask the agent to look again.` }),
      accept: `Accept: ${verb}${p.stale ? ' (out of date)' : ''}`, reject: `Reject: ${verb}`,
    };
  });
  const k = list.length;
  return {
    tab: stale ? 'Out of date' : 'Proposal', stale, entries,
    label: `${k === 1 ? 'Proposal' : `${k} proposals`} on item ${n.n}${stale ? ', out of date' : ''}`,
    box: `${k === 1 ? 'Proposal' : 'Proposals'} on item ${n.n}`,
  };
}

/** What the proposals add to the card's name: ", 2 proposals, 1 out of date". */
function proposalWords(list: readonly CardProposal[]): string {
  const k = list.length;
  const st = list.filter((p) => p.stale).length;
  return k ? `, ${k} proposal${k > 1 ? 's' : ''}${st ? `, ${st === k ? '' : `${st} `}out of date` : ''}` : '';
}

/** The HANDOVER tab and its box (FE_03 ruling 2): the park bundle's headed sections, then the sources. */
export interface HandoverView {
  tab: string; label: string; box: string;
  sections: { head: string; text: string }[];
  sources: string[];
}

const HANDOVER_HEADS = [
  ['situation', 'Situation'], ['background', 'Background'], ['assessment', 'Assessment'], ['recommendation', 'Recommendation'],
] as const;

/** The tab and box for an item's written handover; undefined with none, or while it is still owed
 * (a later "Later" outdates the old bundle until the agent writes a new one). */
export function handoverView(n: ViewNode, bundle?: ParkBundle, awaiting = false): HandoverView | undefined {
  if (!isItem(n) || !bundle || awaiting) return undefined;
  return {
    tab: 'Handover', label: `Handover on item ${n.n}`, box: `Handover on item ${n.n}`,
    sections: HANDOVER_HEADS.map(([key, head]) => ({ head, text: bundle[key] })),
    sources: bundle.sources ?? [],
  };
}

/** The footer state word of a card whose handover is owed, and the tip over it (FE_03 ruling 1). */
export const AWAITING = { word: 'Awaiting', tip: 'Awaiting context' } as const;

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
  /** The person's notes: the pin and the "Your note" block; absent with no notes. */
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
}

/** `tier` comes from the page (`sizeTier` in packages/layout, which this layer may not import), and
 *  so do `selected` (the page's selection module, 3_FE_01) and `c` (the conditions table, FE_01). */
export function nodeState(n: ViewNode, s: BoardState, tier?: NodeSize, selected = false, c: CardConditions = {}): NodeState {
  const status = statusOf(s, n.id);
  const pressed: Partial<Record<ActionId, boolean>> = {};
  for (const a of offers(n)) pressed[a] = isPressed(a, status);
  const notes = notesView(n, s.items.get(n.id)?.notes ?? [], c.replies);
  const awaiting = isItem(n) && c.awaiting === true;
  const handover = handoverView(n, c.handover, awaiting);
  const picked = s.sizes.has(n.id);
  const proposal = proposalsView(n, c.proposals);
  const updates = updatesView(n, c.updates);
  const fresh = isItem(n) && c.new === true;
  const flagged = isItem(n) && s.flags.has(n.id);
  return {
    status,
    pinned: s.pins.has(n.id),
    selected,
    label: nodeLabel(n, status, selected,
      `${awaiting ? ', awaiting context' : ''}${handover ? ', handover ready' : ''}${proposal ? proposalWords(c.proposals!) : ''}${updateWords(updates)}${fresh ? ', new' : ''}${flagged ? ', flagged' : ''}`),
    statusWord: awaiting ? AWAITING.word : asksAnswer(n) ? STATUS_LABEL[status] : '',
    ...(awaiting && { awaiting: true as const }),
    ...(notes && { notes }), ...(proposal && { proposal }), ...(updates && { updates }), ...(fresh && { fresh: true as const }), ...(handover && { handover }),
    ...(flagged && { flagged: true as const }), ...(s.locked && { paused: true as const }),
    pressed,
    ...(tier ? { size: { tier, picked, label: sizeLabel({ tier, picked }), shown: picked ? `◆ ${SIZE_LETTER[tier]}` : '' } } : {}),
  };
}
