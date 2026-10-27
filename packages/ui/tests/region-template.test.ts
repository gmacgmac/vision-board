import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MODES } from '#format';
import { EYE_ICON, holdersTemplate, MODE_HINT, MODE_LABEL, nblockRepliesMarkup, regionIds, regionTemplate } from '../src/index.ts';

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
  assert.equal((html.match(/data-mode=/g) ?? []).length, MODES.length, 'six layouts (column and row, no list); the cog is not a layout');
});

test('the popover is a tooltip with one tile per mode and its one-liner, then the agent\'s choice and the keys', () => {
  const html = regionTemplate(region);
  assert.match(html, /<div class="vb-mode-pop" id="region-review-modes" role="tooltip">/);
  const tiles = [...html.matchAll(/<button type="button" class="vb-mtile" tabindex="-1" data-tile="(\w+)" data-region="review"><svg[^>]*>.*?<\/svg><span class="vb-mtile-name">(\w+)<\/span><small>([^<]+)<\/small><\/button>/g)];
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
    back: 'region-review-back-hint', preview: 'region-review-note-preview', previewText: 'region-review-note-preview-text',
    noteText: 'region-review-note-text',
  });
});

test('the grip starts the title line: a labelled button with grip dots, for Alt+arrows too (3_FE_04 ruling 5)', () => {
  const html = regionTemplate(region);
  assert.match(html, /<div class="vb-region-label"><span class="vb-region-handle"><button type="button" class="vb-region-grip" aria-label="Move container Review" aria-keyshortcuts="Alt\+ArrowLeft Alt\+ArrowRight Alt\+ArrowUp Alt\+ArrowDown" title="Move container · Alt\+arrows"><\/button><h2 id="region-review">/);
  // Later can be placed: a fixed frame keeps its grip.
  assert.match(regionTemplate({ id: 'later', title: 'Later', mode: 'grid' }, { fixed: true }), /class="vb-region-grip" aria-label="Move container Later"/);
});

test('Comment sits in the row beside the cog, the cog last, with its badge; no note pin or "Your note" line (step 4G ruling 1)', () => {
  const html = regionTemplate(region);
  assert.match(html, /<button type="button" class="vb-mseg vb-region-comment" tabindex="-1" aria-label="Comment on container Review" title="Comment · C" aria-haspopup="dialog" data-region-comment="review"><svg class="vb-mode-icon"[^>]*>.*?<\/svg><span class="vb-region-badge" aria-hidden="true">1<\/span><\/button><button type="button" class="vb-mseg vb-cog"/);
  assert.doesNotMatch(html, /vb-region-note-pin|class="vb-region-note"|data-region-note=|Your note<\/span> <span/);
  // The built-in Later takes no note: no Comment, no preview, no note block.
  const later = regionTemplate({ id: 'later', title: 'Later', mode: 'grid' }, { fixed: true });
  assert.doesNotMatch(later, /vb-region-comment|vb-note-pop|vb-region-note-block/);
});

test('the preview: a non-modal labelled dialog after the layout popover, with the text, the state, Edit and Show in container (ruling 2)', () => {
  const html = regionTemplate(region);
  assert.match(html, /<\/div><div class="vb-note-pop" id="region-review-note-preview" role="dialog" aria-label="Note on container Review"><p class="vb-note-pop-text" id="region-review-note-preview-text"><\/p><p class="vb-note-state"><\/p><div class="vb-note-acts"><button type="button" class="vb-note-btn" data-note-act="edit">Edit<\/button><button type="button" class="vb-note-btn" data-note-act="show"><svg class="vb-note-eye" viewBox="0 0 20 20" aria-hidden="true" focusable="false">.*?<\/svg><span class="vb-note-show-label">Show in container<\/span><\/button><\/div><\/div><div class="vb-region-menu"/);
  assert.doesNotMatch(html, /role="tooltip"[^>]*>[^<]*<p class="vb-note-pop-text"/, 'not a tooltip: it holds buttons');
  assert.match(EYE_ICON, /^<path d="[^"]+"\/><circle [^>]+\/>$/);
});

test('the note block: hidden under the title line and before the empty message, with state, Edit, Remove, the text and Show all (ruling 3)', () => {
  const html = regionTemplate(region);
  assert.match(html, /<\/header><section class="vb-region-note-block" role="group" aria-label="Note on container Review" hidden><div class="vb-nblock-top"><span class="vb-nblock-who">Your note<\/span><span class="vb-note-state"><\/span><span class="vb-nblock-acts"><button type="button" class="vb-note-btn" data-note-act="edit" aria-label="Edit note on container Review">Edit<\/button><button type="button" class="vb-note-btn" data-note-act="remove" aria-label="Remove note on container Review">Remove<\/button><span class="vb-nblock-ro"><\/span><\/span><\/div><p class="vb-nblock-text" id="region-review-note-text" tabindex="0"><\/p><div class="vb-nblock-replies"><\/div><button type="button" class="vb-nblock-more" aria-expanded="false" aria-controls="region-review-note-text" hidden>Show all<\/button><\/section><p class="vb-region-empty" hidden>/);
  // The page's delegated click listener reads data-note (cards) and data-region-note: neither is here.
  assert.doesNotMatch(html, /data-note=|data-region-note=/);
});

test('the note parts escape the title', () => {
  const html = regionTemplate({ id: 'r', title: '<b>x</b>', mode: 'grid' });
  assert.ok(html.includes('aria-label="Note on container &#60;b&#62;x&#60;/b&#62;"'));
  assert.ok(html.includes('aria-label="Remove note on container &#60;b&#62;x&#60;/b&#62;"'));
  assert.ok(!html.includes('<b>'));
});

test('regionTemplate has a count and a hidden empty message', () => {
  const html = regionTemplate(region);
  assert.match(html, /<span class="vb-region-count" hidden><span class="vb-region-count-n" aria-hidden="true"><\/span><span class="vb-region-count-words"><\/span><\/span>/);
  assert.match(html, /<p class="vb-region-empty" hidden>Everything here is answered\.<\/p>/);
});

test('regionTemplate carries no inline style and no style element (the CSP refuses them)', () => {
  assert.doesNotMatch(regionTemplate(region), /style=|<style/);
});

// Open list and container title FE_02: the grip, the title and the count are one handle (one hover
// tint, a drag on any of them moves the container); the line's bar places the label in the middle.
test('the top line: in its bar, a label group (the handle: grip, title and count; then the fresh pill (freshCards), the retired marker (field report batch 2), holders and the title tip, the full title hidden from assistive tech), then the row, popover and menu in a tools group', () => {
  const html = regionTemplate(region);
  assert.match(html, /^<header class="vb-region-head"><div class="vb-region-bar"><div class="vb-region-label"><span class="vb-region-handle"><button type="button" class="vb-region-grip"[^>]*><\/button><h2 id="region-review">Review<\/h2><span class="vb-region-count" hidden><span class="vb-region-count-n" aria-hidden="true"><\/span><span class="vb-region-count-words"><\/span><\/span><\/span><span class="vb-region-fresh-slot"><span class="vb-region-fresh" hidden><span class="vb-region-fresh-n" aria-hidden="true"><\/span><span class="vb-region-fresh-words"><\/span><\/span><\/span><button type="button" class="vb-region-retired" hidden><svg class="vb-retired-icon"[^>]*>.*?<\/svg><span class="vb-retired-n"><\/span><span class="vb-retired-word"> retired<\/span><\/button><span class="vb-region-holders"><\/span><span class="vb-tip vb-title-tip" aria-hidden="true">Review<\/span><\/div><div class="vb-region-tools"><div class="vb-mode-row"/);
  assert.match(html, /<\/div><div class="vb-mode-pop".*<\/div><div class="vb-note-pop".*<\/div><div class="vb-region-menu".*<\/button><\/div><\/div><\/div><\/header>/);
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

test('the title tip holds the escaped full title and is hidden from assistive tech (the heading keeps the text)', () => {
  const html = regionTemplate({ id: 'r', title: '<b>x</b>', mode: 'grid' });
  assert.ok(html.includes('<span class="vb-tip vb-title-tip" aria-hidden="true">&#60;b&#62;x&#60;/b&#62;</span>'));
});

// Review polish ruling 9 (N41): a narrow frame cuts its title to one line with "…" in CSS only; the
// markup keeps the whole title in the heading (the accessible name) and in the tip (on hover).
test('a long title is never cut in the markup: the heading and the tip hold it whole', () => {
  const long = 'Annual plan pricing, packaging, discount rules and regional overrides';
  const html = regionTemplate({ id: 'r', title: long, mode: 'grid' });
  assert.ok(html.includes(`<h2 id="region-r">${long}</h2>`));
  assert.ok(html.includes(`<span class="vb-tip vb-title-tip" aria-hidden="true">${long}</span>`));
});

test('the title line holds the fresh pill, then the retired marker, after the count (outside the handle), hidden until update() fills them', () => {
  const html = regionTemplate(region);
  assert.match(html, /<span class="vb-region-count" hidden><span class="vb-region-count-n" aria-hidden="true"><\/span><span class="vb-region-count-words"><\/span><\/span><\/span><span class="vb-region-fresh-slot"><span class="vb-region-fresh" hidden><span class="vb-region-fresh-n" aria-hidden="true"><\/span><span class="vb-region-fresh-words"><\/span><\/span><\/span><button type="button" class="vb-region-retired" hidden><svg class="vb-retired-icon"[^>]*>.*?<\/svg><span class="vb-retired-n"><\/span><span class="vb-retired-word"> retired<\/span><\/button><span class="vb-region-holders">/);
  assert.match(regionTemplate(region, { fixed: true }), /class="vb-region-retired" hidden/, 'Later too: a card can be retired from it');
});

// Field report batch 3 ruling 5 (widthsControl flag): Match card widths, a switch after the divider,
// before Comment; out of the tab order until the row makes it a stop; none without the flag, none in
// a fixed frame (the board sets Later's layout).
test('the mode row: Match card widths, a switch after the divider, only with the widths option and never in a fixed frame', () => {
  const html = regionTemplate(region, { widths: true });
  assert.match(html, /<span class="vb-mode-div" aria-hidden="true"><\/span><button type="button" class="vb-mseg vb-widths" role="switch" aria-checked="false" tabindex="-1" aria-label="Match card widths" data-region="review"><svg class="vb-mode-icon vb-widths-match"[^>]*>.*?<\/svg><svg class="vb-mode-icon vb-widths-own"[^>]*>.*?<\/svg><\/button><button type="button" class="vb-mseg vb-region-comment"/);
  assert.ok(!regionTemplate(region).includes('vb-widths'), 'no switch without the option');
  assert.ok(!regionTemplate(region, { widths: true, fixed: true }).includes('vb-widths'), 'no switch in a fixed frame');
});

test('a reply under the note block is a tab stop that opens the exchange, escaped, as Markdown (popovers-larger-thread ruling 2)', () => {
  const html = nblockRepliesMarkup([{ seq: 7, at: '2026-10-19T09:42:00Z', who: 'Agent reply · <b>', text: 'Yes, **price** order.' }]);
  assert.equal(html, '<div class="vb-nblock-reply" data-reply="7" tabindex="0"><span class="vb-nblock-who">Agent reply · &#60;b&#62;</span>'
    + '<div class="vb-nblock-reply-text"><p class="vb-md-p">Yes, <strong>price</strong> order.</p></div></div>');
});

// Container tool rail (toolRail flag, cortex-tasks/board/2026-10-25_board-ui_container-tool-rail.md,
// Design 1): the same tools group, unchanged in content, moves out of the top line into a rail after
// the header, so the line holds only the label; the note block and the empty message follow it.
test('with the rail option the tools group leaves the top line for a rail after the header, before the note block', () => {
  const html = regionTemplate(region, { rail: true, widths: true });
  assert.match(html, /^<header class="vb-region-head"><div class="vb-region-bar"><div class="vb-region-label">.*?<\/div><\/div><\/header><div class="vb-region-rail"><div class="vb-region-tools"><div class="vb-mode-row" role="radiogroup" aria-label="Layout for Review">/);
  assert.match(html, /<\/div><\/div><\/div><section class="vb-region-note-block"/, 'the rail ends before the note block');
  const head = html.slice(0, html.indexOf('</header>'));
  assert.doesNotMatch(head, /vb-region-tools|vb-mode-row|vb-cog/, 'no tool on the top line');
  // Same controls, same order: layouts, divider, widths, Comment, cog; then the popover, the preview and the menu.
  const order = [...html.matchAll(/data-mode="(\w+)"|class="vb-mode-div"|vb-widths"|vb-region-comment"|vb-cog"|class="vb-mode-pop"|class="vb-note-pop"|class="vb-region-menu"/g)].map((m) => m[1] ?? m[0]);
  assert.deepEqual(order, [...MODES, 'class="vb-mode-div"', 'vb-widths"', 'vb-region-comment"', 'vb-cog"', 'class="vb-mode-pop"', 'class="vb-note-pop"', 'class="vb-region-menu"']);
});

test('the rail holds exactly the markup the top line held without it', () => {
  const tools = (h: string) => h.slice(h.indexOf('<div class="vb-region-tools">'), h.indexOf('<section class="vb-region-note-block"'));
  const off = regionTemplate(region, { widths: true });
  const on = regionTemplate(region, { widths: true, rail: true });
  assert.equal(tools(on), `${tools(off).replace(/<\/div><\/header>$/, '')}</div>`);
});

test('a fixed frame with the rail: only the cog in its rail; no rail option, no rail', () => {
  const later = regionTemplate({ id: 'later', title: 'Later', mode: 'grid' }, { fixed: true, rail: true });
  assert.match(later, /<\/header><div class="vb-region-rail"><div class="vb-region-tools"><div class="vb-mode-row"><button type="button" class="vb-mseg vb-cog"/);
  assert.equal((later.match(/class="vb-mseg/g) ?? []).length, 1);
  assert.doesNotMatch(regionTemplate(region), /vb-region-rail/);
});
