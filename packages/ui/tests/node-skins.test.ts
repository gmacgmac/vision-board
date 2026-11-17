// The skins agree (FE_04, D-100 1, decision 14): a skin moves a node's controls, never what they do. For every kind, a
// node with and without an icon, a number or none, each skin's row draws controls for the same actions; the plate row
// (Command Lens) puts the number, kind, badge, Awaiting, a proposal chip and the notes mark in the plate, and the
// switch on a node that asks only; and no node file names a skin.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import type { Kind, ViewNode } from '#format';
import { NODE_TYPES, SKINS } from '#format';
import { nodeTemplate, SKIN_DEFS } from '../src/index.ts';

const node = (f: Partial<ViewNode> = {}): ViewNode => ({ id: '28', region: 'r', kind: 'question', title: 'Order of work', n: 28, ...f });
const plate = SKIN_DEFS['command-lens'];

/** The actions a node's markup offers, by the controls' data attributes: the disc stands for Tick, Cross and an open
 *  proposal; a switch's halves and its proposal chip for the same; the number for Bookmark (and, held, Save for later),
 *  the badge for History, the notes mark for the conversation. */
const ACTS: Record<string, string[]> = {
  number: ['bookmark'], answer: ['tick', 'cross', 'proposal'], tick: ['tick'], cross: ['cross'], proposal: ['proposal'],
  badge: ['history'], notes: ['comment'],
};
const actionsOf = (html: string): string[] =>
  [...new Set([...html.matchAll(/data-mark="(\w+)"/g)].flatMap((m) => ACTS[m[1]!] ?? [`unknown:${m[1]}`]))].sort();

test('the command-lens row: the answer is the switch, the marks sit in a plate', () => {
  assert.deepEqual(plate, { answer: 'switch', marks: 'plate' });
});

test('for every kind, with or without an icon or a number, every skin offers the same actions', () => {
  const kinds = (Object.keys(NODE_TYPES) as Kind[]).filter((k) => k !== 'app');
  for (const kind of kinds) for (const f of [{}, { icon: 'signal' }, { n: undefined }, { tone: 200 }] as Partial<ViewNode>[]) {
    const [first, ...rest] = SKINS.map((s) => actionsOf(nodeTemplate(node({ kind, ...f }), { edges: SKIN_DEFS[s] })));
    for (const [i, other] of rest.entries()) assert.deepEqual(other, first, `${kind} ${JSON.stringify(f)}: ${SKINS[i + 1]} against ${SKINS[0]}`);
    const asks = Boolean(NODE_TYPES[kind].answer) && !('n' in f);
    assert.equal(first!.includes('tick'), asks, `${kind} ${JSON.stringify(f)}: Tick and Cross only on a node that asks`);
  }
});

test('the plate holds, in order, the number, the kind, the badge, Awaiting, the proposal chip and the notes mark', () => {
  const html = nodeTemplate(node(), { edges: plate, idPrefix: 'p-' });
  const inPlate = /<div class="vb-node-plate">([^]*?)<\/div><div class="vb-node-content">/.exec(html)![1]!;
  const order = [...inPlate.matchAll(/data-mark="(\w+)"|class="(vb-node-kind|vb-mark vb-mark-awaiting)"/g)].map((m) => m[1] ?? m[2]);
  assert.deepEqual(order, ['number', 'vb-node-kind', 'badge', 'vb-mark vb-mark-awaiting', 'proposal', 'notes']);
  assert.match(inPlate, /data-mark="proposal"[^>]*aria-controls="p-vb-pop-proposal-28" hidden>Proposal<\/button>/);
  assert.ok(!html.includes('vb-node-edge') && !html.includes('data-mark="answer"'), 'no bottom edge, no disc');
});

test('the switch: on a node that asks only, after the body; each half a toggle named with its item and key', () => {
  const html = nodeTemplate(node(), { edges: plate });
  assert.match(html, /<\/div><div class="vb-mark-switch" role="group" aria-label="Answer item 28"><button [^>]*data-mark="tick"[^>]*aria-pressed="false" aria-keyshortcuts="A" aria-label="Tick item 28 \(A\)">/);
  assert.match(html, /data-mark="cross"[^>]*aria-label="Cross item 28 \(X\)">[^]*<span>Cross<\/span><\/button><\/div>/);
  for (const kind of ['finding', 'topic', 'note'] as Kind[]) {
    const tells = nodeTemplate(node({ kind }), { edges: plate });
    assert.ok(!tells.includes('vb-mark-switch') && !tells.includes('data-mark="proposal"'), `${kind}: no switch, no proposal chip`);
  }
});

test('in a plate the kind is the plate\'s: no grip, no kind word over the title; the icon takes the dot\'s place', () => {
  const html = nodeTemplate(node({ kind: 'finding', icon: 'signal' }), { edges: plate });
  assert.ok(!html.includes('vb-node-grip') && !html.includes('vb-node-kick'));
  assert.match(html, /<span class="vb-node-kind"><svg class="vb-icon vb-node-kind-icon"[^]*?<\/svg><span class="vb-node-kind-word">Finding<\/span><\/span>/);
  assert.match(html, /<span class="vb-node-tile" aria-hidden="true"><svg/);
  assert.match(nodeTemplate(node({ n: undefined }), { edges: plate }), /^<div class="vb-node-plate"><span class="vb-node-kind"><span class="vb-node-kind-word">Question<\/span><\/span><\/div>/);
});

test('no node file names a skin: where a mark sits is the registry\'s row, how it looks is the skin\'s tokens', () => {
  const dir = new URL('../src/node/', import.meta.url);
  const names = SKINS.filter((s) => s !== 'default');
  for (const f of fs.readdirSync(dir).filter((f) => /\.(ts|css)$/.test(f))) {
    const text = fs.readFileSync(new URL(f, dir), 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
    for (const s of names) assert.ok(!text.includes(s), `${f} names the skin ${s}`);
  }
});
