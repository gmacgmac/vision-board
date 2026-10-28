// Gallery entry for app cards on the page (appCards flag, D-047, app-cards FE_02): an app card with
// its panel running. The panel is the example calculator, served by this board's own panel route
// from the served project's `.visionboard/apps/calculator/` (the page tests copy it there from the
// skill folder, its one source). As on the board, the card's state is list_apps' answer and the
// panel's tool calls go to call_app_tool, both through the page's I/O layer (shell/page-io.ts), and a theme
// change reaches the panel. Allow is the board's to do: here the card asks for it, and the panel
// says it needs it when = is pressed. Every other state, from list_apps answers in their exact
// shape, is in the app-frame pattern's section. Shown only with the flag on, so ?flags=-appCards
// draws the gallery as it was. The fit section (`appFitSection`, the appFit flag) runs the same
// calculator in a card the agent drew 600px tall: the panel tells its 440 and the card fits it; with
// ?flags=-appFit it keeps the 600.
import type { AppInfo, AppRef, ViewNode } from '#format';
import { flagOn } from '#format';
import type { VbAppFrameElement, VbNodeElement } from '#ui';
import { appView, nodeState } from '#ui';
import { watchTheme } from '../board/apps/index.ts';
import { pageIo } from '../shell/page-io.ts';
import { pageFlags } from '../flags.ts';
import { cardList, el, group } from './dom.ts';
import type { Fixture } from './fixture.ts';
import { card } from './node-section.ts';

/** The example's id and its own panel size (its app.json). */
const APP = { id: 'calculator', w: 360, h: 440 };

/** The fixture's app card, for the example at size `app`, with an id of its own (`-<suffix>`) on the page. */
function liveCard(fx: Fixture, suffix: string, app: AppRef): ViewNode {
  const n = fx.view.nodes.find((x) => x.kind === 'app')!;
  return { ...n, id: `${n.id}-${suffix}`, title: 'Calculator', app };
}

/** list_apps' answer for the example; "not found" when the served project has no such folder. */
async function exampleInfo(): Promise<AppInfo> {
  const found = (await pageIo.listApps()).apps.find((a) => a.id === APP.id);
  return found ?? { id: APP.id, state: 'missing', tools: [], allowed: false };
}

/** Once list_apps answers: the card's state, then its panel, wired as the board wires it. */
async function run(node: VbNodeElement, n: ViewNode, fx: Fixture): Promise<void> {
  const app = { info: await exampleInfo() };
  node.update(nodeState(n, fx.state, undefined, false, { app }));
  const frame = node.querySelector<VbAppFrameElement>('vb-app-frame');
  if (!frame || !appView(n, app).frame) return;
  frame.wire({ fit: flagOn('appFit', pageFlags()), callTool: (name, args) => pageIo.callAppTool(APP.id, name, args) });
  frame.load();
  watchTheme(() => frame.lookChanged());
}

export function appSection(fx: Fixture): HTMLElement {
  const box = el('section', 'g-section');
  box.dataset.feature = 'appCards';
  box.setAttribute('aria-labelledby', 'feature-appCards');
  const heading = el('h2', 'g-title', 'App cards on the board');
  heading.id = 'feature-appCards';
  const meta = el('p', 'g-meta');
  meta.append(el('code', undefined, 'app-cards.ts · app-state.ts · page-io.ts listApps, callAppTool'), ' · feature flag appCards, on by default · off with ?flags=-appCards');
  const n = liveCard(fx, 'live', APP);
  // "Loading…" until list_apps answers.
  const node = card(n, fx, fx.state, { app: {} });
  void run(node, n, fx);
  box.append(heading,
    el('p', 'g-desc', 'An app the agent built, running in its card: its panel in a sandboxed frame, its tools on the board\'s server once the person allows them. The board loads the panel only while the card is on screen and zoomed in enough to use; Esc in the panel goes back to the card.'),
    meta,
    group('A live panel', 'The example calculator, served by this board. Nobody has allowed it here, so the card asks, and = says to press Allow.', cardList('An app card with its panel running', node)));
  return box;
}

/** The appFit flag's entry: the calculator in a card the agent drew 600px tall. Its panel tells its
 * content's height, 440, and the card fits it; with ?flags=-appFit the card keeps the 600. */
export function appFitSection(fx: Fixture): HTMLElement {
  const box = el('section', 'g-section');
  box.dataset.feature = 'appFit';
  box.setAttribute('aria-labelledby', 'feature-appFit');
  const heading = el('h2', 'g-title', 'An app card fits its content');
  heading.id = 'feature-appFit';
  const meta = el('p', 'g-meta');
  meta.append(el('code', undefined, 'app-frame-size.ts panelHeight · vb-app-frame.ts · card-images.ts'), ' · feature flag appFit, on by default · off with ?flags=-appFit');
  const n = liveCard(fx, 'fit', { ...APP, h: 600 });
  const node = card(n, fx, fx.state, { app: {} });
  void run(node, n, fx);
  box.append(heading,
    el('p', 'g-desc', 'A panel tells the board its content\'s height (size-changed), and its card fits it, from 120 to 1080 px, at the width the agent drew. Until it tells one, and with the flag off, the card is the size the agent drew.'),
    meta,
    group('A panel that fits its content', 'The agent drew this card 600 px tall; the calculator says its content is 440, so the card is 440.', cardList('An app card fitting its panel', node)));
  return box;
}
