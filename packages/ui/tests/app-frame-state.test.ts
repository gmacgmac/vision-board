// The app frame's protocol, the board's own state (apps.md § Saving the panel's state, app-state-kept
// FE_02): `vision-board/save-state` checked against its schema and `appStateProblem`, passed to the
// page and answered once the page settles; the value the page holds for the card handed back in the
// `ui/initialize` answer's host context under `APP_STATE_KEY`, and only there. Fake windows:
// app-frame-harness.ts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import type { AppStateValue } from '#format';
import { APP_HOST_NAME, APP_LIMITS, APP_PROTOCOL_VERSION, APP_STATE_KEY, appStateProblem, PANEL_ERRORS, PANEL_SAVE_STATE } from '#format';
import { SCHEMA_DIR } from '#format/files';
import { SAVE_WORDS } from '../src/index.ts';
import { DARK, errorOf, harness, LIGHT, note, ready, req, settle } from './app-frame-harness.ts';

const SCHEMA = JSON.parse(fs.readFileSync(`${SCHEMA_DIR}app/panel-state.schema.json`, 'utf8'));

/** A harness whose page keeps every save in `saved`; `fail` makes the page refuse with it. */
function saving(fail?: unknown) {
  const saved: AppStateValue[] = [];
  const h = harness({ saveState: async (s) => { if (fail) throw fail; saved.push(s); } });
  return { ...h, saved };
}

const init = (h: ReturnType<typeof harness>, id: string | number = 1) =>
  h.post(req(id, 'ui/initialize', { protocolVersion: APP_PROTOCOL_VERSION, appCapabilities: {} }));
const answer = (h: ReturnType<typeof harness>) => (h.last() as { result: { hostContext: Record<string, unknown>; hostInfo: { name: string } } }).result;

test('the bridge\'s check of a save is the schema\'s: params { state } and nothing else', () => {
  const save = SCHEMA.$defs.save;
  assert.deepEqual([save.type, save.required, Object.keys(save.properties), save.unevaluatedProperties], ['object', ['state'], ['state'], false]);
  assert.equal(PANEL_SAVE_STATE, `${APP_HOST_NAME}/save-state`);
});

test('a save goes to the page as JSON, and is answered {} once the page holds it', async () => {
  const h = saving();
  ready(h);
  h.post(req(7, PANEL_SAVE_STATE, { state: { sum: '12', answer: '', gone: undefined } }));
  assert.equal(h.sent.length, 1, 'no answer before the page settles');
  await settle();
  assert.deepEqual(h.saved, [{ sum: '12', answer: '' }], 'what JSON keeps');
  assert.deepEqual(h.last(), { jsonrpc: '2.0', id: 7, result: {} });
  // Before the handshake too: a panel may save as soon as it starts.
  const early = saving();
  early.post(req('a', PANEL_SAVE_STATE, { state: null }));
  await settle();
  assert.deepEqual([early.saved, early.last()], [[null], { jsonrpc: '2.0', id: 'a', result: {} }]);
});

test('a save with no state, another field, or a value that is not JSON is bad params (-32602); none reaches the page', async () => {
  const h = saving();
  ready(h);
  const cases: unknown[] = [{}, { state: 1, more: 2 }, { value: 1 }, { state: undefined }, 'x', [1]];
  for (const [i, params] of cases.entries()) {
    h.post(req(i + 10, PANEL_SAVE_STATE, params));
    const e = errorOf(h.last());
    assert.equal(e.code, PANEL_ERRORS.invalidParams, JSON.stringify(params));
  }
  h.post(req(20, PANEL_SAVE_STATE, { state: undefined }));
  assert.equal(errorOf(h.last()).message, appStateProblem(undefined), 'appStateProblem\'s words');
  await settle();
  assert.deepEqual(h.saved, []);
});

test('a save over APP_LIMITS.stateBytes is -32000 too-large in appStateProblem\'s words, and never reaches the page', async () => {
  const h = saving();
  ready(h);
  const big = 'x'.repeat(APP_LIMITS.stateBytes);
  h.post(req(3, PANEL_SAVE_STATE, { state: big }));
  assert.deepEqual(errorOf(h.last()), { code: PANEL_ERRORS.failed, message: appStateProblem(big), data: { problem: 'too-large' } });
  await settle();
  assert.deepEqual(h.saved, []);
});

test('a save the page could not keep is -32000 with its problem; with no page wired it is not-found', async () => {
  const h = saving({ problem: 'not-found', detail: 'No card 9 on this board.' });
  ready(h);
  h.post(req(4, PANEL_SAVE_STATE, { state: 1 }));
  await settle();
  assert.deepEqual(errorOf(h.last()), { code: PANEL_ERRORS.failed, message: SAVE_WORDS, data: { problem: 'not-found', detail: 'No card 9 on this board.' } });
  const odd = saving(new Error('boom'));
  odd.post(req(5, PANEL_SAVE_STATE, { state: 1 }));
  await settle();
  assert.deepEqual(errorOf(odd.last()).data, { problem: 'app-failed' });
  const bare = harness();
  bare.post(req(6, PANEL_SAVE_STATE, { state: 1 }));
  await settle();
  assert.deepEqual(errorOf(bare.last()).data, { problem: 'not-found' });
});

test('an answer to a save is dropped once the frame closed', async () => {
  const h = saving();
  ready(h);
  h.post(req(8, PANEL_SAVE_STATE, { state: 1 }));
  h.bridge.close();
  await settle();
  assert.equal(h.sent.length, 1, 'only ui/initialize was answered');
});

test(`ui/initialize hands back the page's value for the card as hostContext["${APP_STATE_KEY}"], left out when there is none`, async () => {
  const value = { sum: '4×5', answer: '20' };
  const h = harness({ loadState: async () => value });
  init(h);
  assert.equal(h.sent.length, 0, 'waits for the page');
  await settle();
  assert.deepEqual(answer(h).hostContext, { ...LIGHT, [APP_STATE_KEY]: value });
  assert.equal(h.bridge.state, 'initializing');
  for (const loadState of [async () => undefined, async () => { throw new Error('unreachable'); }]) {
    const none = harness({ loadState });
    init(none);
    await settle();
    assert.deepEqual(answer(none).hostContext, LIGHT);
    assert.equal(APP_STATE_KEY in answer(none).hostContext, false);
  }
  // A saved null is a value: it comes back.
  const empty = harness({ loadState: async () => null });
  init(empty);
  await settle();
  assert.equal(answer(empty).hostContext[APP_STATE_KEY], null);
});

test('the state is in the ui/initialize answer only: a theme change never sends it again', async () => {
  const h = harness({ loadState: async () => ({ step: 2 }) });
  init(h);
  await settle();
  h.post(note('ui/notifications/initialized'));
  h.setContext(DARK);
  h.bridge.contextChanged();
  const params = (h.last() as { params: Record<string, unknown> }).params;
  assert.deepEqual(Object.keys(params).sort(), ['styles', 'theme']);
});

test('a panel that starts again before its state came gets only the second answer; a closed frame gets none', async () => {
  let n = 0;
  const h = harness({ loadState: async () => ({ start: (n += 1) }) });
  init(h, 1);
  init(h, 2);
  await settle();
  assert.deepEqual(h.sent.map((m) => (m as { id: unknown }).id), [2]);
  assert.deepEqual(answer(h).hostContext[APP_STATE_KEY], { start: 2 });
  const gone = harness({ loadState: async () => 1 });
  init(gone);
  gone.bridge.close();
  await settle();
  assert.equal(gone.sent.length, 0);
});
