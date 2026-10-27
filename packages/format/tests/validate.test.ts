import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { boardView, foldDrawn, readLedger, validateLedger } from '../src/index.ts';
import { validateView } from '../src/validate.ts';

const FIXTURES = fs.readdirSync(new URL('../fixtures/', import.meta.url))
  .filter((f) => f.endsWith('.ledger.jsonl')).map((f) => f.slice(0, -'.ledger.jsonl'.length));
const lines = (name: string) =>
  fs.readFileSync(new URL(`../fixtures/${name}.ledger.jsonl`, import.meta.url), 'utf8').trim().split('\n');
/** A fixture ledger's board (board id = file name), projected to a fresh copy. Untyped, as the
 * JSON it replaces was, because the negative cases below break the shape on purpose. */
const load = (name: string): any => boardView(foldDrawn(readLedger(lines(name)).events), name);

test('every fixture ledger is found', () => assert.ok(FIXTURES.includes('roadmap') && FIXTURES.length >= 3));

for (const name of FIXTURES) {
  test(`fixture ${name} is a valid ledger`, () => assert.deepEqual(validateLedger(lines(name)), []));
  test(`fixture ${name} projects to a valid view`, () => assert.deepEqual(validateView(load(name)), []));
}

test('rejects non-objects', () => assert.deepEqual(validateView(null), ['view: must be an object']));

test('rejects coordinates on a node', () => {
  const v = load('roadmap');
  v.nodes[0].x = 10;
  assert.ok(validateView(v).some((p) => p.includes('no coordinates')));
});

test('rejects duplicate node ids and duplicate item numbers', () => {
  const v = load('roadmap');
  const item = v.nodes.find((n: { n?: number }) => n.n);
  v.nodes.push({ ...item });
  const p = validateView(v);
  assert.ok(p.some((x) => x.includes('duplicate')));
  assert.ok(p.some((x) => x.includes('already used')));
});

test('rejects links to unknown nodes and nodes in unknown regions', () => {
  const v = load('roadmap');
  v.links.push({ from: 'nope', to: v.nodes[0].id });
  v.nodes[0].region = 'ghost';
  const p = validateView(v);
  assert.ok(p.some((x) => x.startsWith(`links[${v.links.length - 1}].from`)));
  assert.ok(p.some((x) => x.startsWith('nodes[0].region')));
});

test('rejects path-unsafe ids', () => {
  const v = load('roadmap');
  v.session = '../etc';
  assert.ok(validateView(v).includes('session: invalid id'));
});
