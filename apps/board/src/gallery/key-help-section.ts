// Gallery entry for the key commands bubble (keyBubble flag, navigation FE_04): the "?" button
// shut, and the list it opens, generated from the command table and the action registry. It is the
// board's own Svelte component, mounted in the page flow. Shown only with the flag on, so
// ?flags=-keyBubble draws the gallery as it was.
import { mount } from 'svelte';
import KeyHelp from '../shell/KeyHelp.svelte';
import { el, group } from './dom.ts';

function sample(open: boolean): HTMLElement {
  const host = el('div', 'g-keys');
  mount(KeyHelp, { target: host, props: { placement: 'gallery' } });
  host.querySelector('.vb-keys')!.toggleAttribute('data-keys-open', open);
  return host;
}

export function keyHelpSection(): HTMLElement {
  const box = el('section', 'g-section');
  box.dataset.feature = 'keyBubble';
  box.setAttribute('aria-labelledby', 'feature-keyBubble');
  const heading = el('h2', 'g-title', 'Key commands');
  heading.id = 'feature-keyBubble';
  const meta = el('p', 'g-meta');
  meta.append(el('code', undefined, 'KeyHelp'), ' · feature flag keyBubble, on by default · off with ?flags=-keyBubble');
  box.append(heading,
    el('p', 'g-desc', 'A small "?" at the board\'s bottom left. Hover or focus lists every command; the list is generated from the command table and the action registry, so a new command with a key appears in it.'),
    meta,
    group('Shut', 'The button alone, as the board shows it.', sample(false)),
    group('Open', 'Hover, focus or the ? key: the list stays while the pointer is on it, and Esc closes it.', sample(true)));
  return box;
}
