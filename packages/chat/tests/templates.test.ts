// The chat's other cores and templates (FE_01 rulings 3 and 5): messages and chips, the feed's
// skeleton (a polite log), change chips and system lines, the composer and the header.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ChangeEntry } from '../src/index.ts';
import {
  applyEvents, changeTemplate, chipsTemplate, composerTemplate, composerView, DEFAULT_MODEL, EMPTY_CHAT, feedTemplate, headerTemplate,
  headerView, lineTemplate, messageTemplate, plainText, sendIntent, systemTemplate, withoutChip,
} from '../src/index.ts';
import { stamp, TURN } from './support.ts';

const md = (src: string) => `<p class="md">${src.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')}</p>`;

test('message: the agent\'s words through the host\'s renderer; the person\'s exactly as typed, with their chips', () => {
  assert.equal(messageTemplate({ type: 'agent', key: 'e7', text: 'I drew **two**.', interim: false }, md),
    '<span class="chat-sr">Agent: </span><div class="chat-bubble"><p class="md">I drew <strong>two</strong>.</p></div>');
  const own = messageTemplate({ type: 'person', key: 'e1', text: 'Is **this** <b>ok</b>?', chips: [{ kind: 'card', ref: 4, label: 'Pricing' }, { kind: 'note', ref: 81, label: 'Too many?' }] }, md);
  assert.match(own, /<p class="chat-own">Is \*\*this\*\* &lt;b&gt;ok&lt;\/b&gt;\?<\/p>/);
  assert.match(own, /<ul class="chat-chips" aria-label="Sent with it">/);
  assert.match(own, /<span class="chat-chip-n">4<\/span><span class="chat-chip-t">Pricing<\/span>/);
  assert.match(own, /<span class="chat-chip-n">Note<\/span><span class="chat-chip-t">Too many\?<\/span>/);
  assert.doesNotMatch(own, /chat-chip-x/);
  assert.equal(plainText('<i>a</i>'), '<p class="chat-plain">&lt;i&gt;a&lt;/i&gt;</p>');
});

test('feed: a polite, named, focusable log between the empty line and the status line', () => {
  const html = feedTemplate('No messages yet.', 'Conversation');
  assert.match(html, /^<p class="chat-empty">No messages yet\.<\/p>/);
  assert.match(html, /<div class="chat-log" role="log" aria-live="polite" aria-label="Conversation" tabindex="0"><\/div>/);
  assert.match(html, /<p class="chat-activity" role="status"><\/p>$/);
  assert.equal(systemTemplate({ type: 'system', key: 'e3', text: 'Stopped.', turn: 'stopped' }), '<p class="chat-system" data-turn="stopped">Stopped.</p>');
});

test('change chip: a button with the label, the board and the cards, numbers summed up past six', () => {
  const c: ChangeEntry = { type: 'change', key: 'e6', board: 'pricing', cards: [5, 6], head: 12 };
  const html = changeTemplate(c, () => 'Pricing & plans');
  assert.match(html, /^<button type="button" class="chat-change" data-board="pricing" data-cards="5,6">/);
  assert.match(html, /<span class="chat-change-text">Drew 2 cards on Pricing &amp; plans<\/span><span class="chat-change-cards">5, 6<\/span>/);
  assert.match(changeTemplate({ ...c, cards: [1, 2, 3, 4, 5, 6, 7, 8] }), /1, 2, 3, 4, 5, 6 \+2/);
  assert.doesNotMatch(changeTemplate({ ...c, cards: [] }), /chat-change-cards/);
});

test('composer: Send only with words while the chat lets it; the reason when shut; the keys otherwise', () => {
  const busy = applyEvents(EMPTY_CHAT, stamp(TURN.slice(0, 1)));
  assert.deepEqual(composerView(EMPTY_CHAT), { send: true, hint: 'Enter send · Shift+Enter new line', placeholder: 'Message the agent' });
  assert.equal(composerView(busy).send, false);
  assert.match(composerView(busy).hint, /Stop it to send now/);
  const shut = composerView(EMPTY_CHAT, { blocked: 'A past version is showing.' });
  assert.equal(shut.shut, 'A past version is showing.');
  assert.equal(lineTemplate(shut), 'A past version is showing.');
  assert.equal(lineTemplate(composerView(EMPTY_CHAT)), '<kbd>Enter</kbd> send · <kbd>Shift</kbd>+<kbd>Enter</kbd> new line');
  assert.equal(sendIntent('  ', true), 'skip');
  assert.equal(sendIntent('Go', false), 'skip');
  assert.equal(sendIntent('Go', true), 'send');
});

test('composer: a labelled text and Send; each chip removable by name', () => {
  const html = composerTemplate('Message to the agent', 100000);
  assert.match(html, /<textarea class="chat-cmp-text" rows="2" maxlength="100000" aria-label="Message to the agent"><\/textarea>/);
  assert.match(html, /<button type="button" class="chat-cmp-send" aria-label="Send">/);
  const chips = [{ kind: 'card' as const, ref: 12, label: 'Ship on Friday?' }, { kind: 'note' as const, ref: 40, label: 'Too soon' }];
  const row = chipsTemplate(chips);
  assert.match(row, /data-chip="card-12" aria-label="Remove Card 12: Ship on Friday\?"/);
  assert.match(row, /data-chip="note-40" aria-label="Remove Note: Too soon"/);
  assert.equal(chipsTemplate([]), '');
  assert.deepEqual(withoutChip(chips, 'card-12'), [chips[1]]);
});

test('header: the agent and model named, a picker only with a choice; the status and Stop from the conditions', () => {
  const agents = [{ id: 'claude', label: 'Claude' }, { id: 'kiro', label: 'Kiro' }];
  const idle = headerView({ agent: 'claude', agents: [agents[0]!] }, EMPTY_CHAT);
  assert.deepEqual(idle.agent, { id: 'claude', label: 'Claude' });
  assert.deepEqual(idle.model, { id: '', label: DEFAULT_MODEL });
  assert.equal(idle.stop, false);
  const html = headerTemplate(idle);
  assert.match(html, /<span class="chat-hd-agent" title="Agent">Claude<\/span>/);
  assert.match(html, /data-do="stop" disabled>Stop/);
  assert.match(html, /data-tone="quiet" data-status="ready">.*Ready<\/p>/);
  const busy = headerView({ agent: 'kiro', agents, model: 'opus' }, applyEvents(EMPTY_CHAT, stamp(TURN.slice(0, 1))));
  assert.equal(busy.stop, true);
  const picker = headerTemplate(busy);
  assert.match(picker, /<select class="chat-hd-pick chat-hd-agent" data-pick="agent" aria-label="Agent"><option value="claude">Claude<\/option><option value="kiro" selected>Kiro<\/option><\/select>/);
  assert.match(picker, /<span class="chat-hd-model" title="Model">opus<\/span>/);
  assert.match(picker, /data-status="busy">.*Working<\/p>/);
});
