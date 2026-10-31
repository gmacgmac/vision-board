// Gallery entry for the header by its own width (adaptiveHeader flag): the board's own Toolbar at its three
// forms, in frames as wide as the approved design's (1470, 735, 490), with a sample's facts and ids of its
// own: "⋯" and the zoom menu open, a long board name, the chips that come and go, a past version, and the
// path's parts and the menu's rows in every state. Shown only with the flag on (and versionView and
// toolbarMenu), so ?flags=-adaptiveHeader draws the gallery as it was. Names are examples.
import { mount } from 'svelte';
import Toolbar from '../shell/Toolbar.svelte';
import { shell } from '../shell/shell.svelte.ts';
import { FULL_MIN, HALF_MIN, type HeaderTier } from '../shell/header-tier.ts';
import { el, group } from './dom.ts';
import type { Fixture } from './fixture.ts';

const NAME = 'Where the atlas goes from here';
const LONG = 'Quarterly hiring plan for the platform and data teams across every region, with budgets and open questions';
const WIDTH: Record<HeaderTier, number> = { full: 1470, half: 735, third: 490 };
const CARDS = [{ n: 12, title: 'Which role first?' }, { n: 14, title: 'Who pays for it?' }];
const none = () => undefined;

type Facts = typeof shell;
const facts = (more: Partial<Facts> = {}): Facts => ({
  ...shell, title: NAME, boardId: 'atlas', boards: [{ board: 'atlas', title: NAME, seq: 37 }, { board: 'other', title: 'Another board', seq: 4 }] as Facts['boards'],
  version: 37, versions: [{ seq: 36, at: '2026-10-30T09:00:00.000Z' }] as Facts['versions'], versionView: true, chatPanel: true, agentAccess: true, zoom: 47,
  containers: [{ id: 'roles', title: 'Roles', count: 5, usable: true }, { id: 'budget', title: 'Budget', count: 9, usable: true }] as Facts['containers'],
  counts: { ...shell.counts, open: 14 }, openCards: CARDS as Facts['openCards'], freshCards: CARDS.slice(0, 1) as Facts['freshCards'],
  folder: { path: '/home/example/projects/atlas', name: '~/projects/atlas' } as Facts['folder'], ...more,
});

interface SampleOptions { facts?: Facts; menuOpen?: boolean; zoomOpen?: boolean; look?: 'hover' | 'focus' | 'pressed'; send?: 'disabled' }
function sample(fx: Fixture, form: HeaderTier, o: SampleOptions = {}): HTMLElement {
  const frame = el('div', 'g-header');
  frame.style.width = `${WIDTH[form]}px`;
  if (o.menuOpen || o.zoomOpen) frame.dataset.open = o.zoomOpen ? 'zoom' : form;
  mount(Toolbar, {
    target: frame,
    props: {
      onboard: none, onversion: () => Promise.resolve(), ongo: none, onopen: none, oncommand: none, onhide: none,
      onsend: () => Promise.resolve(null), onrevoke: () => Promise.resolve(), onflagged: none, onarchive: none, onlock: none,
      placement: 'gallery', form, facts: o.facts ?? facts(), holders: o.facts?.past ? null : fx.boardAgents,
      ...(o.menuOpen && { menuOpen: true }), ...(o.zoomOpen && { zoomOpen: true }), ...(o.look && { look: o.look }), ...(o.send && { send: o.send }),
    },
  });
  return frame;
}

/** Every form's chips that come and go, and the long name: the most the bar ever holds. */
const crowded = (more: Partial<Facts> = {}): Facts => facts({
  title: LONG, locked: true, flagged: 2, boardMarks: { other: 'new' }, counts: { ...shell.counts, open: 14, withAgent: 1 }, ...more,
});

export function headerSection(fx: Fixture): HTMLElement {
  const box = el('section', 'g-section');
  box.dataset.feature = 'adaptiveHeader';
  box.setAttribute('aria-labelledby', 'feature-adaptiveHeader');
  const heading = el('h2', 'g-title', 'The header by its own width');
  heading.id = 'feature-adaptiveHeader';
  const meta = el('p', 'g-meta');
  meta.append(el('code', undefined, 'Toolbar · header-tier · HeaderFields · ZoomMenu'), ' · feature flag adaptiveHeader, on by default · off with ?flags=-adaptiveHeader');
  box.append(heading,
    el('p', 'g-desc', 'One copy of each control, in the bar or as a row of "⋯". The form follows the bar\'s own width, so it holds beside a chat panel and in a host\'s pane. Nothing is ever cut off, down to a 400px bar.'),
    meta,
    group('Full', `${FULL_MIN}px and up: the path folder / board / version, Containers, the counts, the zoom group, Agents, Send to agent, Chat, "⋯".`, sample(fx, 'full')),
    group('Half', `From ${HALF_MIN}px: the folder as its icon, the board's name, the counts, the zoom as a small menu, Agents, Send and Chat as icons. No app icon.`, sample(fx, 'half')),
    group('A third', `Under ${HALF_MIN}px: the board's name, one compact count (a dot says there are new ones), Send, Chat and "⋯".`, sample(fx, 'third')),
    group('"⋯" at half', 'Version and Containers join the menu\'s rows; their native lists open over them.', sample(fx, 'half', { menuOpen: true })),
    group('"⋯" at a third', 'Everything else: folder, version, containers, the lists of open and new cards, the zoom row, Agents, and the board updated and flagged rows when there are any.', sample(fx, 'third', { menuOpen: true, facts: crowded() })),
    group('The zoom menu', 'Half width: − and + leave it open, Fit closes it.', sample(fx, 'half', { zoomOpen: true })),
    group('A long name, and every chip that comes and goes', 'The name is cut with "…", its whole text in the tooltip. Full and half bare the chips; a third keeps the padlock.', sample(fx, 'full', { facts: crowded() }), sample(fx, 'half', { facts: crowded() }), sample(fx, 'third', { facts: crowded() })),
    group('A past version', 'Read-only: no Agents and no Send; the path says which version shows.', sample(fx, 'full', { facts: facts({ past: { seq: 36, at: '2026-10-30T09:00:00.000Z' } as Facts['past'], versions: facts().versions }) })),
    group('Hover', null, sample(fx, 'full', { look: 'hover' })),
    group('Focus', null, sample(fx, 'full', { look: 'focus' })),
    group('Pressed', null, sample(fx, 'full', { look: 'pressed' })),
    group('Disabled', 'Nothing new to send: Send stays focusable, with its reason as its tooltip.', sample(fx, 'half', { send: 'disabled' })));
  return box;
}
