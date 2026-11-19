// Gallery entry for the timeline on the board (D-105; the timeline set's FE_02), shown with the `timeline` flag as its
// pattern.json says: one container of a made-up launch plan, laid out for real by the board's own drawing (mini-board.ts:
// the layout, the line in the wires layer, the cards, the links): its dated cards on the line (a band behind two equal
// dates, the year turning, a link to an undated card) and its other cards in a row below; the same run down, the other
// cards to the line's right; in the default skin and in Command Lens.
import type { Direction, Skin, View, ViewNode } from '#format';
import { SKIN_DEFS } from '#ui';
import { el, group } from './dom.ts';
import type { Fixture } from './fixture.ts';
import { miniBoard } from './mini-board.ts';

/** Made-up launch-plan cards (no real names): six dated, two not. */
const NODES: Omit<ViewNode, 'id' | 'n' | 'region'>[] = [
  { kind: 'decision', title: 'Freeze the feature list', body: 'Offline drafts move to 2.1.', timeline: '2026-09-15' },
  { kind: 'topic', title: 'Private beta', body: '### Invites go out\n200 teams from the waitlist, in two waves.', timeline: '2026-10' },
  { kind: 'question', title: 'Which region goes first?', timeline: '2026-11-03' },
  { kind: 'action', title: 'Beta sign-off', body: '**Owner:** the product lead.', timeline: '2026-11-03' },
  { kind: 'finding', title: 'Load test passed', body: 'Ten times launch traffic for an hour.', timeline: '2026-11-12T09:30' },
  { kind: 'topic', title: '2.1: offline drafts', tone: 'teal', timeline: '2027' },
  { kind: 'action', title: 'Write the launch post' },
  { kind: 'risk', title: 'Support queue may double', body: 'Two more people on the rota for launch week.' },
];
/** Card 5 (dated) to card 8 (not), and 7 to 8 below the line. */
const LINKS = [[5, 8], [7, 8]];

/** The plan in container `plan`, as a row; ids carry `tag`, so each drawing's are its own. */
function plan(fx: Fixture, tag: string): { view: View; state: Fixture['layout']['state'] } {
  const id = (i: number) => `tl-${tag}-${i}`;
  const view: View = {
    format: 1, session: 'gallery-timeline', version: 1, title: 'Launch plan',
    regions: [{ id: `plan-${tag}`, title: 'Launch plan', mode: 'row' }],
    nodes: NODES.map((n, i) => ({ ...n, id: id(i + 1), n: 960 + i + 1, region: `plan-${tag}` })),
    links: LINKS.map(([a, b]) => ({ from: id(a!), to: id(b!) })),
  };
  return { view, state: fx.layout.state };
}

/** The plan drawn `direction` in `skin`; Command Lens inside a board root carrying the skin. */
function board(fx: Fixture, skin: Skin, direction: Direction): HTMLElement {
  const tag = `${skin === 'default' ? 'd' : 'cl'}-${direction}`;
  const mini = miniBoard(plan(fx, tag), `plan-${tag}`, {
    label: `A launch plan on its timeline, ${direction === 'down' ? 'run down' : 'across'}`, direction, edges: SKIN_DEFS[skin], widths: true,
  });
  if (skin === 'default') return mini;
  const root = el('div', 'vb-board g-skin');
  root.dataset.vbSkin = skin;
  root.append(mini);
  return root;
}

export function timelineBoardSection(fx: Fixture): HTMLElement {
  const box = el('section', 'g-section');
  box.dataset.feature = 'timeline-board';
  box.setAttribute('aria-labelledby', 'feature-timeline-board');
  const heading = el('h2', 'g-title', 'The timeline on the board');
  heading.id = 'feature-timeline-board';
  const meta = el('p', 'g-meta');
  meta.append(el('code', undefined, 'layoutRegion · RegionBox.timeline · wires.ts timelinesOf · datedView'), ' · D-105, D-106 · timeline flag');
  box.append(heading,
    el('p', 'g-desc', 'A container\'s dated cards share one line across its top, each on its own dot, in date order and not to scale; its other cards lay out below in the container\'s own layout, and links reach dated cards as any card. A dated card\'s place is its date: it never drags, and Move to still moves it to another container\'s line.'),
    meta,
    group('Across, default skin', 'Dots alternate above and below; a band behind the two cards of 3 November; the year at the start and where it turns; the other cards in a row below.',
      board(fx, 'default', 'across')),
    group('Down, default skin', 'Run down, the line runs down the middle of its column with the cards left and right, and the other cards sit to its right.',
      board(fx, 'default', 'down')),
    group('Across, Command Lens', 'The plate stays (number, kind, marks), the date heads the body.', board(fx, 'command-lens', 'across')),
    group('Down, Command Lens', null, board(fx, 'command-lens', 'down')));
  return box;
}
