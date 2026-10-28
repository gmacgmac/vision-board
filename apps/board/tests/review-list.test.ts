// The proposals notice's Review list (reviewList flag, search-and-finding REVIEW_01, ruling 319): its
// rows (finder.ts `proposalRow`, `reviewRows`) and where Review goes (proposal-flow.ts `review`).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { LedgerState, ProposalRow } from '#actions';
import { createProposalFlow } from '../src/board/cards/proposal-flow.ts';
import type { ProposalDeps } from '../src/board/cards/proposal-flow.ts';
import { proposes } from '../src/board/cards/proposals.ts';
import { PROPOSAL_ROW_MAX, proposalRow, reviewRows } from '../src/board/find/finder.ts';
import { initialStatus } from '../src/board/status.ts';
import type { Status } from '../src/board/status.ts';

const row = (n: number, seq: number, action: 'ack' | 'drop', reason: string, title?: string): ProposalRow =>
  ({ n, seq, action, reason, when: '13:08', stale: false, ...(title !== undefined && { title }) });

test('a row is "12 · title · what it proposes", chosen by the card\'s number', () => {
  assert.deepEqual(proposalRow({ n: 12, title: 'Pick a plan', what: 'Cross: the client declined' }),
    { value: '12', text: '12 · Pick a plan · Cross: the client declined' });
});

test('a long title or proposal is cut with "…" and the tooltip holds the whole row', () => {
  const title = 'word '.repeat(20).trim();
  const r = proposalRow({ n: 3, title, what: 'Check: short' });
  assert.equal(r.text, `3 · ${title.slice(0, PROPOSAL_ROW_MAX - 1)}… · Check: short`);
  assert.equal(r.title, `3 · ${title} · Check: short`);
  const what = proposalRow({ n: 3, title: 'T', what: `Cross: ${'x'.repeat(60)}` });
  assert.ok(what.text.endsWith('…') && what.text.length < what.title!.length);
});

test('the list has a row per card, in card order, from the card\'s newest proposal', () => {
  const rows = [row(9, 14, 'drop', 'newest on nine', 'Nine'), row(2, 13, 'ack', 'two', 'Two'), row(9, 12, 'ack', 'older on nine', 'Nine')];
  assert.deepEqual(reviewRows(rows, proposes).map((r) => r.text), ['2 · Two · Check: two', '9 · Nine · Cross: newest on nine']);
});

test('one card, or a row without its title (flag off), has no list: Review goes straight to it', () => {
  assert.deepEqual(reviewRows([row(9, 14, 'drop', 'a', 'Nine'), row(9, 12, 'ack', 'b', 'Nine')], proposes), []);
  assert.deepEqual(reviewRows([row(1, 2, 'drop', 'a'), row(2, 3, 'ack', 'b')], proposes), []);
});

// ---- Review goes to the card and opens its box

interface Seen { go: number[]; fits: unknown[]; zooms: number[]; clicks: string[]; titles: (number | undefined)[] }

/** The flow over two proposals, cards 2 and 9, with the board at zoom `k`. */
function flow(over: { list?: boolean; k?: number; fitTo?: number } = {}) {
  const seen: Seen = { go: [], fits: [], zooms: [], clicks: [], titles: [] };
  const proposals = new Map([[10, { action: 'drop', reason: 'two', at: 'x' }], [11, { action: 'ack', reason: 'nine', at: 'x' }]]);
  const vp = {
    k: over.k ?? 1, hideFar: true,
    fit(_b: unknown, _animate?: boolean, o?: unknown) { seen.fits.push(o); if (over.fitTo !== undefined) this.k = over.fitTo; },
    zoomCentre(f: number) { seen.zooms.push(f); this.k *= f; },
  };
  const tab = (n: number) => ({ getAttribute: () => 'false', click: () => seen.clicks.push(`click ${n}`), focus: () => seen.clicks.push(`focus ${n}`) });
  const deps: ProposalDeps = {
    on: true, list: over.list ?? true, stage: {} as HTMLElement, vp, box: (id) => ({ x: 0, y: 0, w: 300, h: 200, id } as never),
    title: (n) => { seen.titles.push(n); return `Card ${n}`; }, go: (n) => seen.go.push(n),
    state: () => ({ proposals, agents: new Map() }) as unknown as LedgerState,
    found: () => [{ n: 2, seq: 10, stale: false }, { n: 9, seq: 11, stale: false }],
    readOnly: () => false, ver: () => 1,
    card: (id) => ({ querySelector: () => tab(Number(id)) }) as unknown as HTMLElement,
    record: async () => true, run: async () => true, toast: () => undefined,
    status: { now: initialStatus(), set: () => undefined } as unknown as Status, confirm: async () => true,
  };
  const f = createProposalFlow(deps);
  f.refresh();
  return { f, seen, vp };
}

test('Review n goes to card n as Go to card does, then opens its box', () => {
  const { f, seen } = flow();
  f.review(9);
  assert.deepEqual(seen.go, [9]);
  assert.deepEqual(seen.fits, [], 'the controls show at this zoom: the board is not zoomed');
  assert.deepEqual(seen.clicks, ['click 9']);
});

test('Review with no card goes to the first card with a proposal', () => {
  const { f, seen } = flow();
  f.review();
  assert.deepEqual(seen.go, [2]);
  assert.deepEqual(seen.clicks, ['click 2']);
});

test('a board zoomed out past where controls show zooms in on the card first', () => {
  const { f, seen, vp } = flow({ k: 0.3, fitTo: 0.8 });
  f.review(9);
  assert.equal(seen.fits.length, 1);
  assert.deepEqual(seen.zooms, [], 'the fit reached a readable zoom');
  assert.equal(vp.k, 0.8);
  assert.deepEqual(seen.clicks, ['click 9']);
});

test('a card too large to fit at a readable zoom is zoomed to where controls show', () => {
  const { f, seen, vp } = flow({ k: 0.3, fitTo: 0.3 });
  f.review(9);
  assert.equal(seen.zooms.length, 1);
  assert.ok(vp.k >= 0.55 - 1e-9);
});

test('a card with no proposal is not gone to', () => {
  const { f, seen } = flow();
  f.review(5);
  assert.deepEqual([seen.go, seen.clicks], [[], []]);
});

test('flag off: no title on the rows and Review opens the first box where the card is', () => {
  const { f, seen } = flow({ list: false, k: 0.3 });
  f.review();
  assert.deepEqual([seen.go, seen.fits, seen.titles], [[], [], []]);
  assert.deepEqual(seen.clicks, ['click 2']);
});
