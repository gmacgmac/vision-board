// Link label markers (field report batch 3 ruling 3, linkLabels flag): where a link's label does
// not fit its line (`Route.labelAt.fits` false), a small marker sits on the line near the source,
// and hovering or focusing it floats the label above everything. The markers are buttons in their
// own layer of the world, outside the connectors' SVG (which is hidden from assistive tech): each
// is reachable by Tab after the cards, named with its link and label, and its tip follows the
// shared hover tip (packages/ui/src/tip/hover-tip.ts, WCAG 1.4.13: hoverable, persistent, Esc
// dismisses). The tip is decoration for the eye; the name carries the words. Only a marker whose
// place or words changed is written, as the connectors are (wires.ts).
import type { Route } from '../../../../packages/layout/src/index.ts';
import { bindHoverTip } from '../../../../packages/ui/src/index.ts';

export interface LinkMarks {
  /** One marker per route whose label did not fit, in route order. */
  draw(routes: readonly Route[]): void;
  clear(): void;
}

interface Mark { host: HTMLElement; look: string }

/** The marker's name: the link and its words. */
export const markName = (r: Route): string => `Link from ${r.from} to ${r.to}: ${r.label ?? ''}`;

/** The routes that take a marker. */
export const marked = (routes: readonly Route[]): Route[] => routes.filter((r) => r.label && r.labelAt && !r.labelAt.fits);

function create(): HTMLElement {
  const host = document.createElement('span');
  host.className = 'vb-link-mark';
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'vb-link-mark-btn';
  const tip = document.createElement('span');
  tip.className = 'vb-tip vb-link-tip';
  tip.setAttribute('aria-hidden', 'true');
  host.append(button, tip);
  bindHoverTip(host, { anchor: '.vb-link-mark-btn', tip: '.vb-link-tip', group: ':host', attr: 'data-tip-open' });
  return host;
}

export function createLinkMarks(layer: HTMLElement): LinkMarks {
  const marks = new Map<string, Mark>();
  return {
    draw(routes) {
      const want = marked(routes);
      const live = new Set(want.map((r) => `${r.from}>${r.to}`));
      for (const [key, m] of marks) {
        if (live.has(key)) continue;
        m.host.remove();
        marks.delete(key);
      }
      let prev: Element | null = null;
      for (const r of want) {
        const key = `${r.from}>${r.to}`;
        let m = marks.get(key);
        if (!m) marks.set(key, (m = { host: create(), look: '' }));
        const at = r.labelAt!;
        const look = `${at.x},${at.y}|${r.label}`;
        if (m.look !== look) {
          m.host.style.transform = `translate(${at.x}px, ${at.y}px)`;
          m.host.querySelector('button')!.setAttribute('aria-label', markName(r));
          m.host.querySelector('.vb-link-tip')!.textContent = r.label!;
          m.look = look;
        }
        const next: Element | null = prev ? prev.nextElementSibling : layer.firstElementChild;
        if (next !== m.host) layer.insertBefore(m.host, next);
        prev = m.host;
      }
      layer.hidden = marks.size === 0;
    },
    clear() {
      layer.replaceChildren();
      marks.clear();
      layer.hidden = true;
    },
  };
}
