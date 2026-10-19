// Ledger v17 and the app contract (api.md 150-153, D-047, docs/specification/apps.md): an app card
// names its app, the person's allow names the app and its code's hash, and the manifest, a tool's
// shape and the two app operations' bodies have one JSON Schema each. The schema and the hand
// validator (eventProblems) give the same verdict on every line here, and the numbers the schema
// holds are the ones packages/format defines (APP_SIZE, APP_FILES, the patterns).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { AppManifest } from '../../../packages/format/src/index.ts';
import {
  APP_FILES, APP_HASH_PATTERN, APP_ID, APP_SIZE, APP_STATES, APP_TOOL_NAME, ID_PATTERN, eventProblems,
} from '../../../packages/format/src/index.ts';
import { LEDGER_EVENT_ID, SCHEMA_BASE, compileSchema, ledgerLineProblems, schemaProblems } from '../server/schema.ts';
import { AGENT, DROP, PERSON, patch } from './schema-cases.ts';

type Rec = Record<string, any>;
const LEDGER = `${SCHEMA_BASE}schema/ledger/18/`;
const MANIFEST = `${SCHEMA_BASE}schema/app/manifest.schema.json`;
const API = `${SCHEMA_BASE}schema/api/`;
const HASH = 'a'.repeat(64);

const APP_NODE: Rec = {
  ...AGENT, type: 'node', board: 'b', n: 4, ver: 1, key: 'calc-1',
  node: { region: 'plan', kind: 'app', title: 'Calculator', body: 'Try a sum.', app: { id: 'calculator', w: 360, h: 440 } },
};
const appAct = (action: string, extra: Rec = {}): Rec => ({ ...PERSON, type: 'act', action, app: 'calculator', ...extra });

/** Both validators' verdicts on one stored line: true = valid. */
const verdict = (e: unknown) => {
  const line = JSON.parse(JSON.stringify(e)); // drop `undefined` fields, as a written line would
  return { schema: schemaProblems(LEDGER_EVENT_ID, line).length === 0, hand: eventProblems(line).length === 0 };
};

const VALID: [string, Rec][] = [
  ['an app card with its size', APP_NODE],
  ['an app card with no size (the manifest or the default sets it)', patch(APP_NODE, 'node.app', { id: 'calculator' })],
  ['an app card at the smallest size', patch(APP_NODE, 'node.app', { id: 'calculator', w: APP_SIZE.w.min, h: APP_SIZE.h.min })],
  ['an app card at the largest size', patch(APP_NODE, 'node.app', { id: 'calculator', w: APP_SIZE.w.max, h: APP_SIZE.h.max })],
  ['an app card with tags and emphasis', { ...APP_NODE, node: { ...APP_NODE.node, tags: ['tool'], emphasis: true } }],
  ['the person allows an app', appAct('app-allow', { hash: HASH })],
  ['the person stops an app', appAct('app-revoke')],
];

const BROKEN: [string, Rec][] = [
  ['an app card without app', patch(APP_NODE, 'node.app', DROP)],
  ['app on a question', patch(APP_NODE, 'node.kind', 'question')],
  ['app on a note', patch(APP_NODE, 'node.kind', 'note')],
  ['an app card with a size word', patch(APP_NODE, 'node.size', 'l')],
  ['an app card without an app id', patch(APP_NODE, 'node.app.id', DROP)],
  ['an app id in upper case', patch(APP_NODE, 'node.app.id', 'Calculator')],
  ['an app id with a dot dot', patch(APP_NODE, 'node.app.id', '..')],
  ['an app id with a slash', patch(APP_NODE, 'node.app.id', 'apps/calculator')],
  ['an app id with %2e', patch(APP_NODE, 'node.app.id', '%2e%2e')],
  ['an app width under the least', patch(APP_NODE, 'node.app.w', APP_SIZE.w.min - 1)],
  ['an app width over the most', patch(APP_NODE, 'node.app.w', APP_SIZE.w.max + 1)],
  ['an app height under the least', patch(APP_NODE, 'node.app.h', APP_SIZE.h.min - 1)],
  ['an app height over the most', patch(APP_NODE, 'node.app.h', APP_SIZE.h.max + 1)],
  ['an app width as a fraction', patch(APP_NODE, 'node.app.w', 360.5)],
  ['an app width as text', patch(APP_NODE, 'node.app.w', '360px')],
  ['an unknown field in app', patch(APP_NODE, 'node.app.url', 'https://example.com')],
  ['app as text', patch(APP_NODE, 'node.app', 'calculator')],
  ['an allow without hash', appAct('app-allow')],
  ['an allow without app', appAct('app-allow', { app: undefined, hash: HASH })],
  ['an allow with a short hash', appAct('app-allow', { hash: 'abc123' })],
  ['an allow with an upper-case hash', appAct('app-allow', { hash: 'A'.repeat(64) })],
  ['an allow with a bad app id', appAct('app-allow', { app: '../calculator', hash: HASH })],
  ['an allow naming a card', appAct('app-allow', { hash: HASH, n: 4 })],
  ['an allow naming a board', appAct('app-allow', { hash: HASH, board: 'b' })],
  ['a stop without app', appAct('app-revoke', { app: undefined })],
  ['a stop with a hash', appAct('app-revoke', { hash: HASH })],
  ['a stop naming a container', appAct('app-revoke', { region: 'plan' })],
  ['a stop naming a group', appAct('app-revoke', { nodes: [1, 2] })],
];

test('ledger v17: each app card and app act line here passes both validators', () => {
  for (const [name, e] of VALID) assert.deepEqual(verdict(e), { schema: true, hand: true }, name);
});

test(`ledger v17: ${BROKEN.length} broken app lines, each refused by both validators`, () => {
  for (const [name, e] of BROKEN) assert.deepEqual(verdict(e), { schema: false, hand: false }, name);
});

test('an app card missing its app, or another card naming one, gets one problem in plain words', () => {
  assert.deepEqual(ledgerLineProblems(JSON.stringify(patch(APP_NODE, 'node.app', DROP))), [{ pointer: '/node/app', detail: '`app` is required' }]);
  const [other] = ledgerLineProblems(JSON.stringify(patch(APP_NODE, 'node.kind', 'question')));
  assert.equal(other?.pointer, '/node/app');
  assert.match(other!.detail, /only an app card names an app/i);
  const [sized] = ledgerLineProblems(JSON.stringify(patch(APP_NODE, 'node.size', 'm')));
  assert.equal(sized?.pointer, '/node/size');
  assert.match(sized!.detail, /app\.w and app\.h/);
  const sent = (node: Rec) => schemaProblems(`${LEDGER}events/node.schema.json#/$defs/sent`, { type: 'node', node });
  assert.deepEqual(sent(APP_NODE.node), []);
  assert.deepEqual(sent(patch(APP_NODE.node, 'app', DROP)), [{ pointer: '/node/app', detail: '`app` is required' }]);
});

test('the schema holds the numbers and patterns packages/format defines', () => {
  const common = compileSchema(`${LEDGER}common.schema.json`).schema as Rec;
  for (const d of ['w', 'h'] as const) {
    const s = common.$defs[d === 'w' ? 'appWidth' : 'appHeight'];
    assert.deepEqual([s.minimum, s.maximum, s.type], [APP_SIZE[d].min, APP_SIZE[d].max, 'integer'], d);
  }
  assert.equal(common.$defs.appHash.pattern, APP_HASH_PATTERN.source);
  assert.equal(APP_ID.source, ID_PATTERN.source);
  const manifest = compileSchema(MANIFEST).schema as Rec;
  assert.equal(manifest.properties.panel.default, APP_FILES.panel);
  assert.equal(manifest.properties.tools.default, APP_FILES.tools);
  assert.equal(manifest.$defs.toolName.pattern, APP_TOOL_NAME.source);
  const list = compileSchema(`${API}list-apps-response.schema.json`).schema as Rec;
  assert.deepEqual(list.$defs.app.properties.state.enum, [...APP_STATES]);
});

// ---- The manifest (schema/app/manifest.schema.json) ----

const OK_MANIFEST = { id: 'calculator', title: 'Calculator', version: '1.0.0' };
const FULL_MANIFEST = {
  ...OK_MANIFEST, panel: 'panel.html', tools: 'tools.mjs', size: { w: 360, h: 440 }, env: ['RATES_API_KEY'],
  csp: { connectDomains: ['https://api.example.com'], resourceDomains: ['https://cdn.example.com:8443'] },
};
const manifest = (value: unknown) => schemaProblems(MANIFEST, value);

test('manifest: the least an app needs, and every field it may have', () => {
  assert.deepEqual(manifest(OK_MANIFEST), []);
  assert.deepEqual(manifest(FULL_MANIFEST), []);
  assert.deepEqual(manifest({ ...OK_MANIFEST, panel: 'calc_v2.html', tools: 'calc-tools.mjs' }), []);
});

test('manifest: AppManifest names every field the schema has, and no other', () => {
  const every: Required<AppManifest> = { ...FULL_MANIFEST, csp: { connectDomains: [], resourceDomains: [] } };
  assert.deepEqual(manifest(every), []);
  assert.deepEqual(Object.keys(every).sort(), Object.keys((compileSchema(MANIFEST).schema as Rec).properties).sort());
});

test('manifest: unknown fields, missing fields and file names that are paths are refused', () => {
  const bad: [string, unknown][] = [
    ['an unknown field', { ...OK_MANIFEST, server: 'node app.js' }],
    ['no id', { title: 'Calculator', version: '1.0.0' }],
    ['no title', { id: 'calculator', version: '1.0.0' }],
    ['no version', { id: 'calculator', title: 'Calculator' }],
    ['a bad id', { ...OK_MANIFEST, id: 'Calculator' }],
    ['a blank title', { ...OK_MANIFEST, title: '  ' }],
    ['a panel in a folder', { ...OK_MANIFEST, panel: 'web/panel.html' }],
    ['a panel up a folder', { ...OK_MANIFEST, panel: '../panel.html' }],
    ['a panel with dot dot in its name', { ...OK_MANIFEST, panel: 'a..html' }],
    ['a panel at an absolute path', { ...OK_MANIFEST, panel: '/etc/panel.html' }],
    ['a hidden panel file', { ...OK_MANIFEST, panel: '.panel.html' }],
    ['a panel with a backslash', { ...OK_MANIFEST, panel: 'web\\panel.html' }],
    ['a panel that is not html', { ...OK_MANIFEST, panel: 'panel.js' }],
    ['tools in a folder', { ...OK_MANIFEST, tools: 'lib/tools.mjs' }],
    ['tools up a folder', { ...OK_MANIFEST, tools: '../tools.mjs' }],
    ['tools that are not a module file', { ...OK_MANIFEST, tools: 'tools.js' }],
    ['a size too narrow', { ...OK_MANIFEST, size: { w: APP_SIZE.w.min - 1, h: 300 } }],
    ['a size with no height', { ...OK_MANIFEST, size: { w: 360 } }],
    ['an env name in lower case', { ...OK_MANIFEST, env: ['rates_key'] }],
    ['an env name twice', { ...OK_MANIFEST, env: ['KEY', 'KEY'] }],
    ['a domain over http', { ...OK_MANIFEST, csp: { connectDomains: ['http://api.example.com'] } }],
    ['a wildcard domain', { ...OK_MANIFEST, csp: { connectDomains: ['https://*.example.com'] } }],
    ['a bare wildcard', { ...OK_MANIFEST, csp: { resourceDomains: ['*'] } }],
    ['a domain with a path', { ...OK_MANIFEST, csp: { connectDomains: ['https://api.example.com/v1'] } }],
    ['a domain with no scheme', { ...OK_MANIFEST, csp: { connectDomains: ['api.example.com'] } }],
    ['a domain in upper case', { ...OK_MANIFEST, csp: { connectDomains: ['https://API.example.com'] } }],
    ['an unknown csp field', { ...OK_MANIFEST, csp: { frameDomains: ['https://example.com'] } }],
  ];
  for (const [name, value] of bad) assert.notDeepEqual(manifest(value), [], name);
});

test('a tool, as its module exports it less run: a name every client takes, a description, object schemas', () => {
  const tool = (value: unknown) => schemaProblems(`${MANIFEST}#/$defs/tool`, value);
  const ok = {
    name: 'evaluate', description: 'Work out a sum.',
    inputSchema: { type: 'object', properties: { expression: { type: 'string' } }, required: ['expression'] },
    outputSchema: { type: 'object', properties: { value: { type: 'number' } } },
  };
  assert.deepEqual(tool(ok), []);
  assert.deepEqual(tool({ ...ok, outputSchema: undefined }), []);
  assert.notDeepEqual(tool({ ...ok, name: 'Evaluate' }), [], 'upper case');
  assert.notDeepEqual(tool({ ...ok, name: 'work out' }), [], 'a space');
  assert.notDeepEqual(tool({ ...ok, description: '' }), [], 'no description');
  assert.notDeepEqual(tool({ ...ok, inputSchema: { type: 'string' } }), [], 'input not an object');
  assert.notDeepEqual(tool({ ...ok, run: 'code' }), [], 'run is not part of the shape');
});

// ---- The two operations' bodies (schema/api/) ----

const api = (file: string, value: unknown) => schemaProblems(`${API}${file}.schema.json`, value);

test('list_apps: each app with its state, tools, hash and whether it is allowed', () => {
  const ready = { id: 'calculator', state: 'ready', title: 'Calculator', version: '1.0.0', size: { w: 360, h: 440 }, tools: ['evaluate', 'history'], hash: HASH, allowed: true };
  assert.deepEqual(api('list-apps-response', { apps: [ready] }), []);
  assert.deepEqual(api('list-apps-response', { apps: [{ ...ready, state: 'needs-approval', allowed: false, changed: true }] }), []);
  assert.deepEqual(api('list-apps-response', { apps: [{ id: 'gone', state: 'missing', tools: [], allowed: false }] }), []);
  const invalid = { id: 'calc', state: 'invalid', tools: [], allowed: false, problems: [{ file: 'app.json', pointer: '/panel', detail: '`panel` is not in the expected form' }] };
  assert.deepEqual(api('list-apps-response', { apps: [invalid] }), []);
  assert.notDeepEqual(api('list-apps-response', { apps: [{ ...ready, state: 'running' }] }), []);
  assert.notDeepEqual(api('list-apps-response', { apps: [{ ...ready, hash: 'short' }] }), []);
  assert.notDeepEqual(api('list-apps-response', { apps: [{ ...ready, secret: 'x' }] }), []);
});

test('call_app_tool: the request names a tool and its arguments; the answer is MCP\'s tool-result shape', () => {
  assert.deepEqual(api('app-call-request', { tool: 'evaluate', arguments: { expression: '12*3' } }), []);
  assert.deepEqual(api('app-call-request', { tool: 'history' }), []);
  assert.notDeepEqual(api('app-call-request', { arguments: {} }), [], 'no tool');
  assert.notDeepEqual(api('app-call-request', { tool: 'evaluate', arguments: [] }), [], 'arguments not an object');
  assert.notDeepEqual(api('app-call-request', { tool: 'evaluate', app: 'calculator' }), [], 'unknown field');
  const result = { content: [{ type: 'text', text: '{"value":36}' }], structuredContent: { value: 36 }, isError: false };
  assert.deepEqual(api('app-call-response', result), []);
  assert.deepEqual(api('app-call-response', { content: [{ type: 'text', text: 'Bad sum.' }], isError: true }), []);
  assert.notDeepEqual(api('app-call-response', { content: [], structuredContent: 36, isError: false }), [], 'structured content is an object');
  assert.notDeepEqual(api('app-call-response', { content: [{ type: 'image', text: 'x' }], isError: false }), [], 'text only');
  assert.notDeepEqual(api('app-call-response', { content: [] }), [], 'isError is required');
});
