// The person's responses as the numbered reply they would have typed, each card with its kind and
// its answer as the mark it is (D-045: ✓ and ✗ carry no meaning; the card says what they mean):
// "2 (question): ✗", "4 (finding): comment: ...", "5, 7 (finding, risk): comment: ...". Paste it into chat, or let the agent read the ledger
// directly. With a `ReplyScope` (what the person answered after `since`, pending.ts `replyScope`)
// only those cards and containers, with only the notes made after `since`: the message Send hands
// the chat panel's agent (panel-send ruling 1). "Still open" is always the whole board's: the cards that
// need the person, then, on their own line, the cards waiting for the agent's answer (D-046, review
// polish round 2 ruling 3). Reads one board as `boardView` (packages/format) + `boardState` (fold.ts)
// give it.
import type { ActionId, View } from '../../format/src/index.ts';
import { NODE_TYPES } from '../../format/src/index.ts';
import type { BoardState } from './board-state.ts';
import type { ItemNote } from './fold.ts';
import { ACTIONS } from './registry.ts';
import type { ItemStatus } from './registry.ts';

/** The cards (by board number) and containers a round covers, and the cursor its notes come after. */
export interface ReplyScope { since: number; cards: ReadonlySet<number>; regions: ReadonlySet<string> }

const STATUS_ACTION: Partial<Record<ItemStatus, ActionId>> = { acknowledged: 'ack', dropped: 'drop', later: 'later' };

/** How a status reads on a card: the registry's reply word, ✓, ✗ or "saved for later". */
const statusWord = (status: ItemStatus): string | undefined => {
  const a = STATUS_ACTION[status];
  return a && ACTIONS[a].reply;
};

/** With the agent (D-046): `commented`, and `context` on an old board (the footer reads both "Replied"). */
const WITH_AGENT: ReadonlySet<ItemStatus> = new Set(['commented', 'context']);

const fresh = (scope: ReplyScope | undefined) => (x: ItemNote) => !scope || x.seq > scope.since;

/** The reply in its three parts: the board's line, the answer lines, and the tail ("Still open: …",
 * then "Waiting for your reply: …", each only when it lists a card; else "Nothing left open."); and
 * the `seq` of every note its lines carry, so the chat does not send a note a second time. */
export interface ReplyLines { head: string; lines: string[]; tail: string; notes: number[] }

/** The person's responses as one line per card, and one line per note on a group naming all its
 * cards once ("12, 14 (finding, risk): comment: ..."), in number order (3_FE_02 ruling 4). */
export const replyText = (view: View, s: BoardState, scope?: ReplyScope): string => joinReply(replyLines(view, s, scope));

/** The reply's parts as the text of `replyText`. */
export const joinReply = (r: ReplyLines): string => [r.head, ...r.lines, r.tail].join('\n');

/** `replyText` in its parts, so the chat's composer can show the answer lines alone (the one writer). */
export function replyLines(view: View, s: BoardState, scope?: ReplyScope): ReplyLines {
  // Every card may carry a response; one that needs an answer with no ✓, ✗ or Later is still open
  // (api.md 118, D-045: a note never answers a card), or waits for the agent while the person's
  // latest note on it is owed an answer (`commented`, D-046).
  const items = view.nodes.filter((n) => n.n !== undefined).sort((a, b) => a.n! - b.n!);
  const kindOf = new Map(items.map((n) => [n.n!, n.kind]));
  const lines: { at: number; text: string }[] = [];
  const open: number[] = [];
  const waiting: number[] = [];
  const groups = new Map<number, ItemNote>();
  const notesRead: number[] = [];
  for (const n of items) {
    const st = s.items.get(n.id);
    const notes = st?.notes ?? [];
    const own = notes.filter((x) => !x.nodes);
    const status = st?.status ?? 'open';
    const word = statusWord(status);
    if (NODE_TYPES[n.kind].answer && status === 'open') open.push(n.n!);
    if (NODE_TYPES[n.kind].answer && WITH_AGENT.has(status)) waiting.push(n.n!);
    if (scope && !scope.cards.has(n.n!)) continue;
    for (const x of notes) if (x.nodes && fresh(scope)(x)) groups.set(x.seq, x);
    const fresher = own.filter(fresh(scope));
    const text = fresher.map((x) => x.text).join(' / ');
    if (!word && !text) continue;
    notesRead.push(...fresher.map((x) => x.seq));
    lines.push({ at: n.n!, text: `${n.n} (${n.kind}): ${word ?? 'comment'}${text ? `: ${text}` : ''}` });
  }
  for (const g of groups.values()) {
    notesRead.push(g.seq);
    const kinds = g.nodes!.map((x) => kindOf.get(x) ?? '?').join(', ');
    lines.push({ at: Math.min(...g.nodes!), text: `${g.nodes!.join(', ')} (${kinds}): ${ACTIONS[g.kind].reply}: ${g.text}` });
  }
  lines.sort((a, b) => a.at - b.at);
  // A note on a whole container reads once, by the container's title, after the items (api.md 76).
  for (const r of view.regions) {
    if (scope && !scope.regions.has(r.id)) continue;
    const notes = (s.regionNotes.get(r.id) ?? []).filter(fresh(scope));
    if (!notes.length) continue;
    notesRead.push(...notes.map((x) => x.seq));
    lines.push({ at: Infinity, text: `On container "${r.title}" ${ACTIONS[notes.at(-1)!.kind].reply}: ${notes.map((x) => x.text).join(' / ')}` });
  }
  const tail = [...(open.length ? [`Still open: ${open.join(', ')}`] : []), ...(waiting.length ? [`Waiting for your reply: ${waiting.join(', ')}`] : [])]
    .join('\n') || 'Nothing left open.';
  return { head: `Board "${view.title}" (v${view.version})`, lines: lines.map((l) => l.text), tail, notes: notesRead };
}
