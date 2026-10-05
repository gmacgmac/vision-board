import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Mode, Region, View, ViewNode } from '../../format/src/index.ts';
import { MODES } from '../../format/src/index.ts';
import type { BoardState, ItemStatus } from '../../actions/src/index.ts';
import { agentChoiceText, MODE_HINT, MODE_LABEL, PUT_BACK_NONE_HINT, REGION_COLOUR_DEFAULT, RESET_NONE_HINT, regionColour, regionHolders, regionState } from '../src/index.ts';

const region: Region = { id: 'r', title: 'R', mode: 'grid' };
const node = (f: Partial<ViewNode>): ViewNode => ({ id: '1', region: 'r', kind: 'question', title: 'T', ...f });
const view = (nodes: ViewNode[]): View =>
  ({ format: 1, session: 's', title: 'B', version: 1, regions: [region], nodes, links: [] });
const board = (f: Partial<BoardState> = {}): BoardState =>
  ({ items: new Map(), pins: new Map(), modes: new Map(), sizes: new Map(), moves: new Map(), regionPins: new Map(), regionNotes: new Map(), ...f });
const deciding = (...entries: [string, ItemStatus][]): BoardState =>
  board({ items: new Map(entries.map(([id, status]) => [id, { status, notes: [] }])) });
const drawn = (...ids: string[]): ReadonlySet<string> => new Set(ids);

test('MODE_LABEL names every mode', () => {
  for (const m of MODES) assert.ok(MODE_LABEL[m].length > 0, m);
  assert.deepEqual(Object.keys(MODE_LABEL), [...MODES]);
});

test('MODE_HINT holds mockup 05\'s one-liner for every mode, in mode order', () => {
  assert.deepEqual(Object.keys(MODE_HINT), [...MODES]);
  assert.deepEqual(MODE_HINT, {
    grid: 'A numbered set to work through in order',
    flow: 'Connected steps and where they branch',
    lanes: 'Several flows side by side, one per lane',
    radial: 'One subject, everything related around it',
    list: 'Dense reading, one row each',
  });
});

test('the popover foot names the agent\'s layout; the disabled Reset places hint says why', () => {
  assert.equal(agentChoiceText('grid'), 'The agent chose Grid for this container.');
  assert.equal(agentChoiceText('radial'), 'The agent chose Radial for this container.');
  assert.equal(RESET_NONE_HINT, 'No cards moved');
});

test('regionState carries the mode it is given', () => {
  for (const mode of MODES as readonly Mode[])
    assert.equal(regionState({ id: 'r', mode }, view([node({})]), board(), drawn('1')).mode, mode);
});

test('the count reads decided over items, counting acknowledged and dropped only', () => {
  const v = view([node({ id: '1', n: 1 }), node({ id: '2', n: 2 }), node({ id: '3', n: 3 }), node({ id: '4', n: 4 })]);
  const s = deciding(['1', 'acknowledged'], ['2', 'dropped'], ['3', 'later']);
  assert.equal(regionState(region, v, s, drawn('1', '2', '3', '4')).countText, '2 of 4 decided');
});

test('the count ignores nodes that are not items, and is empty when there are no items', () => {
  const v = view([node({ id: '1', n: 1 }), node({ id: 't', kind: 'topic' })]);
  assert.equal(regionState(region, v, board(), drawn('1', 't')).countText, '0 of 1 decided');
  assert.equal(regionState(region, view([node({ id: 't', kind: 'topic' })]), board(), drawn('t')).countText, '');
});

test('the count only looks at the nodes of this region', () => {
  const v = view([node({ id: '1', n: 1 }), node({ id: '2', n: 2, region: 'other' })]);
  const s = deciding(['1', 'acknowledged'], ['2', 'acknowledged']);
  assert.equal(regionState(region, v, s, drawn('1', '2')).countText, '1 of 1 decided');
});

test('Reset places is enabled when any node of the region is pinned, and not for another region', () => {
  const v = view([node({ id: '1', n: 1 }), node({ id: '2', n: 2 }), node({ id: '3', n: 3, region: 'other' })]);
  const pin = { x: 1, y: 1 };
  assert.equal(regionState(region, v, board(), drawn('1', '2')).canReset, false);
  assert.equal(regionState(region, v, board({ pins: new Map([['2', pin]]) }), drawn('1', '2')).canReset, true);
  assert.equal(regionState(region, v, board({ pins: new Map([['3', pin]]) }), drawn('1', '2')).canReset, false);
});

test('the empty message shows only when the layout drew none of the region\'s nodes', () => {
  const v = view([node({ id: '1', n: 1 }), node({ id: '2', n: 2 }), node({ id: '3', n: 3, region: 'other' })]);
  assert.equal(regionState(region, v, board(), drawn('1', '2', '3')).showEmpty, false);
  assert.equal(regionState(region, v, board(), drawn('2', '3')).showEmpty, false, 'one drawn is enough');
  assert.equal(regionState(region, v, board(), drawn('3')).showEmpty, true, 'only another region is drawn');
  assert.equal(regionState(region, v, board(), drawn()).showEmpty, true);
});

test('a region with no nodes shows the empty message and no count', () => {
  const st = regionState(region, view([]), board(), drawn());
  assert.deepEqual(st, { mode: 'grid', countText: '', canReset: false, canPutBack: false, showEmpty: true });
});

test('Put container back is enabled only while the container itself has a place (3_FE_04 ruling 7)', () => {
  const v = view([node({ id: '1', n: 1 })]);
  assert.equal(regionState(region, v, board(), drawn('1')).canPutBack, false);
  assert.equal(regionState(region, v, board({ regionPins: new Map([['r', { x: 5, y: 5 }]]) }), drawn('1')).canPutBack, true);
  assert.equal(regionState(region, v, board({ regionPins: new Map([['other', { x: 5, y: 5 }]]) }), drawn('1')).canPutBack, false);
  // A card's pin is not the container's place.
  assert.equal(regionState(region, v, board({ pins: new Map([['1', { x: 1, y: 1 }]]) }), drawn('1')).canPutBack, false);
  assert.equal(PUT_BACK_NONE_HINT, 'Not moved');
});

test('a container note: the pin numbers the latest of the container\'s notes, the line shows its words (ruling 3)', () => {
  const v = view([node({ id: '1', n: 1 })]);
  const note = (seq: number, text: string, sent?: true) => ({ seq, kind: 'comment' as const, text, at: 'x', region: 'r', ...(sent && { sent }) });
  assert.equal('note' in regionState(region, v, board(), drawn('1')), false, 'left out with no note');
  const one = regionState(region, v, board({ regionNotes: new Map([['r', [note(4, 'Split it?')]]]) }), drawn('1'));
  assert.deepEqual(one.note, { seq: 4, index: 1, sent: false, who: 'Your note', text: 'Split it?', label: 'Note 1 on container R. Edit it' });
  const two = regionState(region, v, board({ regionNotes: new Map([['r', [note(4, 'Old', true), note(9, 'New')]]]) }), drawn('1'));
  assert.deepEqual([two.note!.seq, two.note!.index, two.note!.sent], [9, 2, false]);
  const sent = regionState(region, v, board({ regionNotes: new Map([['r', [note(4, 'Old', true)]]]) }), drawn('1'));
  assert.deepEqual([sent.note!.who, sent.note!.label], ['Your note · Sent', 'Note 1 on container R, sent. Show it']);
});

test('every region takes the neutral frame colour for now, a token and never a literal colour', () => {
  assert.equal(regionColour(region), REGION_COLOUR_DEFAULT);
  assert.equal(regionColour({ id: 'other' }), 'var(--vb-line-strong)');
  assert.doesNotMatch(REGION_COLOUR_DEFAULT, /#|rgb|hsl/);
});

test('holders: left out when none are given; creator first, and only the others removable', () => {
  const v = view([node({ id: '1', n: 1 })]);
  assert.equal('holders' in regionState(region, v, board(), drawn('1')), false);
  assert.equal('holders' in regionState(region, v, board(), drawn('1'), []), false);
  const st = regionState(region, v, board(), drawn('1'), [
    { agent: 'a-bbbb2222', label: 'Docs chat' },
    { agent: 'a-aaaa1111', label: 'Pricing chat', creator: true },
  ]);
  assert.deepEqual(st.holders, [
    { agent: 'a-aaaa1111', label: 'Pricing chat', removable: false },
    { agent: 'a-bbbb2222', label: 'Docs chat', removable: true },
  ]);
  assert.deepEqual(regionHolders([{ agent: 'a-bbbb2222', label: 'Docs chat' }]), [{ agent: 'a-bbbb2222', label: 'Docs chat', removable: true }]);
});
