// Ledger v11 schemas (api.md 2, 5-11, 56, 62, 66, 71, 81, 90, 93, 118): the JSON Schema is the one source, and the hand validator
// (eventProblems) must give the same verdict on every fixture line and on every broken line below.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  ACTION_IDS, ACT_SIZES, AGENT_ID_PATTERN, EVENT_TYPES, ID_PATTERN, KINDS, LIMITS, MODES, NODE_SIZES,
  ITEM_REMOVED, TIMESTAMP_PATTERN, eventProblems, readLedger,
} from '../../../packages/format/src/index.ts';
import {
  LEDGER_EVENT_ID, SCHEMA_BASE, compileSchema, ledgerLineProblems, schemaFiles, schemaProblems,
} from '../server/schema.ts';
import { ACTS, BROKEN, CONTAINER, DROP, GROUP, GROUP_MOVE, PERSON, V, VALID, act, long, patch } from './schema-cases.ts';

type Rec = Record<string, any>;
const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const LEDGER = `${SCHEMA_BASE}schema/ledger/11/`;
const COMMON = `${LEDGER}common.schema.json`;
const eventId = (type: string) => `${LEDGER}events/${type}.schema.json`;

const FIXTURES = [
  ...fs.readdirSync(path.join(ROOT, 'packages/format/fixtures')).filter((f) => f.endsWith('.ledger.jsonl'))
    .map((f) => path.join('packages/format/fixtures', f)),
  'apps/board/src/gallery/gallery.ledger.jsonl',
];
const linesOf = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8').trim().split('\n');
const docs = new Map(schemaFiles().map(({ schema }) => [schema.$id, schema as Rec]));
const doc = (id: string): Rec => docs.get(id) ?? assert.fail(`no schema ${id}`);

/** Both validators' verdicts on one stored line: true = valid. */
const verdict = (e: unknown) => ({
  schema: schemaProblems(LEDGER_EVENT_ID, e).length === 0,
  hand: eventProblems(e).length === 0,
});

// ---- 1. Fixtures ----

for (const rel of FIXTURES) {
  test(`fixture ${rel}: every line passes the schema and eventProblems, and the file passes context`, () => {
    const lines = linesOf(rel);
    lines.forEach((line, i) => {
      assert.deepEqual(ledgerLineProblems(line), [], `${rel} line ${i + 1}`);
      assert.deepEqual(eventProblems(JSON.parse(line)), [], `${rel} line ${i + 1}`);
    });
    assert.deepEqual(readLedger(lines).problems, []);
  });
}

// ---- 3. Valid v11 lines for every event type and action ----

test('every event type has a valid v11 line, and every one passes both validators', () => {
  assert.deepEqual(Object.keys(VALID).sort(), [...EVENT_TYPES].sort());
  for (const [type, e] of Object.entries(VALID)) {
    assert.deepEqual(schemaProblems(LEDGER_EVENT_ID, e), [], type);
    assert.deepEqual(eventProblems(e), [], type);
  }
});

test('every action has a valid v11 act, and every one passes both validators', () => {
  assert.deepEqual(Object.keys(ACTS).sort(), [...ACTION_IDS].sort());
  for (const action of ACTION_IDS) {
    assert.deepEqual(schemaProblems(LEDGER_EVENT_ID, act(action)), [], action);
    assert.deepEqual(eventProblems(act(action)), [], action);
  }
});

test('edge lines both accept: a v2 line with a free-form agent, 200 emoji, a grid region without lanes, group notes, board access', () => {
  const lines = [
    { ...VALID.board, v: 2, agent: 'kiro' },
    { ...VALID.node, node: { ...VALID.node!.node, title: '😀'.repeat(200) } },
    { ...VALID.region, region: { id: 'grid', title: 'Grid', mode: 'grid', columns: 12 } },
    { ...VALID.region, region: { id: 'radial', title: 'Hub', mode: 'radial', center: 7 } },
    // api.md 62: `nodes` in place of `n` and `ver`, on a comment or a context with words.
    { ...PERSON, type: 'act', action: 'comment', ...GROUP },
    { ...PERSON, type: 'act', action: 'context', ...GROUP, nodes: Array.from({ length: 500 }, (_, i) => i + 1) },
    // api.md 66: a move names one card with `n`, or a group with `nodes`, and its container.
    { ...PERSON, type: 'act', action: 'move', ...GROUP_MOVE },
    { ...PERSON, type: 'act', action: 'move', n: 3, region: 'plan' },
    // api.md 71: a note on, or a place for, a whole container: board and region in place of n.
    { ...PERSON, type: 'act', action: 'comment', ...CONTAINER, text: 'Is this split right?' },
    { ...PERSON, type: 'act', action: 'context', ...CONTAINER, text: 'Say more.' },
    { ...PERSON, type: 'act', action: 'pin', ...CONTAINER, x: 640, y: -24 },
    { ...PERSON, type: 'act', action: 'pin', board: 'b', region: 'later', x: 0, y: 0 },
    { ...PERSON, type: 'act', action: 'unpin', ...CONTAINER },
    { ...PERSON, type: 'act', action: 'note-edit', ...CONTAINER, note: 7, text: 'Edited', kind: 'context' },
    { ...PERSON, type: 'act', action: 'note-remove', ...CONTAINER, note: 7 },
    // api.md 81-82: a grant request and a revoke for a whole board leave `region` out.
    { ...VALID['grant-request'], region: undefined },
    { ...PERSON, type: 'act', action: 'revoke', holder: 'a-abcd1234', board: 'b' },
    // api.md 87: a seen for a whole board names `board` and `head` in place of `n` and `ver`.
    { ...PERSON, type: 'seen', board: 'b', head: 12 },
    // api.md 90: from v9 the person writes a `board` line, creating or renaming a board.
    { ...PERSON, type: 'board', board: 'b', title: 'Pricing for 2027', summary: 'What we charge.' },
    // api.md 118: a line from v10 or older may still carry `item`; readers ignore it.
    patch(patch(VALID.node!, 'v', 10), 'node.item', true),
    patch(patch(patch(VALID.node!, 'v', 2), 'agent', 'kiro'), 'node.item', false),
  ];
  for (const e of lines) assert.deepEqual(verdict(e), { schema: true, hand: true }, JSON.stringify(e).slice(0, 80));
});

// ---- 2a. Ledger v11: the kind decides; `item` is refused with words saying what replaced it ----

test('a v11 node line or a sent node naming item gets one problem saying the kind decides', () => {
  const removed = [{ pointer: '/node/item', detail: `\`item\` is not allowed here. ${ITEM_REMOVED}` }];
  assert.deepEqual(ledgerLineProblems(JSON.stringify(patch(V.node!, 'node.item', true))), removed);
  const node = { region: 'plan', kind: 'question', title: 'T', item: true };
  assert.deepEqual(schemaProblems(`${eventId('node')}#/$defs/sent`, { type: 'node', node }), removed);
  assert.deepEqual(eventProblems(patch(V.node!, 'node.item', true)), [`node.item: ${ITEM_REMOVED}`]);
});

test('the schema words for a removed item are ITEM_REMOVED', () => {
  assert.equal(doc(eventId('node')).$defs.noItem.properties.node.properties.item.description, ITEM_REMOVED);
});

// ---- 2. Broken lines: one rule each; both validators refuse every one ----

test(`${BROKEN.length} broken lines: the schema and eventProblems both refuse every one`, () => {
  assert.ok(BROKEN.length >= 40);
  for (const [name, e] of BROKEN) {
    const line = JSON.parse(JSON.stringify(e)); // drop `undefined` fields, as a written line would
    assert.deepEqual(verdict(line), { schema: false, hand: false }, name);
  }
});

// ---- 6. One plain-English problem per malformed line (the discriminator works) ----

test('a malformed line gets exactly one problem, in plain English', () => {
  const one: [Rec, string, string][] = [
    [patch(V.node!, 'bogus', 1), '/bogus', 'unknown field `bogus`'],
    [patch(V.node!, 'node.title', long(201)), '/node/title', '`title` is longer than 200 characters'],
    [patch(V.board!, 'type', 'vote'), '/type', 'unknown event type "vote"'],
    [patch(V.board!, 'agent', 'kiro'), '/agent', '`agent` is not an agent id: "a-" and 8 lowercase letters or digits, as join gives it'],
    [patch(V.board!, 'at', 'yesterday'), '/at', '`at` is not a UTC timestamp like 2026-10-05T09:00:00Z'],
    [patch(V.park!, 'bundle.assessment', DROP), '/bundle/assessment', '`assessment` is required'],
    [act('send', { n: 1 }), '/n', '`n` is not allowed here'],
    [{ ...V.join!, by: 'person' }, '/by', '`by` must be "agent" here'],
    [patch(V.region!, 'region.lanes', []), '/region/lanes', '`lanes` needs at least 1 entry'],
  ];
  for (const [e, pointer, detail] of one) assert.deepEqual(ledgerLineProblems(JSON.stringify(e)), [{ pointer, detail }]);
  assert.deepEqual(ledgerLineProblems('{nope'), [{ pointer: '', detail: 'the line is not JSON' }]);
});

test('no ajv wording leaks into a problem', () => {
  for (const [name, e] of BROKEN) {
    for (const { detail } of ledgerLineProblems(JSON.stringify(e)))
      assert.doesNotMatch(detail, /must NOT|should|unevaluated|additional|schema|discriminator|oneOf|tag "/, `${name}: ${detail}`);
  }
});

// ---- 7. The validate CLI ----

const cli = (...files: string[]) =>
  spawnSync(process.execPath, [path.join(ROOT, 'apps/board/bin/validate.ts'), ...files], { cwd: ROOT, encoding: 'utf8' });

test('validate CLI: exits 0 on each fixture', () => {
  for (const rel of FIXTURES) {
    const run = cli(rel);
    assert.equal(run.status, 0, `${rel}\n${run.stdout}${run.stderr}`);
  }
});

test('validate CLI: exits non-zero on a ledger with one bad line, naming the line', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vb-validate-'));
  try {
    const lines = linesOf('packages/format/fixtures/login-review.ledger.jsonl');
    lines[2] = JSON.stringify({ ...JSON.parse(lines[2]!), bogus: true });
    const file = path.join(dir, 'ledger.jsonl');
    fs.writeFileSync(file, `${lines.join('\n')}\n`);
    const run = cli(file);
    assert.equal(run.status, 1, run.stdout);
    assert.match(run.stdout, /line 3: schema \/bogus: unknown field `bogus`/);
    assert.match(run.stdout, /line 3: bogus: unknown field/);
    assert.notEqual(cli().status, 0);
    assert.notEqual(cli(path.join(dir, 'view.json')).status, 0);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// ---- Sent forms (api.md 6, 34, 35): what a caller sends, used by the API in 1_BE_03 ----

const sent = (type: string, body: Rec) => schemaProblems(`${eventId(type)}#/$defs/sent`, { type, ...body });

test('sent forms: n as a number or a key, base and key on an item, never a stamped or server field', () => {
  const node = { region: 'plan', kind: 'note', title: 'T' };
  assert.deepEqual(sent('node', { node }), []);
  assert.deepEqual(sent('node', { n: { key: 'q-1' }, base: 2, key: 'q-2', node }), []);
  assert.deepEqual(sent('link', { from: { key: 'a' }, to: 2 }), []);
  assert.deepEqual(sent('reply', { n: 1, text: 'Ok.', key: 'r' }), []);
  assert.deepEqual(sent('board', { title: 'Pricing' }), []);
  assert.deepEqual(sent('node', { ver: 2, node }), [{ pointer: '/ver', detail: 'unknown field `ver`' }]);
  for (const f of ['v', 'seq', 'at', 'by', 'agent', 'person']) assert.equal(sent('node', { [f]: 1, node }).length, 1, f);
  // Items carry no board: the path names it (api.md 34).
  assert.deepEqual(sent('node', { board: 'b', node }), [{ pointer: '/board', detail: 'unknown field `board`' }]);
  assert.equal(sent('node', { n: { key: 'q', extra: 1 }, node }).length, 1);
  assert.equal(sent('node', { n: 0, node }).length, 1);
});

// ---- 4. The hand-written types and checks name what the schema names (api.md 2) ----

/** The `const` of `type` in every branch of the stored-line union. */
const unionTypes = () => (doc(LEDGER_EVENT_ID).oneOf as Rec[]).map((b) => {
  const [id] = String(b.$ref).split('#');
  return doc(id!).$defs.stored.properties.type.const;
});

test('EVENT_TYPES, ACTION_IDS, KINDS, MODES and the sizes equal the schema enums', () => {
  const common = doc(COMMON).$defs;
  assert.deepEqual(unionTypes(), [...EVENT_TYPES]);
  assert.deepEqual(doc(eventId('act')).$defs.core.properties.action.enum, [...ACTION_IDS]);
  assert.deepEqual(common.kind.enum, [...KINDS]);
  assert.deepEqual(common.mode.enum, [...MODES]);
  assert.deepEqual(common.nodeSize.enum, [...NODE_SIZES]);
  assert.deepEqual(common.actSize.enum, [...ACT_SIZES]);
});

test('LIMITS and the patterns equal the schema', () => {
  const d = doc(COMMON).$defs;
  const lengths: Record<string, string> = {
    title: 'title', regionTitle: 'regionTitle', body: 'nodeBody', text: 'longText', summary: 'summary',
    linkLabel: 'linkLabel', agentLabel: 'agentLabel', tag: 'tag', lane: 'lane', source: 'source', key: 'key', person: 'person',
  };
  const counts: Record<string, string> = { tags: 'tags', lanes: 'lanes', sources: 'sources', nodes: 'nodeNumbers' };
  for (const [k, def] of Object.entries(lengths)) assert.equal(d[def].maxLength, LIMITS[k as keyof typeof LIMITS], k);
  for (const [k, def] of Object.entries(counts)) assert.equal(d[def].maxItems, LIMITS[k as keyof typeof LIMITS], k);
  assert.equal(d.columns.maximum, LIMITS.columns);
  assert.equal(Object.keys(LIMITS).length, Object.keys(lengths).length + Object.keys(counts).length + 1);
  assert.equal(d.id.pattern, ID_PATTERN.source);
  assert.equal(d.agentId.pattern, AGENT_ID_PATTERN.source);
  assert.equal(d.timestamp.pattern, TIMESTAMP_PATTERN.source);
});

// ---- 5. Every schema compiles, by $id, and every $ref stays inside our namespace ----

function refsOf(node: unknown, out: string[] = []): string[] {
  if (Array.isArray(node)) node.forEach((x) => refsOf(x, out));
  else if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) if (k === '$ref') out.push(String(v)); else refsOf(v, out);
  }
  return out;
}

test('every schema file compiles, with every $defs entry, and no $ref leaves https://vision-board.invalid/', () => {
  const files = schemaFiles();
  const relOf = (file: string) => path.relative(path.join(ROOT, 'packages/format/schema'), file).split(path.sep).join('/');
  // The API body schemas (api/) have their own namespace and are checked in openapi.test.ts.
  assert.equal(files.filter(({ file }) => !relOf(file).startsWith('api/')).length, 2 + EVENT_TYPES.length);
  for (const { file, schema } of files) {
    const rel = relOf(file);
    assert.equal(schema.$id, rel.startsWith('api/') ? `${SCHEMA_BASE}schema/${rel}` : `${LEDGER}${rel}`, rel);
    compileSchema(schema.$id);
    for (const name of Object.keys((schema.$defs ?? {}) as Rec)) compileSchema(`${schema.$id}#/$defs/${name}`);
    for (const ref of refsOf(schema)) assert.ok(ref.startsWith(SCHEMA_BASE), `${rel}: ${ref}`);
  }
  for (const type of EVENT_TYPES) for (const form of ['core', 'sent', 'stored']) assert.ok(doc(eventId(type)).$defs[form], `${type} ${form}`);
});
