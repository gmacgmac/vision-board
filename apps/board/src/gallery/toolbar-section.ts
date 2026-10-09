// Gallery entry for the toolbar's end group with its icons and "⋯" menu (toolbarMenu flag, toolbar
// icons and menu): the board's own ToolbarEnd, mounted in the page flow without the board's ids,
// wide (words), narrow (icons, as a window of 1500px or less draws it: the sample carries
// data-narrow itself) and narrow with the menu open. Shown only with the flag on, so
// ?flags=-toolbarMenu draws the gallery as it was.
import { mount } from 'svelte';
import ToolbarEnd from '../shell/ToolbarEnd.svelte';
import { flagOn } from '../../../../packages/format/src/index.ts';
import { pageFlags } from '../flags.ts';
import { el, group } from './dom.ts';
import type { Fixture } from './fixture.ts';

function sample(fx: Fixture, narrow: boolean, menuOpen = false): HTMLElement {
  const host = el('div', 'g-toolbar');
  host.toggleAttribute('data-narrow', narrow);
  host.toggleAttribute('data-menu-open', menuOpen);
  const none = () => undefined;
  mount(ToolbarEnd, {
    target: host,
    props: {
      theme: 'system', ontheme: none, oncommand: none, onhide: none,
      onsend: () => Promise.resolve(null), onrevoke: () => Promise.resolve(),
      holders: fx.boardAgents, chat: flagOn('chatPanel', pageFlags()), menu: true, placement: 'gallery', menuOpen,
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
    el('p', 'g-desc', 'The end of the toolbar: zoom, Agents with its holder count, Send to agent, Chat, then "⋯", a menu holding Theme, Hide decided and Reply. Nothing in the toolbar is cut off from a 768px window up.'),
    meta,
    group('Wide', 'A window wider than 1500px: the buttons show their words.', sample(fx, false)),
    group('Narrow', 'A window of 1500px or less: Agents, Send to agent and Chat show their icon (Agents with its count); the words stay for screen readers and the tooltip says them.', sample(fx, true)),
    group('Menu open', 'A click or Enter on "⋯": each row with its icon and key; Hide decided is a checkbox row. Esc, a click outside or a choice closes it.', sample(fx, true, true)));
  return box;
}
