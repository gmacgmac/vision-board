// A dated node (D-105 4, PLAN decisions 16-19): the date is its header. Default skin: no kind tab and no grip, the date
// line first (short for the eye, full for assistive technology, both in <time datetime>), the kind's word ending it; an
// icon node keeps its tile and loses the kick. Command Lens: the plate as it was, the date line (no kind word) before
// the title. An app card never gets one. Its body draws entries. An undated node is untouched.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ViewNode } from '#format';
import { nodeTemplate, SKIN_DEFS } from '../src/index.ts';

const node = (f: Partial<ViewNode> = {}): ViewNode => ({ id: '28', region: 'r', kind: 'decision', title: 'Freeze <the> list', n: 28, ...f });
const edges = SKIN_DEFS.default;
const plate = SKIN_DEFS['command-lens'];
const DATE = '<p class="vb-node-date"><time datetime="2026-09-15"><span aria-hidden="true">Sep 15</span>'
  + '<span class="vb-visually-hidden">15 September 2026</span></time>';

test('default skin: no kind tab and no grip; the content starts with the date line, the kind word at its end', () => {
  const html = nodeTemplate(node({ timeline: '2026-09-15' }), { edges });
  assert.ok(!html.includes('vb-node-kind'), 'no kind tab');
  assert.ok(!html.includes('vb-node-grip'), 'no grip');
  assert.ok(html.includes(`<div class="vb-node-content">${DATE}<span class="vb-node-date-kind">Decision</span></p><h3 class="vb-node-title">Freeze &#60;the&#62; list</h3>`));
  assert.match(html, /data-mark="number"[^]*data-mark="answer"[^]*vb-node-content/, 'the number and the disc stay where they are');
  assert.match(html, /data-mark="badge"[^]*data-mark="notes"/, 'the badge and the notes mark stay on the bottom edge');
});

test('the four header forms, each with its full form and datetime', () => {
  for (const [value, short, full] of [['2026', '2026', '2026'], ['2026-10', 'Oct 2026', 'October 2026'],
    ['2026-10-13', 'Oct 13', '13 October 2026'], ['2026-10-13T14:30', 'Oct 13 · 14:30', '13 October 2026, 14:30']]) {
    const html = nodeTemplate(node({ timeline: value }), { edges });
    assert.ok(html.includes(`<time datetime="${value}"><span aria-hidden="true">${short}</span><span class="vb-visually-hidden">${full}</span></time>`), value);
  }
});

test('an icon node keeps its tile and loses the kick: its kind is on the date line', () => {
  const html = nodeTemplate(node({ icon: 'signal', timeline: '2026-09-15' }), { edges });
  assert.ok(!html.includes('vb-node-kick') && !html.includes('vb-node-grip'));
  assert.ok(html.includes(`<div class="vb-node-content">${DATE}<span class="vb-node-date-kind">Decision</span></p><div class="vb-node-head"><div class="vb-node-heading"><h3 class="vb-node-title">`));
  assert.match(html, /<span class="vb-node-tile" aria-hidden="true"><svg/);
});

test('Command Lens: the plate is unchanged, and the date line without the kind word comes before the title', () => {
  const undated = nodeTemplate(node(), { edges: plate });
  const dated = nodeTemplate(node({ timeline: '2026-09-15' }), { edges: plate });
  const plateOf = (html: string): string => html.slice(html.indexOf('<div class="vb-node-plate">'), html.indexOf('<div class="vb-node-content">'));
  assert.equal(plateOf(dated), plateOf(undated));
  assert.ok(dated.includes(`<div class="vb-node-content">${DATE}</p><h3 class="vb-node-title">`));
  assert.ok(!dated.includes('vb-node-date-kind'));
});

test('an app card never gets a date line, as a window or with app cards off', () => {
  for (const appCards of [true, false]) {
    const app = node({ kind: 'app', app: { id: 'calc' }, timeline: '2026-09-15' } as Partial<ViewNode>);
    assert.ok(!nodeTemplate(app, { edges, appCards }).includes('vb-node-date'), String(appCards));
    assert.equal(nodeTemplate(app, { edges, appCards }), nodeTemplate({ ...app, timeline: undefined }, { edges, appCards }));
  }
});

test('a dated node\'s body draws entries; an undated node\'s does not, byte for byte as before', () => {
  const body = '### Invites go out\n200 teams.\n\n**Pricing page live**: on the site.';
  const dated = nodeTemplate(node({ body, timeline: '2026-10-13' }), { edges });
  assert.match(dated, /<div class="vb-md-entry"><span class="vb-md-entry-name" role="heading" aria-level="4">Invites go out<\/span>/);
  assert.match(dated, /<div class="vb-md-entry"><strong class="vb-md-entry-name">Pricing page live<\/strong><p class="vb-md-p">on the site.<\/p><\/div>/);
  const undated = nodeTemplate(node({ body }), { edges });
  assert.ok(!undated.includes('vb-md-entry'));
  assert.ok(undated.includes('<span class="vb-md-label" role="heading" aria-level="4">Invites go out</span>'));
});

test('a node with no date is drawn as it was in both skins: a date that is not one counts as none', () => {
  for (const def of [edges, plate]) {
    for (const f of [{}, { icon: 'signal' }, { tone: 'teal' }, { kind: 'finding' }] as Partial<ViewNode>[]) {
      const plain = nodeTemplate(node(f), { edges: def });
      assert.equal(nodeTemplate(node({ ...f, timeline: '2026-02-30' }), { edges: def }), plain);
      assert.ok(!plain.includes('vb-node-date'));
    }
  }
});
