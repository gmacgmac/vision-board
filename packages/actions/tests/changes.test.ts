// What changed between two versions of a card (proposals-seen-parking FE_02 ruling 4): per field
// added, changed or removed; a body that starts with the previous body is added, with the added text.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { NodeBody } from '../../format/src/index.ts';
import { versionChanges } from '../src/index.ts';

const v1: NodeBody = { region: 'r', kind: 'risk', title: 'The floor undercuts self-serve', body: 'A 35-seat team pays less.', item: true };

test('the same version: no change', () => {
  assert.deepEqual(versionChanges(v1, { ...v1 }), []);
});

test('an append: the body is added, with only the added text', () => {
  assert.deepEqual(versionChanges(v1, { ...v1, body: 'A 35-seat team pays less.\n\nThe credit amount is in.' }),
    [{ field: 'body', change: 'added', text: 'The credit amount is in.' }]);
});

test('a rewritten body is changed, with no text; a body given or taken away is added or removed', () => {
  assert.deepEqual(versionChanges(v1, { ...v1, body: 'A 40-seat team pays less.' }), [{ field: 'body', change: 'changed' }]);
  const { body: _, ...bare } = v1;
  assert.deepEqual(versionChanges(bare, v1), [{ field: 'body', change: 'added', text: 'A 35-seat team pays less.' }]);
  assert.deepEqual(versionChanges(v1, bare), [{ field: 'body', change: 'removed' }]);
});

test('the title, kind and container change; the title carries what it now reads', () => {
  assert.deepEqual(versionChanges(v1, { ...v1, title: 'The floor undercuts self-serve at 35+ seats', kind: 'finding', region: 'later' }), [
    { field: 'title', change: 'changed', text: 'The floor undercuts self-serve at 35+ seats' },
    { field: 'kind', change: 'changed' },
    { field: 'container', change: 'changed' },
  ]);
});

test('tags and size: added, changed and removed; an old item mark is no change (api.md 118)', () => {
  const tagged = { ...v1, tags: ['pricing'], size: 's' as const };
  assert.deepEqual(versionChanges(v1, tagged), [{ field: 'tags', change: 'added' }, { field: 'size', change: 'added' }]);
  assert.deepEqual(versionChanges(tagged, { ...tagged, tags: ['pricing', 'renewals'], size: 'l' }),
    [{ field: 'tags', change: 'changed' }, { field: 'size', change: 'changed' }]);
  assert.deepEqual(versionChanges(tagged, { ...v1, tags: [], item: false }),
    [{ field: 'tags', change: 'removed' }, { field: 'size', change: 'removed' }]);
  const { item: _item, ...unmarked } = v1;
  assert.deepEqual(versionChanges(v1, unmarked), []);
});

test('no previous version: every field it has is added', () => {
  assert.deepEqual(versionChanges(undefined, { region: 'r', kind: 'note', title: 'Hello' }), [
    { field: 'title', change: 'added', text: 'Hello' }, { field: 'kind', change: 'added' }, { field: 'container', change: 'added' },
  ]);
});
