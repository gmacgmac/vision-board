// The host asks before a note's words are lost (M11; host.ts `BoardView.unsaved`, `leave`;
// notes/note-discard.ts `createLeave`, which reuses `mayLeave`): nothing unsaved never asks; changed
// words ask the host's confirm once, with the board's discard words (`DISCARD_ASK`); Cancel keeps the
// words and puts focus back in the text, OK closes the bubble; a second leave while one asks gets the same answer; and the
// host hears each turn of `unsaved`. A fake bubble stands in for <vb-note-bubble>: the guard reads
// only `hidden`, `dirty`, `focusText` and its `input` events.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { VbNoteBubbleElement } from '#ui';
import type { ConfirmAsk } from '../src/board/host.ts';
import { createLeave, DISCARD_ASK } from '../src/board/notes/note-discard.ts';

/** A bubble, hidden or open, with words changed or not; `type` changes them and fires `input`. */
function fakeBubble(open: boolean, dirty: boolean) {
  const inputs: (() => void)[] = [];
  const b = {
    hidden: !open, dirty, text: dirty ? 'Half a thought' : '', focused: 0,
    focusText() { b.focused += 1; },
    addEventListener(type: string, fn: () => void) { if (type === 'input') inputs.push(fn); },
    type(words: string) { b.text = words; b.dirty = words !== ''; for (const f of inputs) f(); },
  };
  return b;
}

/** A host's confirm that answers `ok`, after `wait` ms, and records each question. */
function fakeHost(ok: boolean, wait = 0) {
  const asked: ConfirmAsk[] = [];
  const confirm = (a: ConfirmAsk) => { asked.push(a); return new Promise<boolean>((r) => setTimeout(() => r(ok), wait)); };
  // The board's own ask (controller.ts `discard`): the host's confirm with the discard words.
  const ask = () => { const [heading, body, c] = DISCARD_ASK; return confirm({ heading, body, confirm: c }); };
  return { asked, ask };
}

const guard = (b: ReturnType<typeof fakeBubble>, ask: () => Promise<boolean>, report?: (on: boolean) => void, discard?: () => void) =>
  createLeave(b as unknown as VbNoteBubbleElement, ask, report, discard);

test('nothing unsaved: no bubble open, or one open with its words unchanged, leaves at once without asking', async () => {
  for (const b of [fakeBubble(false, false), fakeBubble(false, true), fakeBubble(true, false)]) {
    const host = fakeHost(false);
    let discarded = 0;
    const g = guard(b, host.ask, undefined, () => { discarded += 1; });
    assert.equal(g.unsaved, false);
    assert.equal(await g.leave(), true);
    assert.deepEqual(host.asked, []);
    assert.equal(discarded, 0, 'nothing to discard: an unchanged bubble stays as it is');
  }
});

test('changed words: the host is asked once with the discard words; Cancel keeps them with focus in the text, OK leaves', async () => {
  const b = fakeBubble(true, true);
  const cancel = fakeHost(false);
  let discarded = 0;
  const g = guard(b, cancel.ask, undefined, () => { discarded += 1; });
  assert.equal(g.unsaved, true);
  assert.equal(await g.leave(), false);
  assert.deepEqual(cancel.asked, [{ heading: DISCARD_ASK[0], body: DISCARD_ASK[1], confirm: DISCARD_ASK[2] }]);
  assert.equal(b.focused, 1);
  assert.equal(b.text, 'Half a thought');
  assert.equal(g.unsaved, true);
  assert.equal(discarded, 0, 'Cancel discards nothing');
  const ok = fakeHost(true);
  assert.equal(await guard(b, ok.ask, undefined, () => { discarded += 1; }).leave(), true);
  assert.equal(ok.asked.length, 1);
  assert.equal(discarded, 1, 'OK discards: the bubble closes');
  assert.equal(b.focused, 1, 'OK leaves focus alone: the host unmounts');
});

test('a leave while one is asking gets the same answer, not a second question', async () => {
  const host = fakeHost(false, 5);
  const g = guard(fakeBubble(true, true), host.ask);
  const [one, two] = [g.leave(), g.leave()];
  assert.equal(one, two);
  assert.deepEqual(await Promise.all([one, two]), [false, false]);
  assert.equal(host.asked.length, 1);
  // Once answered, the next leave asks again.
  assert.equal(await g.leave(), false);
  assert.equal(host.asked.length, 2);
});

test('the host hears each turn of unsaved: words typed, words taken back, the bubble closed', () => {
  const b = fakeBubble(true, false);
  const heard: boolean[] = [];
  const g = guard(b, fakeHost(true).ask, (on) => heard.push(on));
  b.type('A');
  b.type('Ab');
  assert.deepEqual(heard, [true], 'told once, not on every key');
  b.type('');
  assert.deepEqual(heard, [true, false]);
  b.type('Again');
  b.hidden = true;
  g.check();
  assert.deepEqual(heard, [true, false, true, false]);
});
