// The history box's markup (card-polish FE_03): the ⓘ last in the footer, named for the card, and its
// box beside it; rows newest first as given, a button only for a row naming a note or a reply, every
// text run escaped; the empty line. Fixture words are invented.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ViewNode } from '../../format/src/index.ts';
import type { HistoryRow } from '../../actions/src/index.ts';
import { HISTORY_EMPTY, historyHead, historyLabel, historyMarkup, nodeTemplate, noteTime } from '../src/index.ts';

const node = (f: Partial<ViewNode>): ViewNode => ({ id: '4', region: 'r', kind: 'question', title: 'T', ...f });
const NOW = new Date('2026-10-19T12:00:00Z');
const row = (f: Partial<HistoryRow>): HistoryRow => ({ seq: 1, at: '2026-10-18T09:10:00Z', who: 'person', kind: 'check', words: 'You marked it ✓', ...f });

test('with the history option, the ⓘ is the footer\'s last control, named for the card, and its box follows the footer', () => {
  const html = nodeTemplate(node({ n: 4 }), { history: true, flag: true });
  const foot = html.slice(html.indexOf('<footer'), html.indexOf('</footer>'));
  assert.match(foot, /data-flag[^]*class="vb-act vb-history" aria-haspopup="dialog" aria-expanded="false" aria-controls="vb-pop-history-4" aria-label="History of card 4"/);
  assert.ok(foot.indexOf('vb-history') > foot.indexOf('vb-node-actions'), 'after the quick actions and the flag');
  assert.match(html, /<\/footer><div class="vb-tip vb-card-pop" data-pop="history" id="vb-pop-history-4" role="dialog" tabindex="0" aria-label="Card 4 history">/);
  assert.doesNotMatch(nodeTemplate(node({ n: 4 })), /vb-history/, 'none without the option');
  assert.doesNotMatch(nodeTemplate(node({ kind: 'topic' }), { history: true }), /vb-history/, 'none on a card with no footer');
  assert.equal(historyLabel(node({ kind: 'app', title: 'Calc' })), 'History of card: Calc');
  assert.equal(historyHead(node({ n: 4 })), 'Card 4 history');
});

test('historyMarkup: rows in the order given, a button only where a row names a note or a reply, text escaped', () => {
  const html = historyMarkup([
    row({ seq: 9, kind: 'replied', who: 'agent', agent: '<b>chat</b>', words: 'Agent replied to note 1', note: 3, reply: 9 }),
    row({ seq: 3, kind: 'note-sent', words: 'You sent note 1', note: 3 }),
    row({ seq: 2, kind: 'drawn', who: 'agent', words: 'Agent drew v1' }),
  ], NOW);
  assert.deepEqual([...html.matchAll(/data-seq="(\d+)"/g)].map((m) => m[1]), ['9', '3', '2']);
  assert.match(html, /<button type="button" class="vb-history-row" data-history-reply="9">/);
  assert.match(html, /<button type="button" class="vb-history-row" data-history-note="3">/);
  assert.match(html, /<div class="vb-history-row"><time class="vb-history-time" datetime="2026-10-18T09:10:00Z"/);
  assert.ok(html.includes(`>${noteTime('2026-10-18T09:10:00Z', NOW)}</time>`));
  assert.ok(html.includes(' · &#60;b&#62;chat&#60;/b&#62;') && !html.includes('<b>'), 'the agent label escaped');
  assert.equal(historyMarkup([], NOW), `<p class="vb-history-empty">${HISTORY_EMPTY}</p>`);
});
