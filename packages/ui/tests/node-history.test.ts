// The history box's markup (card-polish FE_03, D-099 1): the box beside a node that the change badge controls, its
// head and ×, the stepper on top; rows newest first as given, a button only for a row naming a note or a reply,
// every text run escaped; the empty line. Fixture words are invented.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ViewNode } from '#format';
import type { HistoryRow } from '#actions';
import { HISTORY_EMPTY, historyHead, historyMarkup, nodeTemplate, noteTime } from '../src/index.ts';

const node = (f: Partial<ViewNode>): ViewNode => ({ id: '4', region: 'r', kind: 'question', title: 'T', ...f });
const NOW = new Date('2026-10-19T12:00:00Z');
const row = (f: Partial<HistoryRow>): HistoryRow => ({ seq: 1, at: '2026-10-18T09:10:00Z', who: 'person', kind: 'check', words: 'You marked it ✓', ...f });

test('an item has the history box beside it, which its change badge controls: "History of 4", an ×, the stepper, the list', () => {
  const html = nodeTemplate(node({ n: 4 }));
  assert.match(html, /data-mark="badge"[^>]* aria-controls="vb-pop-history-4" hidden>/);
  assert.match(html, /<div class="vb-tip vb-card-pop vb-node-box" data-pop="history" id="vb-pop-history-4" role="dialog" tabindex="0" aria-label="History of 4">/);
  assert.match(html, /<span class="vb-node-box-title">History of 4<\/span><button type="button" class="vb-node-box-x" data-box-close aria-label="Close history">/);
  assert.match(html, /<div class="vb-node-box-step"><div class="vb-node-steps"[^]*<div class="vb-node-stepnav" hidden>/);
  assert.doesNotMatch(nodeTemplate(node({ kind: 'topic' })), /vb-history/, 'none on a node with no number');
  assert.equal(historyHead(node({ n: 4 })), 'Card 4 history');
  assert.equal(historyHead(node({ title: 'Calc' })), 'Calc: history');
});

test('historyMarkup: rows in the order given, a button only where a row names a note or a reply, text escaped', () => {
  const html = historyMarkup([
    row({ seq: 9, kind: 'replied', who: 'agent', agent: '<b>chat</b>', words: 'Agent replied to note 1', note: 3, reply: 9 }),
    row({ seq: 3, kind: 'note-sent', words: 'You sent note 1', note: 3 }),
    row({ seq: 2, kind: 'drawn', who: 'agent', words: 'Agent drew v1', ver: 1 }),
  ], NOW);
  assert.deepEqual([...html.matchAll(/data-seq="(\d+)"/g)].map((m) => m[1]), ['9', '3', '2']);
  assert.match(html, /<button type="button" class="vb-history-row" data-history-reply="9">/);
  assert.match(html, /<button type="button" class="vb-history-row" data-history-note="3">/);
  assert.match(html, /<div class="vb-history-row"><b class="vb-history-ver" aria-hidden="true">v1<\/b><span class="vb-history-words">Agent drew v1<\/span>/);
  assert.ok(html.includes(`datetime="2026-10-18T09:10:00Z" title="`) && html.includes(`>${noteTime('2026-10-18T09:10:00Z', NOW)}</time>`));
  assert.ok(html.includes('<span class="vb-history-agent">&#60;b&#62;chat&#60;/b&#62; · </span>') && !html.includes('<b>chat'), 'the agent label escaped');
  assert.equal(historyMarkup([], NOW), `<p class="vb-history-empty">${HISTORY_EMPTY}</p>`);
});
