// Gallery entry for the toolbar's end group with its icons and "⋯" menu (toolbarMenu flag, toolbar
// icons and menu): the board's own ToolbarEnd, mounted in the page flow without the board's ids,
// wide (words), narrow (icons, as a window of 1500px or less draws it: the sample carries
// data-narrow itself) and narrow with the menu open; with the openList flag, the "N open" chip's
// samples (open-list-section.ts). Shown only with the flag on, so ?flags=-toolbarMenu draws the
// gallery as it was.
import { mount } from 'svelte';
import ToolbarEnd from '../shell/ToolbarEnd.svelte';
import { flagOn } from '#format';
import { pageFlags } from '../flags.ts';
import { el, group } from './dom.ts';
import type { Fixture } from './fixture.ts';
import { openListGroups } from './open-list-section.ts';

function sample(fx: Fixture, narrow: boolean, zoom: number, menuOpen = false): HTMLElement {
  const host = el('div', 'g-toolbar');
  host.toggleAttribute('data-narrow', narrow);
  host.toggleAttribute('data-menu-open', menuOpen);
  const none = () => undefined;
  mount(ToolbarEnd, {
    target: host,
    props: {
      theme: 'system', ontheme: none, oncommand: none, onhide: none,
      onsend: () => Promise.resolve(null), onrevoke: () => Promise.resolve(),
      holders: fx.boardAgents, chat: flagOn('chatPanel', pageFlags()), menu: true, zoom, placement: 'gallery', menuOpen,
    },
  });
  return host;
}

export function toolbarSection(fx: Fixture): HTMLElement {
  const box = el('section', 'g-section');
  box.dataset.feature = 'toolbarMenu';
  box.setAttribute('aria-labelledby', 'feature-toolbarMenu');
  const heading = el('h2', 'g-title', 'Toolbar icons and menu');
  heading.id = 'feature-toolbarMenu';
  const meta = el('p', 'g-meta');
  meta.append(el('code', undefined, 'ToolbarEnd · ToolbarMenu'), ' · feature flag toolbarMenu, on by default · off with ?flags=-toolbarMenu');
  box.append(heading,
    el('p', 'g-desc', 'The end of the toolbar: zoom, Agents with its holder count, Send to agent, Chat, then "⋯", a menu holding Theme, Hide answered and Reply. Nothing in the toolbar is cut off from a 768px window up.'),
    meta,
    group('Wide', 'A window wider than 1500px: the buttons show their words.', sample(fx, false, 100)),
    group('Narrow', 'A window of 1500px or less: Agents, Send to agent and Chat show their icon (Agents with its count); the words stay for screen readers and the tooltip says them.', sample(fx, true, 75)),
    group('Menu open', 'A click or Enter on "⋯": each row with its icon and key; Hide answered is a checkbox row, and so is Centre cards with the alignSetting flag; with the openFolder flag, Open folder… ends it. Esc, a click outside or a choice closes it.', sample(fx, true, 250, true)),
    ...(flagOn('openList', pageFlags()) ? [openListGroups(fx)] : []));
  return box;
}
