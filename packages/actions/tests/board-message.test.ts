// What a chat message carries from the board (composer-one-chip rulings 2, 3): the selection,
// headed "The person selected these cards:", then the round (the answers since `since`, the head it
// covers, the notes its lines carry), blocks apart by a blank line. One writer for the server's
// prompt and the page's preview.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { boardBlocks, ROUND_HEAD, roundOf, SELECTED_HEAD, selectionText } from '../src/index.ts';
import { A, scene } from './ledger-v3.ts';

test('the selection: the heading, then one line per card in the order selected; nothing with none', () => {
  assert.equal(selectionText([{ n: 3, title: 'Book the venue' }, { n: 1, title: 'Ship on Friday?' }]),
    `${SELECTED_HEAD}\n- Card 3: Book the venue\n- Card 1: Ship on Friday?`);
  assert.equal(SELECTED_HEAD, 'The person selected these cards:');
  assert.equal(selectionText([]), '');
});

test('the round: what was answered after `since`, its count, the notes its lines carry, the head it covers', () => {
  const l = scene();
  const since = l.seq;
  assert.equal(roundOf(l.state(), 'b', since), undefined, 'nothing answered yet');
  l.act({ action: 'ack', n: 1, ver: 1 });
  const note = l.act({ action: 'comment', n: 2, ver: 1, text: 'Why?' });
  const s = l.state();
  const round = roundOf(s, 'b', since)!;
  const lines = round.text.split('\n');
  assert.equal(lines[0], ROUND_HEAD);
  assert.equal(lines.at(-1), `These are the person's answers up to head ${s.seq}. To read anything newer, call check_responses on board "b" with after ${s.seq}.`);
  assert.ok(lines.includes('1 (question): ✓'));
  assert.deepEqual([round.count, [...round.notes]], [2, [note]]);
  assert.equal(roundOf(s, 'b', s.seq), undefined, 'nothing after the latest line');
  assert.deepEqual([roundOf(s, 'b', since, A)!.count, roundOf(s, 'b', since, A)!.notes.size], [1, 0], 'agent A may answer card 1 only (B holds q)');
});

test('the blocks: the selection, then what else is attached, then the round; each left out when empty', () => {
  const l = scene();
  const since = l.seq;
  l.act({ action: 'ack', n: 1, ver: 1 });
  const round = roundOf(l.state(), 'b', since)!;
  const cards = [{ n: 2, title: 'Node 2' }];
  assert.equal(boardBlocks(cards, round), `${selectionText(cards)}\n\n${round.text}`);
  assert.equal(boardBlocks(cards, round, 'Attached from the board:\n- Note 9'), `${selectionText(cards)}\n\nAttached from the board:\n- Note 9\n\n${round.text}`);
  assert.equal(boardBlocks([], round), round.text);
  assert.equal(boardBlocks(cards), selectionText(cards));
  assert.equal(boardBlocks([]), '');
});
