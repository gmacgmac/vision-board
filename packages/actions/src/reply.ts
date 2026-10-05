// The person's responses as the numbered reply they would have typed: "1 ok, 4 drop, 7 more
// context: ...". Paste it into chat, or let the agent read the ledger directly. Reads one board as
// `boardView` (packages/format) + `boardState` (fold.ts) give it.
import type { View } from '../../format/src/index.ts';
import type { BoardState, ItemNote } from './fold.ts';
import { ACTIONS } from './registry.ts';
import type { ItemStatus } from './registry.ts';

const STATUS_REPLY: Partial<Record<ItemStatus, string>> = {
  acknowledged: ACTIONS.ack.reply, dropped: ACTIONS.drop.reply,
  later: ACTIONS.later.reply, context: ACTIONS.context.reply,
};

/** The person's responses as one line per item, and one line per note on a group naming all its
 * items once ("12, 14, 15 comment: ..."), in number order (3_FE_02 ruling 4). */
export function replyText(view: View, s: BoardState): string {
  const items = view.nodes.filter((n) => n.n !== undefined).sort((a, b) => a.n! - b.n!);
  const lines: { at: number; text: string }[] = [];
  const open: number[] = [];
  const groups = new Map<number, ItemNote>();
  for (const n of items) {
    const st = s.items.get(n.id);
    const notes = st?.notes ?? [];
    const own = notes.filter((x) => !x.nodes);
    for (const x of notes) if (x.nodes) groups.set(x.seq, x);
    const grouped = own.length < notes.length;
    // A "more context" that only a group note asks for reads on the group's line, not here.
    const word = st && !(grouped && !own.length && st.status === 'context') ? STATUS_REPLY[st.status] : undefined;
    const text = own.map((x) => x.text).join(' / ');
    if (!word && !text) {
      if (!grouped) open.push(n.n!);
      continue;
    }
    lines.push({ at: n.n!, text: `${n.n} ${word ?? 'comment'}${text ? `: ${text}` : ''}` });
  }
  for (const g of groups.values())
    lines.push({ at: Math.min(...g.nodes!), text: `${g.nodes!.join(', ')} ${ACTIONS[g.kind].reply}: ${g.text}` });
  lines.sort((a, b) => a.at - b.at);
  // A note on a whole container reads once, by the container's title, after the items (api.md 76).
  for (const r of view.regions) {
    const notes = s.regionNotes.get(r.id);
    if (notes?.length) lines.push({ at: Infinity, text: `On container "${r.title}" ${ACTIONS[notes.at(-1)!.kind].reply}: ${notes.map((x) => x.text).join(' / ')}` });
  }
  const head = `Board "${view.title}" (v${view.version})`;
  const tail = open.length ? [`Still open: ${open.join(', ')}`] : ['Nothing left open.'];
  return [head, ...lines.map((l) => l.text), ...tail].join('\n');
}
