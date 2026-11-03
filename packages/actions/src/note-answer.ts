// What answered a note (api.md 36, D-045; bot-quality TOOLS_02): the one rule that ends owing. `item.owed` and
// `container.owed` (conditions.ts) owe the latest note that `noteAnswer` finds nothing for, and an agent's read names
// what it found (`answered`, apps/board/server/engine/caller-marks.ts), so a bot reads "answered" rather than working
// it out from a missing `owed`. Pure.
import type { LedgerState } from './fold.ts';
import type { Ask } from './notes.ts';
import { askVer, cardsOf, closedAfter } from './notes.ts';
import { replyTo } from './note-lock.ts';

/** What answered a note: a `reply` naming it (its line, never its words: they are on the board), a newer version of the card (by `ver`: a version
 * has no `seq` of its own in the fold), or the person's ✓ or ✗ after it (its line). */
export type NoteAnswer =
  | { kind: 'reply'; seq: number }
  | { kind: 'version'; ver: number }
  | { kind: 'check' | 'cross'; seq: number };

/** What answers ask `a` as card `id` shows it, or undefined while nothing has: a reply naming it on any of its cards,
 * else the first version of card `id` newer than the one it was made on, else a ✓ or ✗ on card `id` after it that
 * still stands (`closedAfter`). The agent's own answer comes first: it is the one not to repeat. A note on a whole
 * container (no `id`) is answered by a reply alone. */
export function noteAnswer(s: LedgerState, a: Ask, id?: number): NoteAnswer | undefined {
  const r = replyTo(s, a.seq, cardsOf(a));
  if (r) return { kind: 'reply', seq: r.seq };
  if (id === undefined) return undefined;
  const newer = s.nodes.get(id)?.versions.find((v) => v.ver > askVer(a, id));
  if (newer) return { kind: 'version', ver: newer.ver };
  const log = s.logs.get(id);
  const status = s.items.get(id)?.status ?? 'open';
  if (!log || !closedAfter(log, status, a)) return undefined;
  return { kind: status === 'acknowledged' ? 'check' : 'cross', seq: log.decisions.at(-1)!.seq };
}
