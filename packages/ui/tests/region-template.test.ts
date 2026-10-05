import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MODES } from '../../format/src/index.ts';
import { holdersTemplate, MODE_HINT, MODE_LABEL, regionIds, regionTemplate } from '../src/index.ts';

const region = { id: 'review', title: 'Review', mode: 'flow' as const };

test('regionTemplate escapes the title in the heading, the row label, the cog and the menu', () => {
  const html = regionTemplate({ id: 'r', title: '<b>"x"</b> & co', mode: 'grid' });
  const t = '&#60;b&#62;&#34;x&#34;&#60;/b&#62; &#38; co';
  assert.ok(!html.includes('<b>'), 'no raw markup from data');
  assert.ok(html.includes(`<h2 id="region-r">${t}</h2>`));
  assert.ok(html.includes(`role="radiogroup" aria-label="Layout for ${t}"`));
  assert.ok(html.includes(`aria-label="Settings for ${t}" aria-haspopup="menu"`));
  assert.ok(html.includes(`role="menu" aria-label="Settings for ${t}"`));
});

test('the mode row: one radio icon per mode, in order, unchecked and out of the tab order, tied to the region', () => {
  const html = regionTemplate(region);
  const radios = [...html.matchAll(/<button type="button" class="vb-mseg" role="radio" aria-checked="(\w+)" tabindex="(-?\d)" aria-label="(\w+)" data-mode="(\w+)" data-region="(\w+)"><svg class="vb-mode-icon"[^>]*>.*?<\/svg><\/button>/g)];
  assert.deepEqual(radios.map((b) => b[4]), [...MODES]);
  for (const [, checked, tabindex, label, mode, rid] of radios) {
    assert.equal(checked, 'false', 'update() checks the one in force');
    assert.equal(tabindex, '-1', 'update() makes the checked one the row\'s Tab stop');
    assert.equal(label, MODE_LABEL[mode as (typeof MODES)[number]]);
    assert.equal(rid, 'review');
  }
});

test('the mode row ends in a divider, Comment and the cog, a menu button for the settings menu', () => {
  const html = regionTemplate(region);
  assert.match(html, /<span class="vb-mode-div" aria-hidden="true"><\/span><button type="button" class="vb-mseg vb-region-comment"[^>]*>.*?<\/button><button type="button" class="vb-mseg vb-cog" tabindex="-1" aria-label="Settings for Review" aria-haspopup="menu" aria-expanded="false" aria-controls="region-review-menu"><svg class="vb-mode-icon"[^>]*>.*?<\/svg><\/button><\/div>/);
  assert.equal((html.match(/data-mode=/g) ?? []).length, 5, 'the cog is not a layout');
});

test('the popover is a tooltip with one tile per mode and its one-liner, then the agent\'s choice and the keys', () => {
  const html = regionTemplate(region);
  assert.match(html, /<div class="vb-mode-pop" id="region-review-modes" role="tooltip">/);
  const tiles = [...html.matchAll(/<div class="vb-mtile" data-tile="(\w+)"><svg[^>]*>.*?<\/svg><span class="vb-mtile-name">(\w+)<\/span><small>([^<]+)<\/small><\/div>/g)];
  assert.deepEqual(tiles.map((t) => t[1]), [...MODES]);
  for (const [, mode, name, hint] of tiles) {
    assert.equal(name, MODE_LABEL[mode as (typeof MODES)[number]]);
    assert.equal(hint, MODE_HINT[mode as (typeof MODES)[number]]);
  }
  assert.ok(html.includes('<span>The agent chose Flow for this container.</span>'), 'the view\'s mode, the agent\'s choice');
  assert.ok(html.includes('<kbd>←</kbd> <kbd>→</kbd> move · <kbd>Enter</kbd> apply · <kbd>Esc</kbd> close'));
  assert.match(html, /<p class="vb-mode-line"><\/p>/);
});

test('the settings menu holds Reset places and Put container back, each disabled with its hint until update() says otherwise', () => {
  const html = regionTemplate(region);
  assert.match(html, /<div class="vb-region-menu" id="region-review-menu" role="menu" aria-label="Settings for Review"><button type="button" class="vb-menu-item" role="menuitem" tabindex="-1" data-reset="review" aria-label="Reset places" aria-disabled="true" aria-describedby="region-review-reset-hint">Reset places<span class="vb-menu-hint" id="region-review-reset-hint">No cards moved<\/span><\/button>/);
  assert.match(html, /<button type="button" class="vb-menu-item" role="menuitem" tabindex="-1" data-put-back="review" aria-label="Put container back" aria-disabled="true" aria-describedby="region-review-back-hint">Put container back<span class="vb-menu-hint" id="region-review-back-hint">Not moved<\/span><\/button><\/div>/);
  assert.equal((html.match(/role="menuitem"/g) ?? []).length, 2);
  assert.deepEqual(regionIds('review'), {
    heading: 'region-review', modes: 'region-review-modes', menu: 'region-review-menu', hint: 'region-review-reset-hint',
    back: 'region-review-back-hint',
  });
});

test('the grip starts the title line: a labelled button with grip dots, for Alt+arrows too (3_FE_04 ruling 5)', () => {
  const html = regionTemplate(region);
  assert.match(html, /<div class="vb-region-label"><button type="button" class="vb-region-grip" aria-label="Move container Review" aria-keyshortcuts="Alt\+ArrowLeft Alt\+ArrowRight Alt\+ArrowUp Alt\+ArrowDown" title="Move container · Alt\+arrows"><\/button><h2 id="region-review">/);
  // Later can be placed: a fixed frame keeps its grip.
  assert.match(regionTemplate({ id: 'later', title: 'Later', mode: 'grid' }, { fixed: true }), /class="vb-region-grip" aria-label="Move container Later"/);
});

test('Comment sits in the row beside the cog, the cog last; the pin and the "Your note" line wait hidden (ruling 3)', () => {
  const html = regionTemplate(region);
  assert.match(html, /<button type="button" class="vb-mseg vb-region-comment" tabindex="-1" aria-label="Comment on container Review" title="Comment · C" aria-haspopup="dialog" data-region-comment="review"><svg class="vb-mode-icon"[^>]*>.*?<\/svg><\/button><button type="button" class="vb-mseg vb-cog"/);
  assert.match(html, /<button type="button" class="vb-region-note-pin" data-region-note="review" aria-haspopup="dialog" aria-expanded="false" hidden><\/button><\/div>/);
  assert.match(html, /<\/header><p class="vb-region-note" data-region-note="review" hidden><span class="vb-region-note-who"><\/span> <span class="vb-region-note-text"><\/span><\/p>/);
  // The built-in Later takes no note: no Comment, no pin, no line.
  const later = regionTemplate({ id: 'later', title: 'Later', mode: 'grid' }, { fixed: true });
  assert.doesNotMatch(later, /vb-region-comment|vb-region-note/);
});

test('regionTemplate has a count and a hidden empty message', () => {
  const html = regionTemplate(region);
  assert.match(html, /<span class="vb-region-count"><\/span>/);
  assert.match(html, /<p class="vb-region-empty" hidden>Everything here is decided\.<\/p>/);
});

test('regionTemplate carries no inline style and no style element (the CSP refuses them)', () => {
  assert.doesNotMatch(regionTemplate(region), /style=|<style/);
});

test('the top line: title, count and holders in a label group, then the row, popover and menu in a tools group', () => {
  const html = regionTemplate(region);
  assert.match(html, /^<header class="vb-region-head"><div class="vb-region-label"><button type="button" class="vb-region-grip"[^>]*><\/button><h2 id="region-review">Review<\/h2><span class="vb-region-count"><\/span><span class="vb-region-holders"><\/span><button type="button" class="vb-region-note-pin"[^>]*><\/button><\/div><div class="vb-region-tools"><div class="vb-mode-row"/);
  assert.match(html, /<\/div><div class="vb-mode-pop".*<\/div><div class="vb-region-menu".*<\/button><\/div><\/div><\/header>/);
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
