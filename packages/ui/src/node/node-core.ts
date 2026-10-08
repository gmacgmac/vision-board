// Node pattern, layer 1 (core): what a node shows and which actions it offers. No DOM, so
// every rule here is unit-tested under plain Node; the element only applies the result.
import type { ActionId, NodeSize, ParkBundle, ViewNode } from '../../../format/src/index.ts';
import { NODE_TYPES } from '../../../format/src/index.ts';
import type { BoardState, Change, FieldChange, ItemNote, ItemStatus } from '../../../actions/src/index.ts';
import { ACTIONS, statusOf } from '../../../actions/src/index.ts';

export const STATUS_LABEL: Record<ItemStatus, string> = {
  open: 'Open', acknowledged: 'Acknowledged', dropped: 'Dropped', commented: 'Commented',
  context: 'Needs context', later: 'Saved for later',
};

export const isItem = (n: ViewNode): boolean => n.n !== undefined;

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
  const st = isItem(n) ? `, ${STATUS_LABEL[status]}` : '';
  return `${num}${NODE_TYPES[n.kind].label}: ${n.title}${st}${extra}${selected ? ', selected' : ''}`;
}

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

/** The card's notes: the numbered pin on its top-right corner (the latest note, the one a press
 * of C or M or a click opens) and the block in its body, latest first, with "N notes" over it
 * when there are several. `orphans`: replies that name no note of the card, after the notes; with
 * only those, the block shows and there is no pin. A note with no reply carries no `replies`. */
export interface NotesView {
  count?: string;
  entries: NoteEntry[];
  orphans?: ReplyEntry[];
  pin?: { seq: number; index: number; sent: boolean; label: string };
}

/** An agent's reply as the page passes it in (cardReplies flag): its `seq`, `to` (the `seq` of the
 * note it answers, if it names one), the label of the agent that wrote it and its words. */
export interface CardReply { seq: number; to?: number; agent?: string; text: string }

const KIND_WORD: Record<ItemNote['kind'], string> = { comment: 'Your note', context: 'More context' };

export const replyEntry = (r: CardReply): ReplyEntry => ({ seq: r.seq, who: `Agent reply${r.agent ? ` · ${r.agent}` : ''}`, text: r.text });

/** The block and pin for an item's notes and the replies to them; undefined with neither. */
export function notesView(n: ViewNode, notes: readonly ItemNote[], replies: readonly CardReply[] = []): NotesView | undefined {
  const mine = new Set(notes.map((x) => x.seq));
  const orphans = replies.filter((r) => r.to === undefined || !mine.has(r.to)).map(replyEntry);
  if (!notes.length && !orphans.length) return undefined;
  const entries = notes.map((x, i): NoteEntry => {
    const answers = replies.filter((r) => r.to === x.seq).map(replyEntry);
    return {
      seq: x.seq, index: i + 1, sent: x.sent === true, text: x.text,
      who: `${KIND_WORD[x.kind]} ${i + 1}${x.nodes ? ` · ${x.nodes.length} cards` : ''}${x.sent ? ' · Sent' : ''}`,
      ...(answers.length && { replies: answers }),
    };
  }).reverse();
  const top = entries[0];
  const out: NotesView = { ...(notes.length > 1 && { count: `${notes.length} notes` }), entries, ...(orphans.length && { orphans }) };
  if (!top) return out;
  // A note on a group of cards (3_FE_02) names every item it is on.
  const group = notes.find((x) => x.seq === top.seq)?.nodes;
  const on = group ? `items ${group.join(', ')}` : `item ${n.n}`;
  const label = top.sent ? `Note ${top.index} on ${on}, sent. Show it` : `Note ${top.index} on ${on}. Edit it`;
  return { ...out, pin: { seq: top.seq, index: top.index, sent: top.sent, label } };
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

/** One version a changed card steps through (FE_02): when and by whom, and what changed from the
 *  version before (`versionChanges`). `when` is in the person's clock; `agent` the writer's label. */
export interface CardStep { ver: number; when: string; agent?: string; changes: readonly FieldChange[] }

/** A changed card (`item.unseen`, past version 1): `count`, the versions the person has not seen;
 *  while the stepper is open, `steps`, the versions it steps through, oldest first, and `at`, the one
 *  shown, `steps.length` once past the last ("You're up to date"). */
export interface CardUpdates { count: number; steps?: readonly CardStep[]; at?: number }

/** One change chip: "+ body", "~ title", "- tags". */
export interface UpdateChip { change: Change; text: string }

/** The step shown: the section's name, its line, chips and what the text gained; the footer's count. */
export interface UpdateStep { label: string; head: string; chips: UpdateChip[]; lines: string[]; count: string; first: boolean }

/** The "N updates" tab and the stepper (mockup 03 Part B, option B). `tab` is empty once up to date. */
export interface UpdatesView { tab: string; label: string; open: boolean; done: boolean; step?: UpdateStep }

const SIGN: Record<Change, string> = { added: '+', changed: '~', removed: '-' };

/** `text` on one line, cut to `max` characters. */
const short = (text: string, max: number): string => {
  const t = text.replace(/\s+/g, ' ').trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
};

/** What a step says the text gained (ruling 3): the new title, the added body, or "Body rewritten". */
function stepLines(changes: readonly FieldChange[]): string[] {
  if (!changes.length) return ['Drawn again with no change'];
  return changes.flatMap((c) => {
    if (c.field === 'title' && c.text !== undefined) return [`Title: ${short(c.text, 100)}`];
    if (c.field === 'body' && c.change === 'added' && c.text) return [short(c.text, 160)];
    return c.field === 'body' && c.change === 'changed' ? ['Body rewritten'] : [];
  });
}

/** The tab and the stepper for a changed item; undefined with nothing unseen and no stepper open. */
export function updatesView(n: ViewNode, u?: CardUpdates): UpdatesView | undefined {
  if (!isItem(n) || !u || (!u.steps && u.count < 1)) return undefined;
  const { steps } = u;
  const k = steps?.length ?? u.count;
  const tab = `${k} update${k === 1 ? '' : 's'}`;
  const at = u.at ?? 0;
  if (!steps) return { tab, label: `${tab} since you last looked. Show them`, open: false, done: false };
  const s = steps[at];
  if (!s) return { tab: '', label: 'Up to date', open: true, done: true };
  const count = `Update ${at + 1} of ${k}`;
  return {
    tab, label: `${tab} since you last looked. Hide them`, open: true, done: false,
    step: {
      label: `${count}, v${s.ver}`, head: `v${s.ver} · ${s.when} · ${s.agent ?? 'the agent'}`, count, first: at === 0,
      chips: s.changes.map((c) => ({ change: c.change, text: `${SIGN[c.change]} ${c.field}` })), lines: stepLines(s.changes),
    },
  };
}

/** What the updates add to the card's name: ", 3 unseen updates", or ", showing update 2 of 3". */
const updateWords = (v?: UpdatesView): string =>
  !v || v.done ? '' : v.step ? `, showing ${v.step.count.toLowerCase()}` : `, ${v.tab.replace(' ', ' unseen ')}`;

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
  /** The node's accessible name: number, kind, title, (for items) status, and "selected". */
  label: string;
  /** The status word in the footer, "Open" included; empty for non-items. */
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
  return {
    status,
    pinned: s.pins.has(n.id),
    selected,
    label: nodeLabel(n, status, selected,
      `${awaiting ? ', awaiting context' : ''}${handover ? ', handover ready' : ''}${proposal ? proposalWords(c.proposals!) : ''}${updateWords(updates)}${fresh ? ', new' : ''}`),
    statusWord: awaiting ? AWAITING.word : isItem(n) ? STATUS_LABEL[status] : '',
    ...(awaiting && { awaiting: true as const }),
    ...(notes && { notes }), ...(proposal && { proposal }), ...(updates && { updates }), ...(fresh && { fresh: true as const }), ...(handover && { handover }),
    pressed,
    ...(tier ? { size: { tier, picked, label: sizeLabel({ tier, picked }), shown: picked ? `◆ ${SIZE_LETTER[tier]}` : '' } } : {}),
  };
}
