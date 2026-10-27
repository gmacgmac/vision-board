// The app frame's protocol (D-047, docs/specification/apps.md § The panel protocol): JSON-RPC 2.0
// over postMessage in MCP Apps' shape. The core is DOM-free, so these run it with fake windows
// (app-frame-harness.ts). This file: sizes, the host context, the handshake, tools/call and the
// method table; app-frame-limits.test.ts: bad messages, other windows, theme changes, the caps.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { AppToolResult } from '#format';
import { APP_PROTOCOL_VERSION, APP_SIZE, APP_STYLE_VARIABLES, LEDGER_FORMAT, PANEL_ERRORS } from '#format';
import { hostStyles, panelSize, PROBLEM_WORDS } from '../src/index.ts';
import { errorOf, harness, LIGHT, note, ready, req, settle } from './app-frame-harness.ts';

test('panelSize: the agent\'s size, else the manifest\'s, else the default, held to APP_SIZE', () => {
  assert.deepEqual(panelSize({ id: 'a' }), { w: APP_SIZE.w.default, h: APP_SIZE.h.default });
  assert.deepEqual(panelSize({ id: 'a' }, { w: 500, h: 200 }), { w: 500, h: 200 });
  assert.deepEqual(panelSize({ id: 'a', w: 360, h: 440 }, { w: 500, h: 200 }), { w: 360, h: 440 });
  assert.deepEqual(panelSize({ id: 'a', w: 10, h: 9999 }), { w: APP_SIZE.w.min, h: APP_SIZE.h.max });
  assert.deepEqual(panelSize({ id: 'a', w: Number.NaN, h: 300.6 }), { w: APP_SIZE.w.default, h: 301 });
});

test('hostStyles: every MCP Apps style variable carries its board token\'s value; empty ones are left out', () => {
  const asked: string[] = [];
  const styles = hostStyles((token) => { asked.push(token); return token === '--vb-font' ? '' : `value of ${token}`; });
  assert.deepEqual(asked, Object.values(APP_STYLE_VARIABLES));
  assert.equal(styles['--color-background-primary'], 'value of --vb-surface-card');
  assert.equal(styles['--color-text-inverse'], 'value of --vb-ink-on-fill');
  assert.equal('--font-sans' in styles, false);
  assert.equal(Object.keys(styles).length, Object.keys(APP_STYLE_VARIABLES).length - 1);
});

test('hostContext: theme, the panel\'s size, the style variables and platform web (apps.md § Host context)', () => {
  assert.deepEqual(LIGHT, {
    theme: 'light', containerDimensions: { width: 360, height: 440 },
    styles: { variables: { '--color-text-primary': 'rgb(24, 24, 27)' } }, platform: 'web',
  });
});

test('handshake: ui/initialize answers the host context, initialized makes the panel ready', () => {
  const h = harness();
  assert.equal(h.bridge.state, 'connecting');
  h.post(req(1, 'ui/initialize', { protocolVersion: APP_PROTOCOL_VERSION, appCapabilities: {} }));
  assert.deepEqual(h.last(), {
    jsonrpc: '2.0', id: 1,
    result: {
      protocolVersion: APP_PROTOCOL_VERSION, hostInfo: { name: 'vision-board', version: String(LEDGER_FORMAT) },
      hostCapabilities: { serverTools: {} }, hostContext: LIGHT,
    },
  });
  assert.equal(h.bridge.state, 'initializing');
  h.post(note('ui/notifications/initialized'));
  assert.equal(h.bridge.state, 'ready');
  assert.deepEqual(h.states, ['initializing', 'ready']);
  assert.equal(h.sent.length, 1, 'a notification gets no answer');
});

test('ui/initialize without a protocolVersion is bad params (-32602)', () => {
  const h = harness();
  h.post(req('a', 'ui/initialize', {}));
  assert.equal((h.last() as { error: { code: number } }).error.code, PANEL_ERRORS.invalidParams);
  assert.equal(h.bridge.state, 'connecting');
});

test('initialized before ui/initialize does not make the panel ready', () => {
  const h = harness();
  h.post(note('ui/notifications/initialized'));
  assert.equal(h.bridge.state, 'connecting');
  assert.equal(h.sent.length, 0);
});

test('ping answers {}', () => {
  const h = harness();
  h.post(req(7, 'ping'));
  assert.deepEqual(h.last(), { jsonrpc: '2.0', id: 7, result: {} });
});

test('tools/call forwards the name and arguments, and answers each call by its own id', async () => {
  let release!: () => void;
  const slow = new Promise<void>((r) => { release = r; });
  const h = harness({
    callTool: async (name, args) => {
      if (name === 'history') await slow;
      return { content: [{ type: 'text', text: `${name} ${JSON.stringify(args)}` }], isError: false };
    },
  });
  ready(h);
  h.post(req('h-1', 'tools/call', { name: 'history' }));
  h.post(req(2, 'tools/call', { name: 'evaluate', arguments: { expression: '12*3' } }));
  await settle();
  assert.deepEqual(h.last(), { jsonrpc: '2.0', id: 2, result: { content: [{ type: 'text', text: 'evaluate {"expression":"12*3"}' }], isError: false } });
  release();
  await settle();
  assert.deepEqual(h.last(), { jsonrpc: '2.0', id: 'h-1', result: { content: [{ type: 'text', text: 'history {}' }], isError: false } });
});

test('tools/call passes on the tool result only: content, structuredContent, isError', async () => {
  const h = harness({
    callTool: async () => ({ content: [{ type: 'text', text: '36' }], structuredContent: { value: 36 }, isError: false, extra: 'x' } as AppToolResult),
  });
  ready(h);
  h.post(req(3, 'tools/call', { name: 'evaluate', arguments: {} }));
  await settle();
  assert.deepEqual(h.last(), { jsonrpc: '2.0', id: 3, result: { content: [{ type: 'text', text: '36' }], structuredContent: { value: 36 }, isError: false } });
});

test('tools/call refused by the board answers -32000 with the problem code, plain words and the detail', async () => {
  const h = harness({ callTool: async () => { throw { problem: 'needs-approval', detail: 'Press Allow on card 4.' }; } });
  ready(h);
  h.post(req(4, 'tools/call', { name: 'evaluate', arguments: { expression: '1' } }));
  await settle();
  assert.deepEqual(errorOf(h.last()), {
    code: PANEL_ERRORS.failed, message: PROBLEM_WORDS['needs-approval'], data: { problem: 'needs-approval', detail: 'Press Allow on card 4.' },
  });
});

test('a call that fails with no problem code is app-failed', async () => {
  const h = harness({ callTool: async () => { throw new Error('socket hang up'); } });
  ready(h);
  h.post(req(5, 'tools/call', { name: 'evaluate' }));
  await settle();
  assert.deepEqual(errorOf(h.last()), { code: PANEL_ERRORS.failed, message: PROBLEM_WORDS['app-failed'], data: { problem: 'app-failed' } });
});

test('every problem code a panel can get has plain words (apps.md § Errors)', () => {
  for (const code of ['needs-approval', 'invalid', 'app-invalid', 'app-failed', 'app-busy', 'app-timeout', 'too-large', 'app-not-found', 'not-found']) {
    assert.match(PROBLEM_WORDS[code] ?? '', /^[A-Z].*\.$/, code);
    assert.ok(PROBLEM_WORDS[code]!.length <= 60, `${code}: few words`);
  }
});

test('tools/call with bad params is -32602 and never reaches callTool', async () => {
  const h = harness();
  ready(h);
  const bad = [undefined, {}, { name: '' }, { name: 'Evaluate' }, { name: 'evaluate', arguments: [1] }, { name: 'evaluate', arguments: 'x' }, [1, 2]];
  bad.forEach((params, i) => h.post({ jsonrpc: '2.0', id: 10 + i, method: 'tools/call', ...(params !== undefined && { params }) }));
  await settle();
  const errors = h.sent.slice(1).map((m) => [(m as { id: number }).id, errorOf(m).code]);
  assert.deepEqual(errors, bad.map((_, i) => [10 + i, PANEL_ERRORS.invalidParams]));
  assert.equal(h.calls.length, 0);
});

test('a request for a method the board does not know is -32601; a notification of one is ignored', () => {
  const h = harness();
  h.post(req(8, 'resources/read', { uri: 'ui://x' }));
  assert.equal(errorOf(h.last()).code, PANEL_ERRORS.methodNotFound);
  assert.equal((h.last() as { id: number }).id, 8);
  h.post(req(9, 'toString'));
  assert.equal(errorOf(h.last()).code, PANEL_ERRORS.methodNotFound, 'no method from the prototype');
  const before = h.sent.length;
  h.post(note('ui/notifications/tool-input'));
  assert.equal(h.sent.length, before);
});

test('a notification sent with an id is an invalid request; a request sent without one is ignored', () => {
  const h = harness();
  h.post(req(11, 'ui/notifications/initialized'));
  assert.equal(errorOf(h.last()).code, PANEL_ERRORS.invalidRequest);
  const before = h.sent.length;
  h.post(note('ping'));
  h.post(note('ui/initialize', { protocolVersion: APP_PROTOCOL_VERSION }));
  assert.equal(h.sent.length, before);
  assert.equal(h.bridge.state, 'connecting');
});
