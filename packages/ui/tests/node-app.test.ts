// App cards in the node pattern (D-047; app-cards ruling 10): every state's view (node-app.ts
// `appView`), what the card's name adds, and the markup the template draws for each.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { AppInfo, ViewNode } from '../../format/src/index.ts';
import { APP_SIZE } from '../../format/src/index.ts';
import type { BoardState } from '../../actions/src/index.ts';
import type { AppCardState } from '../src/index.ts';
import { APP_CARD_STATES, appStateMarkup, appView, KIND_ICON, nodeState, nodeTemplate } from '../src/index.ts';

const card = (f: Partial<ViewNode> = {}): ViewNode =>
  ({ id: '7', n: 4, region: 'r', kind: 'app', title: 'Price calculator', app: { id: 'calculator', w: 360, h: 440 }, ...f });

const info = (f: Partial<AppInfo> = {}): AppInfo =>
  ({ id: 'calculator', state: 'ready', title: 'Calculator', version: '1.0.0', tools: ['evaluate', 'history'], hash: 'a'.repeat(64), allowed: true, ...f });

const board = (): BoardState =>
  ({ items: new Map(), pins: new Map(), modes: new Map(), widths: new Map(), sizes: new Map(), moves: new Map(), regionPins: new Map(), regionNotes: new Map(), flags: new Set() } as unknown as BoardState);

test('checking: until list_apps answers, "Loading…" in place of the panel, no frame', () => {
  const v = appView(card());
  assert.deepEqual([v.state, v.frame, v.text, v.words, v.name], ['checking', false, 'Loading…', ', loading', 'Price calculator']);
  assert.deepEqual(v.size, { w: 360, h: 440 });
  assert.equal(v.stop, false);
});

test('missing: "App <id> not found" (ruling 10), no frame', () => {
  const v = appView(card(), { info: info({ state: 'missing', title: undefined, tools: [], allowed: false }) });
  assert.deepEqual([v.state, v.head, v.frame, v.words], ['missing', 'App calculator not found', false, ', app not found']);
  assert.equal(v.name, 'Price calculator', 'no manifest, so the card\'s title');
});

test('invalid: the problems for the agent to fix, and Check again', () => {
  const v = appView(card(), {
    info: info({ state: 'invalid', allowed: false, problems: [{ file: 'app.json', pointer: '/size/w', detail: 'must be <= 960' }, { file: 'tools.mjs', detail: 'does not load' }] }),
  });
  assert.equal(v.state, 'invalid');
  assert.deepEqual(v.problems, ['app.json /size/w: must be <= 960', 'tools.mjs: does not load']);
  assert.deepEqual([v.retry, v.names.retry, v.frame], ['Check again', 'Check again: Calculator', false]);
});

test('needs approval: the panel shows, and the card asks for Allow', () => {
  const v = appView(card(), { info: info({ state: 'needs-approval', allowed: false }) });
  assert.deepEqual([v.state, v.frame, v.ask, v.stop, v.head], ['needs-approval', true, 'Allow this app to run?', false, undefined]);
  assert.equal(v.names.allow, 'Allow app: Calculator');
  assert.equal(v.words, ', not allowed yet');
});

test('code changed: the panel shows, and the card says the code changed and asks again', () => {
  const v = appView(card(), { info: info({ state: 'needs-approval', allowed: false, changed: true }) });
  assert.deepEqual([v.state, v.frame], ['changed', true]);
  assert.equal(v.ask, 'Code changed. Allow it again?');
  assert.match(v.words, /code changed/);
});

test('ready: the panel only; Stop app once the person allowed it (tools named or not yet), never on a panel-only app', () => {
  const v = appView(card(), { info: info() });
  assert.deepEqual([v.state, v.frame, v.ask, v.words, v.stop], ['ready', true, undefined, '', true]);
  assert.equal(v.names.stop, 'Stop app: Calculator');
  assert.equal(appView(card(), { info: info({ tools: [] }) }).stop, true, 'allowed, before the first call names the tools');
  assert.equal(appView(card(), { info: info({ tools: [], allowed: false }) }).stop, false);
});

test('broken: it stopped, and Restart', () => {
  const v = appView(card(), { info: info({ state: 'broken' }) });
  assert.deepEqual([v.state, v.frame, v.head, v.retry, v.stop], ['broken', false, 'This app stopped', 'Restart', false]);
});

test('past version: a placeholder with the app\'s title, whatever list_apps says', () => {
  for (const state of ['ready', 'needs-approval', 'broken'] as const) {
    const v = appView(card(), { info: info({ state }), past: true });
    assert.deepEqual([v.state, v.frame, v.head, v.ask, v.stop], ['past', false, 'Calculator', undefined, false], state);
  }
});

test('the panel\'s size: the agent\'s, else the manifest\'s, else the default, held to APP_SIZE', () => {
  assert.deepEqual(appView(card({ app: { id: 'calculator' } }), { info: info({ size: { w: 400, h: 300 } }) }).size, { w: 400, h: 300 });
  assert.deepEqual(appView(card({ app: { id: 'calculator' } })).size, { w: APP_SIZE.w.default, h: APP_SIZE.h.default });
  assert.deepEqual(appView(card({ app: { id: 'calculator', w: 5000, h: 1 } })).size, { w: APP_SIZE.w.max, h: APP_SIZE.h.min });
});

test('APP_CARD_STATES lists every state appView draws', () => {
  const seen = new Set<AppCardState>([
    appView(card()).state, appView(card(), { past: true }).state, appView(card(), { info: info({ state: 'needs-approval', changed: true }) }).state,
    ...(['missing', 'invalid', 'needs-approval', 'ready', 'broken'] as const).map((state) => appView(card(), { info: info({ state }) }).state),
  ]);
  assert.deepEqual([...seen].sort(), [...APP_CARD_STATES].sort());
});

test('nodeState: an app card carries its view, adds its words to the name, shows no status word and no size', () => {
  const st = nodeState(card(), board(), 'm', false, { app: { info: info({ state: 'needs-approval', allowed: false }) } });
  assert.equal(st.app?.state, 'needs-approval');
  assert.equal(st.label, 'Item 4, App: Price calculator, not allowed yet');
  assert.deepEqual([st.statusWord, st.size], ['', undefined]);
  assert.equal(nodeState(card({ kind: 'finding' }), board(), undefined, false, { app: {} }).app, undefined);
  assert.equal(nodeState(card(), board(), undefined, false, { app: {} }).label, 'Item 4, App: Price calculator, loading');
  // No app given (the appCards flag off, or a page that draws no state): no view, a plain name.
  assert.deepEqual([nodeState(card(), board()).app, nodeState(card(), board()).label], [undefined, 'Item 4, App: Price calculator']);
});

test('nodeTemplate: an app card draws its slot in place of the Markdown body, with the frame at the panel\'s size', () => {
  const html = nodeTemplate(card({ body: 'Work out a **price**.' }));
  assert.doesNotMatch(html, /vb-node-body|<strong>/);
  assert.match(html, /<h3 class="vb-node-title">Price calculator<\/h3><div class="vb-app-ask" hidden><p class="vb-app-ask-text" id="vb-app-ask-7"><\/p>/);
  assert.match(html, /<button type="button" class="vb-pop-btn vb-pop-primary" data-app-act="app-allow" aria-describedby="vb-app-ask-7">Allow<\/button><\/div>/);
  assert.match(html, /<div class="vb-app" data-app-state="checking" aria-busy="true"><vb-app-frame data-app="calculator" data-label="Price calculator" data-w="360" data-h="440"><\/vb-app-frame>/);
  assert.ok(html.includes(`<div class="vb-app-state">${appStateMarkup(appView(card()))}</div>`), 'drawn as checking until update()');
  assert.match(html, /data-app-act="app-revoke" hidden>Stop app<\/button><div class="vb-node-actions"/);
  assert.doesNotMatch(html, /style=|<style/);
});

test('nodeTemplate: an app card never takes the size control, and escapes what the agent wrote', () => {
  const html = nodeTemplate(card({ title: '"><b>x', app: { id: 'calculator' } }), { sizeControl: true });
  assert.doesNotMatch(html, /vb-size/);
  assert.doesNotMatch(html, /<b>/);
  assert.match(html, /data-label="&#34;&#62;&#60;b&#62;x"/);
});

test('nodeTemplate with the appCards flag off: a plain card saying so, no slot, no Stop app (ruling 13)', () => {
  const html = nodeTemplate(card(), { appCards: false });
  assert.match(html, /<div class="vb-node-body"><p class="vb-md-p">App cards are off\.<\/p><\/div>/);
  assert.doesNotMatch(html, /vb-app|data-app-act/);
});

test('appStateMarkup: nothing while the panel shows; otherwise icon, words, problems and button, all escaped', () => {
  for (const state of ['needs-approval', 'ready'] as const) assert.equal(appStateMarkup(appView(card(), { info: info({ state }) })), '');
  const missing = appStateMarkup(appView(card({ app: { id: 'calculator' } }), { info: info({ state: 'missing' }) }));
  assert.ok(missing.includes(KIND_ICON.app));
  assert.match(missing, /<p class="vb-app-head">App calculator not found<\/p><p class="vb-app-text">Ask the agent to add it\.<\/p>$/);
  const invalid = appStateMarkup(appView(card(), { info: info({ state: 'invalid', title: '<i>', problems: [{ file: 'app.json', detail: 'bad <script>' }] }) }));
  assert.ok(invalid.includes(KIND_ICON.risk), 'the warning icon');
  assert.match(invalid, /<ul class="vb-app-problems" tabindex="0" aria-label="Problems"><li>app\.json: bad &#60;script&#62;<\/li><\/ul>/);
  assert.match(invalid, /<button type="button" class="vb-pop-btn" data-app-act="retry" aria-label="Check again: &#60;i&#62;">Check again<\/button>$/);
  const broken = appStateMarkup(appView(card(), { info: info({ state: 'broken' }) }));
  assert.match(broken, /data-app-act="retry" aria-label="Restart: Calculator">Restart<\/button>$/);
  assert.match(appStateMarkup(appView(card())), /<p class="vb-app-text">Loading…<\/p>$/);
  assert.match(appStateMarkup(appView(card(), { past: true })), /<p class="vb-app-head">Price calculator<\/p><p class="vb-app-text">Apps don&#39;t run in past versions\.<\/p>$/);
});
