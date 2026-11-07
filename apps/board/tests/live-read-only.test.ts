// The page's held ledger and read-only (D-085 4, 6; READONLY_01 step 7): every read says whether the ledger is open
// read-only, and `live.readOnly` holds what the last one said; a change of it alone is handed on as an empty batch so
// the board draws its controls again. A change event with head 0 (the host's word for a replaced file) reads the whole
// ledger again from the start, even when the new file is longer. The chat panel's rule: with no session in use, a
// read-only ledger takes no message.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { LedgerEvent } from '#format';
import { checkedEvents, lineMaker } from '#format/testing';
import { createLive } from '../src/board/live.ts';
import type { PluginEvent } from '../src/board/host.ts';
import { blockedReason, READ_ONLY } from '../src/shell/chat-rules.ts';

const A = 'a-live0000';

/** A fake host: the ledger the page reads (`file`, swapped to replace it), whether it is read-only, and its events. */
function host(lines: string[]) {
  let file = checkedEvents(lines);
  let readOnly = false;
  const reads: number[] = [];
  let tell: ((e: PluginEvent) => void) | undefined;
  return {
    readLedger: async (after: number) => {
      reads.push(after);
      return { events: file.filter((e) => e.seq > after), head: file.at(-1)?.seq ?? 0, ...(readOnly && { readOnly: true as const }) };
    },
    events: (fn: (e: PluginEvent) => void) => { tell = fn; return () => { tell = undefined; }; },
    set readOnly(on: boolean) { readOnly = on; },
    replace(next: string[]) { file = checkedEvents(next); },
    emit: (head?: number) => tell?.({ plugin: 'board', ref: head === undefined ? {} : { head } }),
    reads,
  };
}
const ledger = (titles: string[]) => {
  const { line } = lineMaker();
  return [line({ by: 'agent', agent: A, type: 'join', label: 'Bot' }), ...titles.map((t, i) => line({ by: 'agent', agent: A, type: 'board', board: `b-${i}`, title: t }))];
};
const settle = () => new Promise((r) => setTimeout(r, 10));

test('the reads say read-only; a change of it alone is an empty batch, so the board draws again', async () => {
  const h = host(ledger(['One']));
  const batches: [number, boolean][] = [];
  const live = createLive(h, (lines: LedgerEvent[], full) => batches.push([lines.length, full]));
  h.readOnly = true;
  await live.load();
  assert.equal(live.readOnly, true);
  h.readOnly = false;
  await live.sync();
  assert.equal(live.readOnly, false);
  assert.deepEqual(batches, [[0, true], [0, false]]);
  await live.sync();
  assert.equal(batches.length, 2, 'nothing changed, nothing handed on');
});

test('head 0: the file was replaced, so the whole ledger is read again, a longer one too', async () => {
  const h = host(ledger(['One', 'Two']));
  const live = createLive(h, () => {});
  await live.load();
  const stop = live.watch((err) => assert.fail(String(err)), () => {});
  h.replace(ledger(['X', 'Y', 'Z']));
  h.emit(0);
  await settle();
  await live.settled();
  assert.deepEqual([...live.state!.boards.keys()], ['b-0', 'b-1', 'b-2']);
  assert.equal(live.state!.boards.get('b-0')!.title, 'X', 'not the old lines with new ones after them');
  assert.equal(h.reads.at(-1), 0, 'read from the start');
  stop();
});

test('the chat panel: read-only blocks a message only when no session is in use (a start would join)', () => {
  assert.equal(blockedReason('b', false, undefined, false, true), READ_ONLY);
  assert.equal(blockedReason('b', true, undefined, false, true), blockedReason('b', true), 'a past version first');
  assert.equal(blockedReason('b', false, undefined, false, false), undefined);
  assert.match(READ_ONLY, /read-only\. Switch to Editing/);
});
