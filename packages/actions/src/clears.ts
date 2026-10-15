// The agent's answer clears a card (D-045, answer-model ruling 7: "then it's a fresh thing"). When
// an agent's line answers a card's latest note, a `reply` naming it in `to` or a newer version of
// the card such as an `append` (what answers an ask, api.md 36, the same test as `item.owed`), every
// ✓, ✗ and Later made before that note stops counting: the card is open and unmarked
// (notes.ts `itemOf` with the clear's `pos`), and it shows as updated until the person looks at it
// (`unseenAnswer`, read by `boardState` and the `item.unseen` row). Worked out in the fold from the
// agent's line; nothing is written for the person. A reply to an older note, not the card's latest,
// clears nothing. Pure.
import type { LedgerEvent } from '../../format/src/index.ts';
import type { LedgerState } from './fold.ts';
import type { Ask } from './notes.ts';
import { askVer, cardsOf, latestAsk } from './notes.ts';

/** The latest clear on a card: `pos` of the note the agent answered, `seq` of the agent's line. */
export interface Clear { pos: number; seq: number }

/** The `pos` before which nothing the person did on card `id` counts (0: none). */
export const cutOf = (s: LedgerState, id: number): number => s.clears.get(id)?.pos ?? 0;

/** Record a clear on card `id` when agent line `seq` answers its latest note, once per note. */
function clear(s: LedgerState, id: number, seq: number, answers: (latest: Ask) => boolean): boolean {
  const log = s.logs.get(id);
  const latest = log && latestAsk(log);
  if (!latest || latest.pos <= cutOf(s, id) || !answers(latest)) return false;
  s.clears.set(id, { pos: latest.pos, seq });
  return true;
}

/** Fold an agent's `reply` or `node` line: the cards whose latest note it answered, now cleared,
 * for the fold to work out again. A `reply` answers the note it names on every card of it (a note on
 * a group, api.md 64); a version answers the card's latest note when it is newer than the note's. */
export function foldClears(s: LedgerState, e: LedgerEvent): number[] {
  if (e.type === 'reply' && e.to !== undefined) {
    const ask = s.asks.get(e.to);
    if (!ask) return [];
    return cardsOf(ask).filter((id) => clear(s, id, e.seq, (latest) => latest.seq === ask.seq));
  }
  if (e.type !== 'node') return [];
  const ver = s.nodes.get(e.id)?.versions.at(-1)?.ver ?? 0;
  return clear(s, e.id, e.seq, (latest) => ver > askVer(latest, e.id)) ? [e.id] : [];
}

/** Whether the agent's answer cleared card `id` and the person has not looked at the card since:
 * no card `seen` line and no act of theirs naming it after the agent's line (api.md 94). */
export function unseenAnswer(s: LedgerState, id: number): boolean {
  const c = s.clears.get(id);
  return c !== undefined && c.seq > (s.looked.get(id) ?? 0);
}
