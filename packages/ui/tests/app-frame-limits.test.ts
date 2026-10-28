// The app frame's protocol, continued (apps.md § The panel protocol, § Limits): messages that are
// not JSON-RPC 2.0, messages from other windows, nothing before initialized, theme changes, the
// message and call caps, and a panel that closes or starts again. Fake windows: app-frame-harness.ts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { AppToolResult } from '#format';
import { APP_LIMITS, APP_PROTOCOL_VERSION, PANEL_ERRORS } from '#format';
import { FRAME_CALLS, PROBLEM_WORDS } from '../src/index.ts';
import { DARK, errorOf, harness, LIGHT, note, ready, req, settle } from './app-frame-harness.ts';

test('a message that is not JSON-RPC 2.0 is an invalid request (-32600), with its id when it has a good one', () => {
  const h = harness();
  const cases: [unknown, unknown][] = [
    ['hello', null], [42, null], [null, null], [[req(1, 'ping')], null],
    [{ id: 1, method: 'ping' }, 1], [{ jsonrpc: '1.0', id: 'x', method: 'ping' }, 'x'],
    [{ jsonrpc: '2.0', id: 2, method: 7 }, 2], [{ jsonrpc: '2.0', id: 3, method: '' }, 3],
    [{ jsonrpc: '2.0', id: { n: 1 }, method: 'ping' }, null], [{ jsonrpc: '2.0', id: null, method: 'ping' }, null],
    [{ jsonrpc: '2.0', id: 1.5, method: 'ping' }, null], [{ jsonrpc: '2.0', id: true, method: 'ping' }, null],
    [{ jsonrpc: '2.0', id: 'x'.repeat(300), method: 'ping' }, null], [{ jsonrpc: '2.0', id: 4 }, 4],
  ];
  for (const [message, id] of cases) {
    h.post(message);
    const m = h.last() as { id: unknown; error: { code: number } };
    assert.deepEqual([m.id, m.error.code], [id, PANEL_ERRORS.invalidRequest], JSON.stringify(message));
  }
  assert.equal(h.sent.length, cases.length);
});

test('a response from the panel gets no answer (the board sends it no requests)', () => {
  const h = harness();
  h.post({ jsonrpc: '2.0', id: 1, result: {} });
  h.post({ jsonrpc: '2.0', id: 2, error: { code: -1, message: 'x' } });
  assert.equal(h.sent.length, 0);
});

test('a message from any window but the card\'s frame is ignored: no answer, no call, not counted', async () => {
  const h = harness();
  h.postFromOther(req(1, 'ui/initialize', { protocolVersion: APP_PROTOCOL_VERSION }));
  h.postFromOther(note('ui/notifications/initialized'));
  h.postFromOther(req(2, 'tools/call', { name: 'evaluate' }));
  h.postFromOther('junk');
  for (let i = 0; i < 100; i += 1) h.postFromOther(req(i, 'ping'));
  await settle();
  assert.deepEqual([h.sent.length, h.calls.length, h.bridge.state], [0, 0, 'connecting']);
  h.post(req(3, 'ping'));
  assert.deepEqual(h.last(), { jsonrpc: '2.0', id: 3, result: {} }, 'the frame is not rate-limited by others');
});

test('nothing is posted to the panel before it says initialized', () => {
  const h = harness();
  assert.equal(h.bridge.post('ui/notifications/host-context-changed', { theme: 'dark' }), false);
  h.setContext(DARK);
  h.bridge.contextChanged();
  assert.equal(h.sent.length, 0);
  h.post(req(1, 'ui/initialize', { protocolVersion: APP_PROTOCOL_VERSION }));
  h.setContext(LIGHT);
  h.bridge.contextChanged();
  assert.equal(h.sent.length, 1, 'only the answer to ui/initialize');
});

test('a theme change sends host-context-changed with only the parts that changed', () => {
  const h = harness();
  ready(h);
  h.setContext(DARK);
  h.bridge.contextChanged();
  assert.deepEqual(h.last(), { jsonrpc: '2.0', method: 'ui/notifications/host-context-changed', params: { theme: 'dark', styles: DARK.styles } });
  const before = h.sent.length;
  h.bridge.contextChanged();
  assert.equal(h.sent.length, before, 'no change, nothing sent');
});

test('a change between ui/initialize and initialized is sent once the panel is ready', () => {
  const h = harness();
  h.post(req(1, 'ui/initialize', { protocolVersion: APP_PROTOCOL_VERSION }));
  h.setContext(DARK);
  h.bridge.contextChanged();
  assert.equal(h.sent.length, 1);
  h.post(note('ui/notifications/initialized'));
  assert.deepEqual(h.last(), { jsonrpc: '2.0', method: 'ui/notifications/host-context-changed', params: { theme: 'dark', styles: DARK.styles } });
});

test('post sends only the board\'s own notifications, and only to a ready panel', () => {
  const h = harness();
  ready(h);
  assert.equal(h.bridge.post('ui/notifications/host-context-changed', { theme: 'dark' }), true);
  assert.equal(h.bridge.post('tools/call' as 'ui/notifications/host-context-changed', {}), false);
  assert.equal(h.sent.length, 2);
});

test(`a panel may send ${APP_LIMITS.panelMessagesPerSecond} messages a second: a request past that is app-busy, a notification ignored`, () => {
  let escapes = 0;
  const h = harness({ onEscape: () => { escapes += 1; } });
  for (let i = 0; i < APP_LIMITS.panelMessagesPerSecond; i += 1) h.post(req(i, 'ping'));
  assert.equal(h.sent.length, APP_LIMITS.panelMessagesPerSecond);
  assert.ok(h.sent.every((m) => 'result' in m));
  h.tick(999);
  h.post(req('over', 'ping'));
  assert.deepEqual(errorOf(h.last()), { code: PANEL_ERRORS.failed, message: PROBLEM_WORDS['app-busy'], data: { problem: 'app-busy' } });
  h.post(note('ui/notifications/escape'));
  assert.equal(escapes, 0, 'over the cap, a notification is dropped');
  h.tick(1);
  h.post(req('again', 'ping'));
  assert.deepEqual(h.last(), { jsonrpc: '2.0', id: 'again', result: {} }, 'a second later the window has moved on');
});

test(`at most ${FRAME_CALLS} tool calls wait at once (the host's running plus queue); one more is app-busy without a call`, async () => {
  assert.equal(FRAME_CALLS, APP_LIMITS.inFlight + APP_LIMITS.queue);
  const waiting: (() => void)[] = [];
  let made = 0;
  const h = harness({
    callTool: () => { made += 1; return new Promise<AppToolResult>((r) => waiting.push(() => r({ content: [], isError: false }))); },
  });
  ready(h);
  for (let i = 0; i < FRAME_CALLS; i += 1) { h.post(req(i, 'tools/call', { name: 'evaluate' })); h.tick(50); }
  await settle();
  h.post(req('one-more', 'tools/call', { name: 'evaluate' }));
  await settle();
  assert.equal(made, FRAME_CALLS);
  assert.equal(errorOf(h.last()).data?.problem, 'app-busy');
  waiting.shift()!();
  await settle();
  h.post(req('after', 'tools/call', { name: 'evaluate' }));
  await settle();
  assert.equal(made, FRAME_CALLS + 1, 'one answered, so the next goes through');
});

test('ui/notifications/escape calls onEscape (focus back to the card); without fitHeight (the appFit flag off) size-changed is ignored', () => {
  let escapes = 0;
  const h = harness({ onEscape: () => { escapes += 1; } });
  ready(h);
  h.post(note('ui/notifications/escape'));
  h.post(note('ui/notifications/size-changed', { width: 900, height: 900 }));
  assert.equal(escapes, 1);
  assert.equal(h.sent.length, 1);
});

test('close: later messages are ignored and answers still on their way are dropped', async () => {
  let release!: () => void;
  const h = harness({ callTool: () => new Promise<AppToolResult>((r) => { release = () => r({ content: [], isError: false }); }) });
  ready(h);
  h.post(req(1, 'tools/call', { name: 'evaluate' }));
  await settle();
  h.bridge.close();
  release();
  h.post(req(2, 'ping'));
  await settle();
  assert.equal(h.sent.length, 1);
  assert.equal(h.bridge.state, 'closed');
  assert.deepEqual(h.states, ['initializing', 'ready', 'closed']);
  h.bridge.contextChanged();
  assert.equal(h.bridge.post('ui/notifications/host-context-changed', {}), false);
});

test('a panel that starts again (ui/initialize a second time) gets no answer meant for the one before', async () => {
  let release!: () => void;
  const h = harness({ callTool: () => new Promise<AppToolResult>((r) => { release = () => r({ content: [], isError: false }); }) });
  ready(h);
  h.post(req(1, 'tools/call', { name: 'evaluate' }));
  await settle();
  h.post(req(1, 'ui/initialize', { protocolVersion: APP_PROTOCOL_VERSION }));
  assert.equal(h.bridge.state, 'initializing');
  const before = h.sent.length;
  release();
  await settle();
  assert.equal(h.sent.length, before);
  h.post(note('ui/notifications/initialized'));
  assert.equal(h.bridge.state, 'ready');
});
