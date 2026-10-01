// The person's responses as the numbered reply they would have typed: "1 ok, 4 drop, 7 more
// context: ...". Paste it into chat, or let the agent read the transcript directly.
import type { View } from '../../format/src/index.ts';
import type { BoardState } from './reduce.ts';
import { ACTIONS } from './registry.ts';
import type { ItemStatus } from './registry.ts';

const STATUS_REPLY: Partial<Record<ItemStatus, string>> = {
  acknowledged: ACTIONS.ack.reply, dropped: ACTIONS.drop.reply,
  later: ACTIONS.later.reply, context: ACTIONS.context.reply,
};

export function replyText(view: View, s: BoardState): string {
  const items = view.nodes.filter((n) => n.n !== undefined).sort((a, b) => a.n! - b.n!);
  const lines: string[] = [];
  const open: number[] = [];
  for (const n of items) {
    const st = s.items.get(n.id);
    const word = st ? STATUS_REPLY[st.status] : undefined;
    const notes = (st?.notes ?? []).map((x) => x.text).join(' / ');
    if (!word && !notes) { open.push(n.n!); continue; }
    lines.push(`${n.n} ${word ?? 'comment'}${notes ? `: ${notes}` : ''}`);
  }
  const head = `Board "${view.title}" (v${view.version})`;
  const tail = open.length ? [`Still open: ${open.join(', ')}`] : ['Nothing left open.'];
  return [head, ...lines, ...tail].join('\n');
}
