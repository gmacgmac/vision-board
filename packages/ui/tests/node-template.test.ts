import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ViewNode } from '../../format/src/index.ts';
import { KINDS } from '../../format/src/index.ts';
import { esc, fullTime, KIND_ICON, nodeTemplate, notesMarkup, noteTime, offers } from '../src/index.ts';

const node = (f: Partial<ViewNode>): ViewNode =>
  ({ id: '1', region: 'r', kind: 'question', title: 'T', ...f });

const acts = (html: string): string[] => [...html.matchAll(/data-act="(\w+)"/g)].map((m) => m[1]!);

test('esc escapes the five HTML-significant characters', () =>
  assert.equal(esc(`<a href="x">'&'</a>`), '&#60;a href=&#34;x&#34;&#62;&#39;&#38;&#39;&#60;/a&#62;'));

test('nodeTemplate escapes title, body and tags', () => {
  const html = nodeTemplate(node({ n: 1, title: '<b>t</b>', body: 'a & "b"', tags: ['<i>'] }));
  assert.ok(!html.includes('<b>') && !html.includes('<i>'), 'no raw markup from data');
  assert.ok(html.includes('&#60;b&#62;t&#60;/b&#62;'));
  assert.ok(html.includes('a &#38; &#34;b&#34;'));
  assert.ok(html.includes('<li>&#60;i&#62;</li>'));
});

test('nodeTemplate shows the number only on items', () => {
  assert.match(nodeTemplate(node({ n: 41 })), /<span class="vb-node-num" aria-hidden="true">41<\/span>/);
  assert.doesNotMatch(nodeTemplate(node({ kind: 'topic' })), /vb-node-num/);
});

test('nodeTemplate draws one button per offered action, in order, for every kind', () => {
  for (const kind of KINDS) {
    for (const n of [node({ kind, n: 3 }), node({ kind })]) {
      const html = nodeTemplate(n);
      assert.deepEqual(acts(html), offers(n), `${kind}${n.n ? ' item' : ''}`);
      assert.equal(html.includes('vb-node-actions'), offers(n).length > 0, `${kind} toolbar`);
    }
  }
});

test('nodeTemplate carries no inline style and no style element (the CSP refuses them)', () => {
  const html = nodeTemplate(node({ n: 1, body: 'b', tags: ['t'] }));
  assert.doesNotMatch(html, /style=|<style/);
});

test('nodeTemplate puts number, kind and pin on the top border, before the content', () => {
  const html = nodeTemplate(node({ n: 41, kind: 'risk' }));
  assert.match(html, /^<span class="vb-node-num"[^>]*>41<\/span><span class="vb-node-kind">Risk<\/span><span class="vb-node-pin"/);
  assert.ok(html.indexOf('vb-node-pin') < html.indexOf('vb-node-content'));
});

test('nodeTemplate draws the footer on items (and app cards) only: kind icon, divider, state word, an app card\'s status, then buttons', () => {
  for (const kind of KINDS) {
    const item = nodeTemplate(node({ kind, n: 3 }));
    assert.match(item, new RegExp(`<footer class="vb-node-foot">.*${KIND_ICON[kind].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`
      + `.*vb-node-sep.*vb-node-status.*</span></span>${kind === 'app' ? '<div class="vb-app-status">.*' : ''}`
      + '(<div class="vb-node-actions"|<div class="vb-node-stepnav")'), kind);
    // An app card's Allow lives in the footer, so it has one with or without a number (card-polish FE_01).
    if (kind === 'app') assert.match(nodeTemplate(node({ kind })), /vb-node-foot/, 'app non-item');
    else assert.doesNotMatch(nodeTemplate(node({ kind })), /vb-node-foot|vb-node-status/, `${kind} non-item`);
  }
});

test('nodeTemplate draws the note block and, on items only, the note pin, both hidden for update() to fill', () => {
  const item = nodeTemplate(node({ n: 1 }));
  assert.match(item, /<div class="vb-node-notes" hidden><\/div>/);
  assert.match(item, /<button type="button" class="vb-note-pin" aria-haspopup="dialog" aria-expanded="false" hidden><\/button>/);
  assert.doesNotMatch(nodeTemplate(node({ kind: 'topic' })), /vb-note-pin/);
});

/** Notes made at 09:42 local time on 19 Oct 2026, read on that day (card-polish FE_02). */
const AT = new Date(2026, 9, 19, 9, 42).toISOString();
const NOW = new Date(2026, 9, 19, 15, 0);

test('notesMarkup: the head (count and Hide), then the entries in the order given (oldest first), each note with its seq and replies, sent ones marked, an orphan reply in its place, Markdown escaped', () => {
  const html = notesMarkup({
    count: '2 notes', toggle: 'Hide notes on item 1',
    entries: [
      { seq: 4, index: 1, who: 'Your note 1 · Sent', text: 'First', sent: true, at: AT, replies: [{ seq: 5, who: 'Agent reply', text: 'To first', at: AT }] },
      { seq: 6, who: 'Agent reply', text: 'On no note', orphan: true, at: AT },
      { seq: 9, index: 2, who: 'Your note 2', text: 'Check **the date** <b>', sent: false, at: AT },
    ],
    pin: { seq: 9, index: 2, sent: false, label: 'Note 2 on item 1. Edit it' },
  }, NOW);
  assert.ok(html.startsWith('<div class="vb-node-notes-head"><span class="vb-node-notes-count">2 notes</span>'
    + '<button type="button" class="vb-node-notes-toggle" data-notes="hide" aria-label="Hide notes on item 1">Hide</button></div>'));
  assert.match(html, /<div class="vb-node-note" data-note="4" data-at="[^"]+" data-sent tabindex="0"><span class="vb-node-note-who">Your note 1 · Sent<\/span>/);
  assert.match(html, /<strong>the date<\/strong> &#60;b&#62;/);
  assert.match(html, /<div class="vb-node-note" data-note="9" data-at="[^"]+" tabindex="0"><span class="vb-node-note-who">Your note 2<\/span>/);
  // The full note again as a tip, hidden from screen readers (they read the note itself).
  assert.ok(html.includes('<div class="vb-tip vb-note-tip" aria-hidden="true"><p class="vb-md-p">First</p></div></div>'));
  const at = (s: string) => html.indexOf(s);
  assert.ok(at('data-note="4"') < at('data-reply="5"') && at('data-reply="5"') < at('data-reply="6"') && at('data-reply="6"') < at('data-note="9"'));
});

test('notesMarkup: each note and reply carries its time in data-at, said once to screen readers and drawn in a chip hidden from them, its title the whole date', () => {
  const html = notesMarkup({
    count: '1 note', toggle: 'Hide notes on item 1',
    entries: [{ seq: 4, index: 1, who: 'Your note 1', text: 'First', sent: false, at: AT, replies: [{ seq: 5, who: 'Agent reply', text: 'Yes', at: AT }] }],
  }, NOW);
  const words = noteTime(AT, NOW);
  assert.match(words, /^Today /);
  assert.equal(html.split(`data-at="${AT}"`).length - 1, 2, 'on the note and on the reply');
  const said = `<span class="vb-visually-hidden"> · ${esc(words)}</span>`;
  const chip = `<span class="vb-note-time" aria-hidden="true" title="${esc(fullTime(AT))}">${esc(words)}</span>`;
  assert.equal(html.split(said + chip).length - 1, 2, 'after who wrote it, on the note and on the reply');
  assert.ok(html.indexOf('Your note 1</span>' + said) > 0);
});

test('notesMarkup: a thread put away is its head alone: the count with the new replies, and the same toggle on the right, now Show', () => {
  const html = notesMarkup({
    count: '2 notes', toggle: 'Show 2 notes · 1 new reply on item 1', hidden: '2 notes · 1 new reply',
    entries: [{ seq: 4, index: 1, who: 'Your note 1', text: 'Secret words', sent: false, at: AT }],
  }, NOW);
  assert.equal(html, '<div class="vb-node-notes-head"><span class="vb-node-notes-count">2 notes · 1 new reply</span>'
    + '<button type="button" class="vb-node-notes-toggle" data-notes="show" aria-label="Show 2 notes · 1 new reply on item 1">Show</button></div>');
});

test('KIND_ICON has a drawing for every kind', () => {
  for (const kind of KINDS) assert.match(KIND_ICON[kind], /^<(path|circle) /, kind);
});

test('nodeTemplate renders the body as Markdown in div.vb-node-body (D-023)', () => {
  const html = nodeTemplate(node({ n: 1, body: '### Options\n\n- **One**\n- Two' }));
  assert.match(html, /<div class="vb-node-body"><span class="vb-md-label" role="heading" aria-level="4">Options<\/span>/);
  assert.match(html, /<ul class="vb-md-list"><li><strong>One<\/strong><\/li><li>Two<\/li><\/ul><\/div>/);
});

test('nodeTemplate escapes raw HTML in a Markdown body', () => {
  const html = nodeTemplate(node({ n: 1, body: 'a <b>bold</b> claim' }));
  assert.ok(html.includes('<div class="vb-node-body"><p class="vb-md-p">a &#60;b&#62;bold&#60;/b&#62; claim</p></div>'));
  assert.ok(!html.includes('<b>'));
});

// D-045: ✓ and ✗ carry no meaning; their tooltips are the registry's labels on every kind.
test('nodeTemplate: ✓ and ✗ read Check and Cross on every kind that asks; no More context', () => {
  const tips = (kind: ViewNode['kind']) => Object.fromEntries([...nodeTemplate(node({ kind, n: 3 }))
    .matchAll(/data-act="(\w+)"[^>]* title="([^"]*)"/g)].map((m) => [m[1]!, m[2]!]));
  const asks = { ack: 'Check · a', drop: 'Cross · x', comment: 'Comment · c', later: 'Save for later · l' };
  assert.deepEqual([tips('question'), tips('action'), tips('decision')], [asks, asks, asks]);
  assert.deepEqual(tips('finding'), { comment: 'Comment · c', later: 'Save for later · l' });
});
