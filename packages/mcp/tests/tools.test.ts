// The generated tool list (api.md 46-50): current with openapi.json, one tool per x-agent
// operation in route-table order, names and descriptions every client accepts, plain schemas
// (no $ref, $id, $schema, discriminator or x- key; an object at the root) that compile as JSON
// Schema 2020-12, no merged input named twice, and the annotations of point 49.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import { OPERATIONS } from '../../format/src/index.ts';
import { INSTRUCTIONS, INSTRUCTIONS_JOINED, TOOL_FILE, routeOf } from '../src/index.ts';

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const { tools } = TOOL_FILE;
const WRITES = ['join', 'request_grant', 'write_board'];

test('tools.generated.json is current with openapi.json (gen-api --check)', () => {
  const out = execFileSync(process.execPath, ['scripts/gen-api.mjs', '--check'], { cwd: ROOT, encoding: 'utf8' });
  assert.match(out, /generated files are current/);
});

test('one tool per x-agent operation, in the route table\'s order', () => {
  const agentOps = Object.values(OPERATIONS).filter((o) => o.xAgent).map((o) => o.operationId);
  assert.deepEqual(tools.map((t) => t.name), agentOps);
});

test('names fit every client: ^[a-z][a-z0-9_]{0,39}$', () => {
  for (const t of tools) assert.match(t.name, /^[a-z][a-z0-9_]{0,39}$/);
});

test('descriptions: the first sentence ends with a full stop, the whole under 2,048 characters', () => {
  for (const t of tools) {
    const first = t.description.split(/(?<=[.!?])\s/)[0]!;
    assert.ok(first.endsWith('.'), `${t.name}: "${first}"`);
    assert.ok(t.description.length < 2048, `${t.name}: ${t.description.length} characters`);
    assert.ok(t.title.length > 0, `${t.name} has a title`);
  }
});

test('no tool description and no instructions tell an agent about archived boards (N39 ruling 3)', () => {
  for (const t of tools) assert.doesNotMatch(`${t.title} ${t.description}`, /archiv/i, t.name);
  for (const text of [INSTRUCTIONS, INSTRUCTIONS_JOINED]) assert.doesNotMatch(text, /archiv/i);
});

test('the instructions and the board reads tell an agent what `locked` means: stop and tell the person (N40 ruling 3)', () => {
  for (const text of [INSTRUCTIONS, INSTRUCTIONS_JOINED]) assert.match(text, /`locked`[^.]*read-only[^.]*answers `locked`, so tell the person in one line and stop\./);
  for (const name of ['list_boards', 'get_board']) assert.match(tools.find((t) => t.name === name)!.description, /`locked: true`/, name);
  assert.match(tools.find((t) => t.name === 'request_grant')!.description, /locked board takes no request \(`locked`, 423\)/);
});

test('the instructions teach the answer model (D-045): ✓ and ✗ read check and cross, a note never answers, no More context', () => {
  for (const text of [INSTRUCTIONS, INSTRUCTIONS_JOINED]) {
    assert.match(text, /✓ reads `check`, ✗ reads `cross`/);
    assert.match(text, /A note never answers a card/);
    assert.doesNotMatch(text, /more context|yes or no/i);
  }
  const check = tools.find((t) => t.name === 'check_responses')!.description;
  assert.match(check, /✓ reads `check` and ✗ reads `cross`/);
  assert.doesNotMatch(check, /`means/);
});

test('write_board, join and request_grant tell the agent about the `secret` argument', () => {
  for (const name of WRITES) assert.match(tools.find((t) => t.name === name)!.description, /`secret` argument/, name);
});

/** Every object key anywhere in a value, with its JSON Pointer. */
function keys(v: unknown, at = ''): [string, string][] {
  if (Array.isArray(v)) return v.flatMap((x, i) => keys(x, `${at}/${i}`));
  if (typeof v !== 'object' || v === null) return [];
  return Object.entries(v).flatMap(([k, x]) => [[k, `${at}/${k}`] as [string, string], ...keys(x, `${at}/${k}`)]);
}

test('schemas are plain: no $ref, $id, $schema, $defs, discriminator or x- key anywhere', () => {
  for (const t of tools) {
    const bad = keys(t).filter(([k]) => ['$ref', '$id', '$schema', '$defs', 'discriminator'].includes(k) || k.startsWith('x-'));
    assert.deepEqual(bad.map(([, at]) => at), [], t.name);
  }
});

test('an object at the root of every input and output: no root oneOf, anyOf or allOf; inputs closed', () => {
  for (const t of tools) {
    for (const [which, s] of [['inputSchema', t.inputSchema], ['outputSchema', t.outputSchema]] as const) {
      assert.equal(s.type, 'object', `${t.name} ${which}`);
      for (const k of ['oneOf', 'anyOf', 'allOf']) assert.equal(k in s, false, `${t.name} ${which} has a root ${k}`);
    }
    assert.equal(t.inputSchema.additionalProperties, false, `${t.name} input is closed`);
  }
});

test('no two merged inputs share a name, and the route names every input once', () => {
  for (const t of tools) {
    const r = routeOf(t.name);
    const names = [...r.path, ...r.query, ...r.body, ...(r.secret ? ['secret'] : [])];
    assert.equal(new Set(names).size, names.length, `${t.name}: ${names}`);
    assert.deepEqual(Object.keys(t.inputSchema.properties as object).sort(), [...names].sort(), t.name);
  }
});

test('every inputSchema and outputSchema compiles as JSON Schema 2020-12 (strict)', () => {
  const ajv = new Ajv2020({ strict: true, strictRequired: false, allErrors: true });
  for (const t of tools) {
    assert.doesNotThrow(() => ajv.compile(t.inputSchema), `${t.name} inputSchema`);
    assert.doesNotThrow(() => ajv.compile(t.outputSchema), `${t.name} outputSchema`);
  }
});

test('annotations (api.md 49): reads are read-only; writes are not destructive and not idempotent; all closed-world', () => {
  for (const t of tools) {
    const read = OPERATIONS[t.name as keyof typeof OPERATIONS].method === 'GET';
    assert.deepEqual(t.annotations, read
      ? { readOnlyHint: true, openWorldHint: false }
      : { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false }, t.name);
  }
  assert.deepEqual(tools.filter((t) => !t.annotations.readOnlyHint).map((t) => t.name).sort(), WRITES);
});

test('list_apps (D-047 ruling 12): a read with the secret, telling the agent how to draw an app card and that only the person allows', () => {
  const t = tools.find((x) => x.name === 'list_apps');
  assert.ok(t, 'generated from openapi.json');
  assert.equal(t.annotations.readOnlyHint, true);
  assert.deepEqual(Object.keys(t.inputSchema.properties as object), ['secret']);
  assert.equal(routeOf('list_apps').secret, true);
  assert.match(t.description, /kind `app`/);
  assert.match(t.description, /Only the person allows an app/);
  assert.equal(tools.some((x) => x.name === 'call_app_tool'), false, 'agents run their own code; only the panel calls app tools');
});

test('every tool whose request has an example ends its description with it, compact (no per-tool code)', () => {
  const doc = JSON.parse(readFileSync(new URL('../../format/schema/openapi.json', import.meta.url), 'utf8'));
  const withBody = Object.values<Record<string, any>>(doc.paths).flatMap((item) => Object.values(item))
    .filter((op) => op['x-agent'] === true && op.requestBody?.content?.['application/json']);
  assert.deepEqual(withBody.map((op) => op.operationId).sort(), WRITES, 'the operations with a JSON body');
  for (const op of withBody) {
    const media = op.requestBody.content['application/json'];
    assert.ok(media.example ?? media.examples, `${op.operationId} has a request example`);
    const example = media.example ?? Object.values<any>(media.examples)[0].value;
    assert.ok(tools.find((t) => t.name === op.operationId)!.description.endsWith(` Example: ${JSON.stringify(example)}`), op.operationId);
  }
});

test('write_board ends with a wrapped region, nodes and a link by key, and still fits the 2,048 characters clients keep', () => {
  const d = tools.find((t) => t.name === 'write_board')!.description;
  const shown = JSON.parse(d.slice(d.indexOf(' Example: ') + ' Example: '.length)) as { items: { type: string; node?: unknown; region?: unknown; from?: unknown }[] };
  assert.deepEqual(shown.items.map((i) => i.type), ['region', 'node', 'node', 'link']);
  assert.ok(shown.items.every((i) => (i.type === 'node' ? i.node : i.type === 'region' ? i.region : i.from)), 'each item wraps its content');
  assert.ok(d.length < 2048, `${d.length} characters`);
});

test('tools with no request body carry no example', () => {
  for (const t of tools.filter((x) => !WRITES.includes(x.name))) assert.doesNotMatch(t.description, /Example: /, t.name);
});
