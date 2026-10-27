// Gallery entry for <vb-app-frame> (D-047, app-cards FE_01): the frame alone, unloaded (idle, the
// placeholder at the least and the default panel size; loading, the same with "Loading…"), then an
// app card in every state of ruling 10, drawn from the fixture's app card through `nodeState` with
// list_apps answers in their exact shape (`AppInfo`), and the footer's app status in the states the
// page gives it (card-polish FE_01: loading, error, the menu open), and the window look at the least
// size with a cut name and its tip (card-polish FE_04). No frame loads here: a live panel
// needs the board's panel route and an app folder, which app-cards FE_02 adds from the gallery's own project.
import type { AppInfo, ViewNode } from '#format';
import { APP_SIZE } from '#format';
import type { AppCardInput, VbNodeElement } from '#ui';
import { nodeState } from '#ui';
import { cardList, el, group } from './dom.ts';
import type { Fixture } from './fixture.ts';
import { card } from './node-section.ts';
import invalidText from './gallery.apps.json?raw';

/** What list_apps says of the calculator with problems, word for word (app-samples.test.ts gets the
 * same answers from the server): its app.json broken, and once allowed, a tools.mjs that imports a
 * file. One answer never has both: the files are checked before anything runs. */
const INVALID = JSON.parse(invalidText) as Record<'files' | 'tools', AppInfo>;

/** What list_apps says of the example calculator, allowed at this version. */
const CALCULATOR: AppInfo = {
  id: 'calculator', state: 'ready', title: 'Calculator', version: '1.0.0', size: { w: 360, h: 440 },
  tools: ['evaluate', 'history'], hash: '3f1c9e0b7a2d4c6e8f0a1b3c5d7e9f1a2b4c6d8e0f1a3b5c7d9e1f2a4b6c8d0e', allowed: true,
};

/** Every state of ruling 10 that a list_apps answer (or a past version) gives, in the order a
 * person meets them. */
const STATES: [string, AppCardInput][] = [
  ['Loading', {}],
  ['Needs approval', { info: { ...CALCULATOR, allowed: false, state: 'needs-approval' } }],
  ['Code changed', { info: { ...CALCULATOR, allowed: false, state: 'needs-approval', changed: true } }],
  ['Ready, allowed: "Allowed ▾" in the footer', { info: CALCULATOR }],
  ['Ready, no tools: nothing in the footer', { info: { ...CALCULATOR, tools: [], allowed: false } }],
  ['Missing', { info: { id: 'calculator', state: 'missing', tools: [], allowed: false } }],
  ['Invalid, in app.json', { info: INVALID.files }],
  ['Invalid, in tools.mjs', { info: INVALID.tools }],
  ['Broken', { info: { ...CALCULATOR, state: 'broken' } }],
  ['Past version', { info: CALCULATOR, past: true }],
];

/** The fixture's app card at a panel size an agent might pick for a small app. */
function sampleCard(fx: Fixture): ViewNode {
  const n = fx.view.nodes.find((x) => x.kind === 'app')!;
  return { ...n, app: { id: n.app!.id, w: 300, h: 220 } };
}

/** An unloaded frame of app `calculator`; `loading` draws that state without making the frame. */
function frame(label: string, w: number, h: number, loading = false): HTMLElement {
  const f = document.createElement('vb-app-frame');
  Object.assign(f.dataset, { app: 'calculator', label, w: String(w), h: String(h) }, loading && { state: 'loading' });
  return f;
}

/** The plain card the appCards flag off draws (ruling 13), named as the board names it then. */
function offCard(n: ViewNode, fx: Fixture): VbNodeElement {
  const c = document.createElement('vb-node') as VbNodeElement;
  c.render(n, { appCards: false });
  c.update(nodeState(n, fx.state));
  return c;
}

/** The section sits first (patterns sort by name), so a height of a fraction of a pixel would move
 * every section under it off the pixel grid and change all their screenshots. Once it is in the page
 * (before the first paint), its height is rounded up to a whole pixel. The images section (it sorts
 * second) does the same, again whenever an image changes a card's height in it. */
export function wholePixels(body: HTMLElement): void {
  requestAnimationFrame(() => {
    const section = body.closest<HTMLElement>('section');
    if (section) section.style.minHeight = `${Math.ceil(section.getBoundingClientRect().height)}px`;
  });
}

/** The footer's app status as the page leaves it (app-cards.ts): Allow while its act is in flight,
 * Allow refused, and "Allowed ▾" with its menu open. */
function statusCards(n: ViewNode, fx: Fixture): VbNodeElement[] {
  const asking = { info: { ...CALCULATOR, allowed: false, state: 'needs-approval' as const } };
  const [busy, refused, open] = [asking, asking, { info: CALCULATOR }].map((app, i) => card({ ...n, id: `${n.id}-s${i}` }, fx, fx.state, { app }));
  for (const a of ['aria-busy', 'aria-disabled']) busy!.querySelector('[data-app-act="app-allow"]')!.setAttribute(a, 'true');
  refused!.querySelector('[data-app-act="app-allow"]')!.setAttribute('data-error', '');
  open!.querySelector('[data-app-menu]')!.setAttribute('aria-expanded', 'true');
  open!.querySelector<HTMLElement>('[role="menu"]')!.hidden = false;
  return [busy!, refused!, open!];
}

/** The window look (card-polish FE_04, the appTitle flag): the least panel size, its name cut in the
 * bar, with Allow and with "Allowed ▾", then a name too long for the bar with its tip open (as hover
 * or keyboard focus in the footer opens it), where list_apps knows no title, so the card's is the name. */
function windowCards(n: ViewNode, fx: Fixture): VbNodeElement[] {
  const small = { ...n, app: { id: 'calculator', w: APP_SIZE.w.min, h: APP_SIZE.h.min } };
  const long = { ...small, title: 'Quarterly budget planner for the design team' };
  const asking = { info: { ...CALCULATOR, allowed: false, state: 'needs-approval' as const } };
  const missing = { info: { id: 'calculator', state: 'missing' as const, tools: [], allowed: false } };
  const cards = [[small, asking], [small, { info: CALCULATOR }], [long, missing]] as const;
  const [a, b, tip] = cards.map(([c, app], i) => card({ ...c, id: `${n.id}-w${i}` }, fx, fx.state, { app }));
  tip!.setAttribute('data-name-tip-open', '');
  return [a!, b!, tip!];
}

export function appFrameSamples(body: HTMLElement, fx: Fixture): void {
  wholePixels(body);
  const n = sampleCard(fx);
  const frames = el('div', 'g-cards');
  frames.append(frame('Hello', APP_SIZE.w.min, APP_SIZE.h.min), frame('Calculator', APP_SIZE.w.default, APP_SIZE.h.default), frame('Calculator', 300, 220, true));
  body.append(
    group('The frame, before it loads', 'A light placeholder with the app\'s title, at the least panel size and the default one, then while the panel starts ("Loading…"). The page makes the frame the first time its card is on screen and near enough to use, then keeps it; off screen or zoomed far the panel is frozen (still running, inert, not painted) and this placeholder shows in its place.', frames),
    group('An app card in every state', `In order: ${STATES.map(([label]) => label.toLowerCase()).join('; ')}. The slot keeps the panel's size in every state and Allow sits in the footer, so the card never moves. Here no panel runs, so the states that show it show the placeholder.`,
      // One card per state, each with an id of its own, so the ids a card's markup holds stay unique on the page.
      cardList('App card states', ...STATES.map(([, app], i) => card({ ...n, id: `${n.id}-${i}` }, fx, fx.state, { app })))),
    group('The footer\'s app status', 'Allow while its act is in flight (loading), Allow refused (error, until the next press), and "Allowed ▾" with its one-item menu open over the panel. Hover, focus and pressed are the pop button\'s.',
      cardList('App status states', ...statusCards(n, fx))),
    group('The window look', 'With the appTitle flag (on): no title over the panel, the panel meets the top border, and the footer is the window\'s bar, holding the app\'s name between Allow or "Allowed ▾" and the quick actions, cut with "…" at the least panel size (280 wide). A cut name shows whole in its tip on hover, or while keyboard focus is in the footer.',
      cardList('App window look', ...windowCards(n, fx))),
    group('App cards off', 'With the appCards flag off, an app card is a plain card that says so.', cardList('App cards off', offCard(n, fx))),
  );
}
