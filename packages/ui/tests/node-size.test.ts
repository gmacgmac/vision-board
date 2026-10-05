// Node size control (D-030, option A): the rules nodeState applies and the markup the template
// draws. Only when the page asks for it (the nodeSize flag); otherwise nothing changes.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ViewNode } from '../../format/src/index.ts';
import type { BoardState } from '../../actions/src/index.ts';
import { nodeState, nodeTemplate, sizeLabel } from '../src/index.ts';

const node = (f: Partial<ViewNode>): ViewNode =>
  ({ id: '1', region: 'r', kind: 'question', title: 'T', ...f });

const board = (f: Partial<BoardState> = {}): BoardState =>
  ({ items: new Map(), pins: new Map(), modes: new Map(), sizes: new Map(), moves: new Map(), ...f });

const picks = (html: string): string[] => [...html.matchAll(/data-size-pick="(\w+)"/g)].map((m) => m[1]!);

test('sizeLabel names the tier and whether the person picked it', () => {
  assert.equal(sizeLabel({ tier: 's', picked: false }), 'Card size: S, automatic. Change size');
  assert.equal(sizeLabel({ tier: 'l', picked: true }), 'Card size: L, your pick. Change size');
});

test('nodeState: no tier given, no size state (the flag is off)', () => {
  assert.equal(nodeState(node({ n: 1 }), board()).size, undefined);
});

test('nodeState: a tier with no pick is automatic', () => {
  assert.deepEqual(nodeState(node({ n: 1 }), board(), 'm').size,
    { tier: 'm', picked: false, label: 'Card size: M, automatic. Change size', shown: '' });
});

test('nodeState: a person pick shows as a diamond and the letter', () => {
  const s = board({ sizes: new Map([['1', 'l']]) });
  assert.deepEqual(nodeState(node({ n: 1 }), s, 'l').size,
    { tier: 'l', picked: true, label: 'Card size: L, your pick. Change size', shown: '◆ L' });
});

test('nodeTemplate: no size control unless asked for', () => {
  assert.doesNotMatch(nodeTemplate(node({ n: 1 })), /vb-size/);
  assert.doesNotMatch(nodeTemplate(node({ n: 1 }), {}), /vb-size/);
});

test('nodeTemplate: the control is a labelled group with the glyph, then S, M, L and Auto', () => {
  const html = nodeTemplate(node({ n: 51 }), { sizeControl: true });
  assert.match(html, /<div class="vb-size" role="group" aria-label="Size of card 51">/);
  assert.match(html, /<button type="button" class="vb-size-trig" aria-expanded="false">/);
  assert.deepEqual(picks(html), ['s', 'm', 'l', 'auto']);
  assert.match(html, /data-size-pick="auto" aria-pressed="false" aria-label="Automatic size">Auto<\/button>/);
  assert.doesNotMatch(html, /style=|<style/);
});

test('nodeTemplate: a non-item names its control by its title, escaped', () => {
  const html = nodeTemplate(node({ kind: 'topic', title: '<Stack>' }), { sizeControl: true });
  assert.match(html, /aria-label="Size of card: &#60;Stack&#62;"/);
});
