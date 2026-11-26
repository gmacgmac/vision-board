// Gallery entry for letting agents from other folders in (otherFolders flag, D-120, api.md 215): the "⋯" menu's
// "Let agents from other folders in", a checkbox, unticked (the default) and ticked. Shown only with the flag on and a
// page that opens folders (the standalone board's), so ?flags=-otherFolders draws the gallery as it was.
import { mount } from 'svelte';
import { ToolbarMenu } from '../board/chrome/index.ts';
import { chromeSample } from './chrome-sample.ts';
import { el, group } from './dom.ts';

const none = () => undefined;

/** The "⋯" menu, open, without the board's ids, with the row ticked or not. */
function menu(otherFolders: boolean): HTMLElement {
  const host = el('div', 'g-toolbar g-archive-menu');
  host.toggleAttribute('data-menu-open', true);
  mount(ToolbarMenu, { target: host, context: chromeSample({}, { otherFolders }), props: { onhide: none, onfolders: none, open: true, placement: 'gallery' } });
  return host;
}

export function otherFoldersSection(): HTMLElement {
  const box = el('section', 'g-section');
  box.dataset.feature = 'otherFolders';
  box.setAttribute('aria-labelledby', 'feature-otherFolders');
  const heading = el('h2', 'g-title', 'Agents from other folders');
  heading.id = 'feature-otherFolders';
  const meta = el('p', 'g-meta');
  meta.append(el('code', undefined, 'folders-allow · folders-revoke'), ' · feature flag otherFolders, on by default · off with ?flags=-otherFolders');
  box.append(heading,
    el('p', 'g-desc', 'The person lets agents working in another folder call this ledger\'s boards. It is recorded in the ledger, so it holds after a restart and belongs to that ledger. Every other guard stays: an agent still asks for the grant before it writes, and a secret from another ledger of this folder is still refused.'),
    meta,
    group('Off', 'The default: an agent whose folder is not this one is refused. Off while no board is open, a past version shows, or the ledger is read-only.', menu(false)),
    group('On', 'Ticked: agents from other folders may join and call the boards; a press turns it off again.', menu(true)));
  return box;
}
