// The generated tool list (api.md 46-50): current with openapi.json, one tool per x-agent
// operation in route-table order, names and descriptions every client accepts, plain schemas
// (no $ref, $id, $schema, discriminator or x- key; an object at the root) that compile as JSON
// Schema 2020-12, no merged input named twice, and the annotations of point 49.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
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
