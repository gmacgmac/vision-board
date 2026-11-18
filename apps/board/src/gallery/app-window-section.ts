// Gallery entry for the app window (D-099 5; FE_08), shown with the appCards flag on: the fixture's app card drawn as a
// window by each skin's row (SKIN_DEFS)
// inside a board root that carries the skin, as on a board: every app state (APP_CARD_STATES, from list_apps answers in
// their exact shape, the app-frame section's), the moments the page sets on Allow (on its way, refused) and the menu
// open, bookmarked and selected, and the drawer open with the node's conversation in it (a note waiting for Send, the
// agent's reply, a note the panel raised). No panel runs here: the states that show it show the frame's placeholder.
import type { Skin, ViewNode } from '#format';
import type { AppCardInput, SkinDef, VbNodeElement, VbNoteBubbleElement } from '#ui';
import { bubbleView, conversation, loadConversation, nodeState, SKIN_DEFS } from '#ui';
import { pageMarkdown } from '../flags.ts';
import { cardList, el, group, ownIds } from './dom.ts';
import type { Fixture } from './fixture.ts';
import { CALCULATOR, sampleCard, STATES } from './app-frame-section.ts';

const ASKING: AppCardInput = { info: { ...CALCULATOR, allowed: false, state: 'needs-approval' } };

/** The app card as a window in skin row `def`, in state `app`, with an id of its own (`-<suffix>`). */
function windowCard(fx: Fixture, def: SkinDef, suffix: string, app: AppCardInput, f: { selected?: boolean; bookmarked?: boolean } = {}): VbNodeElement {
  const base = sampleCard(fx);
  const n: ViewNode = { ...base, id: `${base.id}-${suffix}` };
  const node = document.createElement('vb-node') as VbNodeElement;
  node.render(n, { ...ownIds(), markdown: pageMarkdown(), edges: def });
  const state = f.bookmarked ? { ...fx.state, bookmarks: new Set([n.id]) } : fx.state;
  node.update(nodeState(n, state, undefined, f.selected === true, { app }));
  return node;
}

/** Allow on its way and refused, as the page leaves them (app-cards.ts), and "Allowed ▾" with its menu open. */
function moments(fx: Fixture, def: SkinDef): VbNodeElement[] {
  const [busy, refused, menu] = [ASKING, ASKING, { info: CALCULATOR }].map((app, i) => windowCard(fx, def, `m${i}`, app));
  for (const a of ['aria-busy', 'aria-disabled']) busy!.querySelector('[data-app-act="app-allow"]')!.setAttribute(a, 'true');
  refused!.querySelector('[data-app-act="app-allow"]')!.setAttribute('data-error', '');
  menu!.querySelector('[data-app-menu]')!.setAttribute('aria-expanded', 'true');
  menu!.querySelector<HTMLElement>('[role="menu"]')!.hidden = false;
  return [busy!, refused!, menu!];
}

/** The drawer open, holding the node's conversation as the board docks it (notes/app-drawer.ts). */
function withDrawer(fx: Fixture, def: SkinDef): VbNodeElement {
  const node = windowCard(fx, def, 'd', { info: CALCULATOR, drawer: true });
  const n = sampleCard(fx);
  const at = '2026-11-17T21:04:00Z';
  const entries = conversation(
    [{ seq: 901, kind: 'comment', text: 'Why is CAM-3 above 2%?', at, sent: true, locked: true },
      { seq: 903, kind: 'comment', text: 'From mission control. SAT-1 at 0.4% loss. What should we do?', at }],
    [{ seq: 902, to: 901, text: 'Two bursts since 21:02; both cleared within 20 s.', at }]);
  void loadConversation().then(() => {
    const box = document.createElement('vb-note-bubble') as VbNoteBubbleElement;
    box.show(bubbleView({ mode: 'conversation', kind: 'comment', number: n.n, title: n.title, tabs: [], blocked: null, waiting: false, entries }), { kind: 'app', number: n.n! });
    node.querySelector('.vb-win-drawer-pane')!.append(box);
  });
  return node;
}

function skinPart(fx: Fixture, skin: Skin): HTMLElement {
  const def = SKIN_DEFS[skin];
  const root = el('div', 'vb-board g-skin');
  root.dataset.vbSkin = skin;
  root.append(
    group(`Every state (${skin})`, `In order: ${STATES.map(([label]) => label.toLowerCase()).join('; ')}. One title bar, the app under it; the bar keeps one size in every state.`,
      cardList(`App window states, ${skin}`, ...STATES.map(([, app], i) => windowCard(fx, def, `${skin}-${i}`, app)))),
    group(`Allow and its menu (${skin})`, 'Allow on its way (loading), Allow refused (until the next press), and "Allowed ▾" with Stop app open under the bar; then bookmarked and selected.',
      cardList(`App window moments, ${skin}`, ...moments(fx, def), windowCard(fx, def, `${skin}-b`, { info: CALCULATOR }, { bookmarked: true, selected: true }))),
    group(`The drawer open (${skin})`, 'The node\'s conversation docked on the right at the window\'s height: a sent note and the agent\'s reply, then a note the panel raised, waiting for Send. The node is wider by it; on the board its neighbours move aside.',
      cardList(`App window with its drawer, ${skin}`, withDrawer(fx, def))));
  return root;
}

export function appWindowSection(fx: Fixture): HTMLElement {
  const box = el('section', 'g-section');
  box.dataset.feature = 'app-window';
  box.setAttribute('aria-labelledby', 'feature-app-window');
  const heading = el('h2', 'g-title', 'The app window');
  heading.id = 'feature-app-window';
  const meta = el('p', 'g-meta');
  meta.append(el('code', undefined, '<vb-node> render(n, { edges }) · node-window.ts · notes/app-drawer.ts'), ' · with the appCards flag (D-099 5)');
  box.append(heading,
    el('p', 'g-desc', 'An app node is a window: a thin title bar with the number (Bookmark), the app\'s name, Allow or "Allowed ▾", the drawer with the notes count and Open; no footer, no Save for later. Everything under the bar is the app\'s.'),
    meta, skinPart(fx, 'default'), skinPart(fx, 'command-lens'));
  return box;
}
