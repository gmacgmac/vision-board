// The generated tool list (api.md 46-50): current with openapi.json, one tool per x-agent
// operation in route-table order, names and descriptions every client accepts, plain schemas
// (no $ref, $id, $schema, discriminator or x- key; an object at the root) that compile as JSON
// Schema 2020-12, no merged input named twice, the annotations of point 49, no output schema and
// no example in a description (api.md 47-48), and the list's size budget.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import { OPERATIONS } from '#format';
import { INSTRUCTIONS, INSTRUCTIONS_JOINED, TOOL_FILE, routeOf } from '../src/index.ts';

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const { tools } = TOOL_FILE;
const WRITES = ['join', 'read_attachment', 'request_grant', 'write_board'];

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

test('the instructions and the board reads tell an agent what `locked` and `readOnly` mean: stop and tell the person (N40 ruling 3, D-085)', () => {
  for (const text of [INSTRUCTIONS, INSTRUCTIONS_JOINED]) {
    assert.match(text, /`locked`[^.]*unlocks it[^.]*answers `locked`, so tell the person in one line and stop\./);
    assert.match(text, /`readOnly`[^.]*whole ledger[^.]*answers `read-only` and writes nothing\./);
  }
  for (const name of ['list_boards', 'get_board']) assert.match(tools.find((t) => t.name === name)!.description, /`locked: true`[\s\S]*`readOnly: true`/, name);
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

test('an object at the root of every input: no root oneOf, anyOf or allOf; closed', () => {
  for (const t of tools) {
    const s = t.inputSchema;
    assert.equal(s.type, 'object', t.name);
    for (const k of ['oneOf', 'anyOf', 'allOf']) assert.equal(k in s, false, `${t.name} has a root ${k}`);
    assert.equal(s.additionalProperties, false, `${t.name} input is closed`);
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

test('every inputSchema compiles as JSON Schema 2020-12 (strict)', () => {
  const ajv = new Ajv2020({ strict: true, strictRequired: false, allErrors: true });
  for (const t of tools) assert.doesNotThrow(() => ajv.compile(t.inputSchema), `${t.name} inputSchema`);
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

test('no tool declares an outputSchema; each description says in words what comes back', () => {
  for (const t of tools) {
    assert.equal('outputSchema' in t, false, t.name);
    assert.match(t.description, /\b(Returns|returns)\b/, `${t.name} says what it returns`);
  }
});

test('no tool description carries an example: examples live in the skill, the schemas and the refusals', () => {
  for (const t of tools) assert.doesNotMatch(t.description, /Example:/, t.name);
});

/** The size budget: the whole `tools/list` and each tool, as compact JSON. Set from the trimmed
 * list plus about 10% (task 2026-10-25_board-agent_tool-list-trim); raise it only on purpose. Raised for the
 * three reads' `ledger` input (CONSOLIDATE_01, D-084 8), for `readOnly: true` on list_boards and get_board (SKILL_01, D-085), and
 * for a node item's `insert`, two card references (insert-markdown-signals ACT_01, point 424). */
const LIST_CAP = 32_000;
const TOOL_CAPS: Record<string, number> = {
  list_boards: 760, get_board: 1150, show_node: 1150, show_container: 850, show_layout: 1050, list_open: 1150,
  check_responses: 2600, join: 1600, request_grant: 1900, write_board: 17_350, list_apps: 1350, read_attachment: 2450,
};

test('the tool list fits its size budget, as a whole and per tool', () => {
  const size = (v: unknown) => JSON.stringify(v).length;
  assert.ok(size({ tools }) <= LIST_CAP, `tools/list is ${size({ tools })} characters, over ${LIST_CAP}`);
  assert.deepEqual(Object.keys(TOOL_CAPS).sort(), tools.map((t) => t.name).sort(), 'one cap per tool');
  for (const t of tools) assert.ok(size(t) <= TOOL_CAPS[t.name]!, `${t.name} is ${size(t)} characters, over ${TOOL_CAPS[t.name]}`);
});
