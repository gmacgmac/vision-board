// A retry key's replay (api.md 29): an item whose key was sent before returns the first result and
// writes nothing, and other content under the same key is a `conflict`. Split out of write-board.ts.
// "The same content" is a hash of what the item says without its stamp, its key or the numbers the
// server holds (`contentHash`). With the `botToolRules` flag, a conflict says what the key holds and names a free key
// (`conflictWords`), so a bot never guesses how to go on.
import { createHash } from 'node:crypto';
import type { LedgerEvent } from '#format';
import { isRecord, LIMITS, toLine } from '#format';
import type { LedgerState } from '#actions';
import { numberOf } from '#actions';
import type { WriteResult } from './write-result.ts';
import { written } from './write-result.ts';
import { fail } from './write-problem.ts';
import type { Batch } from './write-refs.ts';
import { storedFor } from './write-refs.ts';
import * as writesWords from './words/writes.ts';

type Rec = Record<string, unknown>;

/** Stamped or server-held fields, left out when two items are compared (api.md 29). */
const NOT_CONTENT = ['v', 'seq', 'at', 'by', 'agent', 'person', 'key', 'base', 'n', 'ver'];

/** The same JSON for the same value, whatever order its keys came in. */
function canonical(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canonical).join(',')}]`;
  if (!isRecord(v)) return JSON.stringify(v);
  return `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${canonical(v[k])}`).join(',')}}`;
}

/** A hash of what an item says, without its stamp, key or server-assigned numbers. A node's own
 * `n` and `ver` are server-held, so they are compared apart (`sameNode`); `propose`'s `ver` is
 * content. A container's retire is the container: which cards it took depends on when it ran. */
function contentHash(e: Rec): string {
  const content: Rec = {};
  for (const [k, v] of Object.entries(e)) {
    if (NOT_CONTENT.includes(k) && !(k === 'ver' && e.type === 'propose') && !(k === 'n' && e.type !== 'node')) continue;
    if (k === 'cards' && e.region !== undefined) continue;
    content[k] = v;
  }
  return createHash('sha256').update(canonical(content)).digest('hex');
}

/** A node item names the same node as the stored line: the same `n`, or none when it was new. */
const sameNode = (item: Rec, stored: Rec): boolean =>
  item.type !== 'node' || (item.n === undefined ? stored.ver === 1 : item.n === stored.n);

/** A key sent before: the same content returns the first result and writes nothing; other
 * content is a `conflict` (api.md 29). Undefined when the key is new. */
export function replay(b: Batch, i: number, key: string, e: Rec): WriteResult | undefined {
  const stored = storedFor(b, key);
  if (!stored) return undefined;
  const line = toLine(stored);
  if (contentHash(line) !== contentHash(e) || !sameNode(e, line)) {
    const detail = b.keyHelp ? conflictWords(b, key, stored) : writesWords.theKeyWasUsedBefore(key);
    fail('conflict', detail, { errors: [{ pointer: `/items/${i}/key`, detail: writesWords.keyReusedForDifferentContent2 }] });
  }
  return written(b.ledger.state(), i, key, stored, true);
}


/** The first `<key>-<i>` this agent has not used, cut to a key's length: from 2, or past the number `key` ends in
 * (`fee-2` goes on to `fee-3`, never `fee-2-2`). */
function freeKey(s: LedgerState, agent: string, key: string): string {
  const used = s.keys.get(agent);
  const [, base = key, from = '1'] = /^(.+)-(\d+)$/.exec(key) ?? [];
  for (let i = Number(from) + 1; ; i++) {
    const end = `-${i}`;
    const next = `${base.slice(0, LIMITS.key - end.length)}${end}`;
    if (!used?.has(next)) return next;
  }
}

/** A conflict's words: what `key` holds (a card by number, title and version; else its kind and line), how to change
 * that card, and a free key for new content. */
function conflictWords(b: Batch, key: string, stored: LedgerEvent): string {
  const s = b.ledger.state();
  const fresh = freeKey(s, b.agent, key);
  if (stored.type === 'node') {
    const n = numberOf(s, stored.id);
    return writesWords.theKeyHoldsACard(key, n, stored.node.title, stored.ver, fresh);
  }
  return writesWords.theKeyHoldsALine(key, stored.type, stored.seq, fresh);
}
