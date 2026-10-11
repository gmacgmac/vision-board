// The person's responses as the numbered reply they would have typed, each card with its kind and
// the word its answer means there (panel-send ruling 4): "2 (question): no", "4 (finding): comment:
// ...", "5, 7 (finding, risk): comment: ...". Paste it into chat, or let the agent read the ledger
// directly. With a `ReplyScope` (what the person answered after `since`, pending.ts `replyScope`)
// only those cards and containers, with only the notes made after `since`: the message Send hands
// the chat panel's agent (panel-send ruling 1). "Still open" is always the whole board's. Reads one
// board as `boardView` (packages/format) + `boardState` (fold.ts) give it.
import type { ActionId, View, ViewNode } from '../../format/src/index.ts';
import { NODE_TYPES } from '../../format/src/index.ts';
import { meaningOf } from './action-words.ts';
import type { BoardState } from './board-state.ts';
import type { ItemNote } from './fold.ts';
import { ACTIONS } from './registry.ts';
import type { ItemStatus } from './registry.ts';

/** The cards (by board number) and containers a round covers, and the cursor its notes come after. */
export interface ReplyScope { since: number; cards: ReadonlySet<number>; regions: ReadonlySet<string> }

const STATUS_ACTION: Partial<Record<ItemStatus, ActionId>> = { acknowledged: 'ack', dropped: 'drop', later: 'later', context: 'context' };

/** How a status reads on a card: its kind's word for ✓ or ✗ ("yes"), else the registry's reply word. */
function statusWord(n: ViewNode, status: ItemStatus): string | undefined {
  const a = STATUS_ACTION[status];
  return a && (meaningOf(a, n.kind) ?? ACTIONS[a].reply);
}

const fresh = (scope: ReplyScope | undefined) => (x: ItemNote) => !scope || x.seq > scope.since;

/** The person's responses as one line per card, and one line per note on a group naming all its
 * cards once ("12, 14 (finding, risk): comment: ..."), in number order (3_FE_02 ruling 4). */
export function replyText(view: View, s: BoardState, scope?: ReplyScope): string {
  // Every card may carry a response; only one that needs an answer is still open without one (api.md 118).
  const items = view.nodes.filter((n) => n.n !== undefined).sort((a, b) => a.n! - b.n!);
  const kindOf = new Map(items.map((n) => [n.n!, n.kind]));
  const lines: { at: number; text: string }[] = [];
  const open: number[] = [];
  const groups = new Map<number, ItemNote>();
  for (const n of items) {
    const st = s.items.get(n.id);
    const notes = st?.notes ?? [];
    const own = notes.filter((x) => !x.nodes);
    const grouped = own.length < notes.length;
    // A "more context" that only a group note asks for reads on the group's line, not here.
    const word = st && !(grouped && !own.length && st.status === 'context') ? statusWord(n, st.status) : undefined;
    if (!word && !own.length && !grouped && NODE_TYPES[n.kind].answer) open.push(n.n!);
    if (scope && !scope.cards.has(n.n!)) continue;
    for (const x of notes) if (x.nodes && fresh(scope)(x)) groups.set(x.seq, x);
    const text = own.filter(fresh(scope)).map((x) => x.text).join(' / ');
    if (!word && !text) continue;
    lines.push({ at: n.n!, text: `${n.n} (${n.kind}): ${word ?? 'comment'}${text ? `: ${text}` : ''}` });
  }
  for (const g of groups.values()) {
    const kinds = g.nodes!.map((x) => kindOf.get(x) ?? '?').join(', ');
    lines.push({ at: Math.min(...g.nodes!), text: `${g.nodes!.join(', ')} (${kinds}): ${ACTIONS[g.kind].reply}: ${g.text}` });
  }
  lines.sort((a, b) => a.at - b.at);
  // A note on a whole container reads once, by the container's title, after the items (api.md 76).
  for (const r of view.regions) {
    if (scope && !scope.regions.has(r.id)) continue;
    const notes = (s.regionNotes.get(r.id) ?? []).filter(fresh(scope));
    if (notes.length) lines.push({ at: Infinity, text: `On container "${r.title}" ${ACTIONS[notes.at(-1)!.kind].reply}: ${notes.map((x) => x.text).join(' / ')}` });
  }
  const head = `Board "${view.title}" (v${view.version})`;
  const tail = open.length ? [`Still open: ${open.join(', ')}`] : ['Nothing left open.'];
  return [head, ...lines.map((l) => l.text), ...tail].join('\n');
}
