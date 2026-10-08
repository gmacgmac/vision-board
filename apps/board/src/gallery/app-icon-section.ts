// Gallery entry for the app icon (navigation FE_05): the board's own AppIcon component at the
// toolbar's size and enlarged, in the page's theme (the gallery's theme button shows the other).
import { mount } from 'svelte';
import AppIcon from '../shell/AppIcon.svelte';
import { el, group } from './dom.ts';

function sample(size: number): HTMLElement {
  const host = el('div');
  mount(AppIcon, { target: host });
  const svg = host.querySelector('svg')!;
  svg.style.setProperty('width', `${size}px`);
  svg.style.setProperty('height', `${size}px`);
  return host;
}

const row = (...c: HTMLElement[]): HTMLElement => { const r = el('div', 'g-icons'); r.append(...c); return r; };

export function appIconSection(): HTMLElement {
  const box = el('section', 'g-section');
  box.setAttribute('aria-labelledby', 'feature-appIcon');
  const heading = el('h2', 'g-title', 'App icon');
  heading.id = 'feature-appIcon';
  const meta = el('p', 'g-meta');
  meta.append(el('code', undefined, 'AppIcon'), ' · colour token --vb-brand-mark · public/favicon.svg is the same drawing');
  box.append(heading,
    el('p', 'g-desc', 'One source box fanning out to three outputs, in currentColor. The toolbar and the browser tab show it; it does not move.'),
    meta,
    group('Sizes', 'Toolbar size (24px) and enlarged.', row(sample(24), sample(96))));
  return box;
}
