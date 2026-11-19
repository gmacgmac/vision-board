// A refusal names what the field accepts (tracker M84): a failed `anyOf` is worded by the field it is,
// not always as a card reference.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SCHEMA_BASE, schemaProblems } from '../server/schema.ts';

const details = (item: unknown) => schemaProblems(`${SCHEMA_BASE}schema/api/write-item.schema.json`, item).map((p) => `${p.pointer}: ${p.detail}`);
const node = (fields: object) => ({ type: 'node', node: { region: 'options', kind: 'note', title: 'A note', ...fields } });

test('a tone that is not a name or a hue is refused with the names and the hue range', () => {
  const [said, ...rest] = details(node({ tone: 'pink' }));
  assert.deepEqual(rest, []);
  assert.match(said!, /^\/node\/tone: .*teal.*slate.*0 to 359/);
  assert.doesNotMatch(said!, /node number/);
});

test('an icon that is not a built-in or a library name is refused with the name rule', () => {
  const [said, ...rest] = details(node({ icon: 'rocket' }));
  assert.deepEqual(rest, []);
  assert.match(said!, /^\/node\/icon: .*built-in icon.*"x-"/);
  assert.doesNotMatch(said!, /node number/);
});

test('a bad card reference in a link still says it wants a node number or a key', () => {
  const said = details({ type: 'link', from: { key: 'a' }, to: { foo: 1 } });
  assert.equal(said.length, 1);
  assert.match(said[0]!, /^\/to: .*node number or \{ "key"/);
});
