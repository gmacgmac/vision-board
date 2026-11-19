// The widths switch shows what is in force (the timeline set, PLAN § Design review "After FE_02" (a)): on a container
// with a timeline (its laid-out box carries one) and no choice, the timeline's default, run down `match` and across
// `own`, for the whole container; a choice still wins; with no timeline, the mode's default.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Direction, Region, View } from '#format';
import type { BoardState } from '#actions';
import { regionState } from '../src/index.ts';

const board = (widths: Map<string, 'match' | 'own'> = new Map()): BoardState => ({
  items: new Map(), pins: new Map(), modes: new Map(), widths, sizes: new Map(), moves: new Map(), regionPins: new Map(),
  regionNotes: new Map(), bookmarks: new Set(),
});
const view = (mode: Region['mode']): View => ({ format: 1, session: 'b', version: 1, title: 'B', regions: [{ id: 'r', title: 'R', mode }], nodes: [], links: [] });
const laid = (mode: Region['mode'], direction?: Direction) => ({ id: 'r', mode, ...(direction && { timeline: { direction } }) });

test('the switch shows the timeline\'s default on a container with one, a choice when made, else the mode\'s', () => {
  assert.equal(regionState(laid('row', 'down'), view('row'), board(), new Set()).widths, 'match');
  assert.equal(regionState(laid('grid', 'across'), view('grid'), board(), new Set()).widths, 'own');
  assert.equal(regionState(laid('row', 'down'), view('row'), board(new Map([['r', 'own']])), new Set()).widths, 'own');
  assert.equal(regionState(laid('grid'), view('grid'), board(), new Set()).widths, 'match');
});
