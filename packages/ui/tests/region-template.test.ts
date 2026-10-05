import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MODES } from '../../format/src/index.ts';
import { holdersTemplate, MODE_LABEL, regionTemplate } from '../src/index.ts';

const region = { id: 'review', title: 'Review' };

test('regionTemplate escapes the title in the heading and the group label', () => {
  const html = regionTemplate({ id: 'r', title: '<b>"x"</b> & co' });
  assert.ok(!html.includes('<b>'), 'no raw markup from data');
  assert.ok(html.includes('<h2 id="region-r">&#60;b&#62;&#34;x&#34;&#60;/b&#62; &#38; co</h2>'));
  assert.ok(html.includes('aria-label="Layout for &#60;b&#62;&#34;x&#34;&#60;/b&#62; &#38; co"'));
});

test('regionTemplate draws one mode button per mode, in order, unpressed, labelled and tied to the region', () => {
  const html = regionTemplate(region);
  const buttons = [...html.matchAll(/<button type="button" class="vb-mode" data-mode="(\w+)" data-region="(\w+)" aria-pressed="(\w+)">([^<]+)<\/button>/g)];
  assert.deepEqual(buttons.map((b) => b[1]), [...MODES]);
  assert.equal(buttons.length, 5);
  for (const [, mode, rid, pressed, label] of buttons) {
    assert.equal(rid, 'review');
    assert.equal(pressed, 'false', 'update() sets the pressed one');
    assert.equal(label, MODE_LABEL[mode as (typeof MODES)[number]]);
  }
});

test('regionTemplate has a hidden Reset places button, a count and a hidden empty message', () => {
  const html = regionTemplate(region);
  assert.match(html, /<span class="vb-region-count"><\/span>/);
  assert.match(html, /<button type="button" class="vb-btn vb-btn-small" data-reset="review" hidden>Reset places<\/button>/);
  assert.match(html, /<p class="vb-region-empty" hidden>Everything here is decided\.<\/p>/);
});

test('regionTemplate puts the controls in a labelled group inside the header', () => {
  const html = regionTemplate(region);
  assert.match(html, /^<header class="vb-region-head">.*<div class="vb-modes" role="group" aria-label="Layout for Review">.*<\/header>/);
});

test('regionTemplate carries no inline style and no style element (the CSP refuses them)', () => {
  assert.doesNotMatch(regionTemplate(region), /style=|<style/);
});

test('regionTemplate puts the title, count and holders in a label group and the buttons in a tools group, in that order', () => {
  const html = regionTemplate(region);
  assert.match(html, /<header class=\"vb-region-head\"><div class=\"vb-region-label\"><h2 id=\"region-review\">Review<\/h2><span class=\"vb-region-count\"><\/span><span class=\"vb-region-holders\"><\/span><\/div><div class=\"vb-region-tools\"><div class=\"vb-modes\"/);
  assert.match(html, /Reset places<\/button><\/div><\/header>/);
});

test('holdersTemplate: the creator is plain text; any other holder is a labelled Remove access button; text is escaped', () => {
  const html = holdersTemplate([
    { agent: 'a-aaaa1111', label: 'Pricing chat', removable: false },
    { agent: 'a-bbbb2222', label: '<b>Docs</b> & co', removable: true },
  ]);
  assert.ok(!html.includes('<b>'), 'no raw markup from data');
  assert.match(html, /^<span class="vb-holder" title="Created this container"><span class="vb-holder-sep" aria-hidden="true">·<\/span><span class="vb-holder-name">Pricing chat<\/span><\/span>/);
  assert.match(html, /<button type="button" class="vb-holder" data-revoke="a-bbbb2222" aria-label="&#60;b&#62;Docs&#60;\/b&#62; &#38; co: remove access">/);
  assert.match(html, /<span class="vb-holder-remove" aria-hidden="true">Remove access<\/span><\/button>$/);
  assert.equal((html.match(/<button/g) ?? []).length, 1, 'the creator has no remove control');
  assert.equal(holdersTemplate([]), '');
  assert.doesNotMatch(html, /style=|<style/);
});
