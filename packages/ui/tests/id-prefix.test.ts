// Ids per mount: a card or a frame drawn with an `idPrefix` (the board's `mount`, one per board on a
// page) sets every id it has behind that prefix, and every aria-controls / aria-describedby /
// aria-labelledby in its markup names one of them, so two boards on a page repeat none. Without a
// prefix the ids are the ones the gallery and the standalone page have always had.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ViewNode } from '#format';
import { appMenuId, nodeTemplate, popoverId, proposalsMarkup, regionIds, regionTemplate, stepsId } from '../src/index.ts';

const idsIn = (html: string): string[] => [...html.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]!);
const refsIn = (html: string): string[] =>
  [...html.matchAll(/ aria-(?:controls|describedby|labelledby)="([^"]+)"/g)].flatMap((m) => m[1]!.split(' '));
const item: ViewNode = { id: '12', n: 3, region: 'r', kind: 'risk', title: 'A risk' };
const app: ViewNode = { id: '7', n: 4, region: 'r', kind: 'app', title: 'Calc', app: { id: 'calculator', w: 360, h: 440 } };
const frame = { id: 'review', title: 'Review', mode: 'grid' as const };

test('a card with an id prefix sets every id behind it, and its references name those ids', () => {
  for (const n of [item, app]) {
    const html = nodeTemplate(n, { history: true, idPrefix: 'vb2-' });
    const ids = idsIn(html);
    assert.ok(ids.length >= 3, `${n.kind}: the card has ids`);
    assert.ok(ids.every((id) => id.startsWith('vb2-')), `${n.kind}: ${ids.join(', ')}`);
    assert.ok(refsIn(html).every((r) => ids.includes(r)), `${n.kind}: every reference names an id of the card`);
  }
});

test('a frame with an id prefix sets every id behind it, and its references name those ids', () => {
  const html = regionTemplate(frame, { idPrefix: 'vb2-', remove: true, widths: true });
  const ids = idsIn(html);
  assert.ok(ids.length >= 6, 'the heading, popover, menu, hints, preview and note text');
  assert.ok(ids.every((id) => id.startsWith('vb2-region-review')), ids.join(', '));
  assert.ok(refsIn(html).every((r) => ids.includes(r)));
});

test('without a prefix the ids are what they have always been, so the standalone page and the gallery are unchanged', () => {
  assert.deepEqual(idsIn(regionTemplate(frame)).slice(0, 2), ['region-review', 'region-review-modes']);
  assert.equal(regionIds('review').menu, 'region-review-menu');
  assert.equal(popoverId('proposal', item), 'vb-pop-proposal-12');
  assert.equal(stepsId(item), 'vb-steps-12');
  assert.equal(appMenuId(app), 'vb-app-menu-7');
  assert.ok(idsIn(nodeTemplate(item, { history: true })).every((id) => id.startsWith('vb-')));
});

test('the same card in two mounts shares no id', () => {
  const [a, b] = [nodeTemplate(item, { history: true }), nodeTemplate(item, { history: true, idPrefix: 'vb2-' })];
  assert.deepEqual(idsIn(a).filter((id) => idsIn(b).includes(id)), []);
  const [fa, fb] = [regionTemplate(frame), regionTemplate(frame, { idPrefix: 'vb2-' })];
  assert.deepEqual(idsIn(fa).filter((id) => idsIn(fb).includes(id)), []);
});

test('a proposal\'s reason id is behind the prefix too', () => {
  const v = { entries: [{ seq: 9, head: 'h', what: 'w', why: 'Out of date', stale: true, reject: 'r', accept: 'a' }] } as unknown as Parameters<typeof proposalsMarkup>[0];
  assert.deepEqual(idsIn(proposalsMarkup(v, 'vb2-')), ['vb2-vb-prop-why-9']);
  assert.deepEqual(idsIn(proposalsMarkup(v)), ['vb-prop-why-9']);
});
