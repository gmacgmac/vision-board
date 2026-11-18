// The app frame's protocol, the panel's note and the agent's reply (apps.md § The panel protocol; FE_08 keeps
// the spike's channel and shows both in the app window's drawer): `vision-board/note` `{ text }` becomes the person's
// note, trimmed, at most PANEL_NOTE_CHARS, answered {} once the page keeps it; every other shape is refused and never
// reaches the page. `vision-board/notifications/reply` goes only to a ready panel. Fake windows: app-frame-harness.ts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HOST_REPLY, PANEL_ERRORS, PANEL_NOTE, PANEL_NOTE_CHARS } from '#format';
import { errorOf, harness, ready, req, settle } from './app-frame-harness.ts';

/** A harness whose page keeps every note in `kept`; `fail` makes the page refuse with it. */
function noting(fail?: unknown) {
  const kept: string[] = [];
  const h = harness({ note: async (text) => { if (fail) throw fail; kept.push(text); } });
  return { ...h, kept };
}

test('a note goes to the page trimmed, and is answered {} once the page keeps it', async () => {
  const h = noting();
  ready(h);
  h.post(req(3, PANEL_NOTE, { text: '  CAM-3 is above 2%  ' }));
  await settle();
  assert.deepEqual(h.kept, ['CAM-3 is above 2%']);
  assert.deepEqual(h.last(), { jsonrpc: '2.0', id: 3, result: {} });
});

test(`a note of ${PANEL_NOTE_CHARS} characters is kept; one more is bad params and never reaches the page`, async () => {
  const h = noting();
  ready(h);
  h.post(req(1, PANEL_NOTE, { text: 'x'.repeat(PANEL_NOTE_CHARS) }));
  h.post(req(2, PANEL_NOTE, { text: 'x'.repeat(PANEL_NOTE_CHARS + 1) }));
  await settle();
  assert.equal(h.kept.length, 1);
  const e = errorOf(h.sent.find((m) => (m as { id?: unknown }).id === 2));
  assert.equal(e.code, PANEL_ERRORS.invalidParams);
  assert.match(e.message, new RegExp(String(PANEL_NOTE_CHARS)));
});

test('a note with no words, words that are only spaces, or no text is bad params; none reaches the page', async () => {
  const h = noting();
  ready(h);
  for (const [i, params] of [{}, { text: '' }, { text: '   ' }, { text: 7 }, { words: 'hi' }].entries()) {
    h.post(req(i + 10, PANEL_NOTE, params));
    assert.equal(errorOf(h.last()).code, PANEL_ERRORS.invalidParams, JSON.stringify(params));
  }
  await settle();
  assert.deepEqual(h.kept, []);
});

test('a note the page refused is -32000 with its problem; with no page wired (the flag off) it is not-found', async () => {
  const h = noting({ problem: 'read-only', detail: 'This ledger is read-only' });
  ready(h);
  h.post(req(4, PANEL_NOTE, { text: 'hi' }));
  await settle();
  const e = errorOf(h.last());
  assert.equal(e.code, PANEL_ERRORS.failed);
  assert.equal(e.data?.problem, 'read-only');
  const off = harness();
  ready(off);
  off.post(req(5, PANEL_NOTE, { text: 'hi' }));
  await settle();
  assert.equal(errorOf(off.last()).data?.problem, 'not-found');
});

test('a note from any window but the card\'s frame is ignored', async () => {
  const h = noting();
  ready(h);
  const before = h.sent.length;
  h.postFromOther(req(6, PANEL_NOTE, { text: 'hi' }));
  await settle();
  assert.deepEqual([h.kept, h.sent.length], [[], before]);
});

test('a reply is told only to a ready panel', () => {
  const h = harness();
  assert.equal(h.bridge.post(HOST_REPLY, { seq: 9, text: 'Two bursts since 21:02' }), false, 'not before it is ready');
  ready(h);
  assert.equal(h.bridge.post(HOST_REPLY, { seq: 9, text: 'Two bursts since 21:02' }), true);
  assert.deepEqual(h.last(), { jsonrpc: '2.0', method: HOST_REPLY, params: { seq: 9, text: 'Two bursts since 21:02' } });
});
