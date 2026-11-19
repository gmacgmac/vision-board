// Timeline pattern, the element's half (D-105): colour each dot drawn by timeline-template.ts in place, from its
// `data-kind` and `data-tone`, the way a node colours itself (vb-node.ts, node-edges-apply.ts `applyTone`): through
// CSSOM, never a style attribute (the page's CSP refuses inline styles), from checked values only. Browser only.
import { isTone, NODE_TYPES } from '#format';
import { applyTone } from '../node/node-edges-apply.ts';

/** A tone as written on the dot: a palette name, or a hue in digits. */
const toneOf = (raw: string | undefined): unknown => (raw !== undefined && /^\d+(?:\.\d+)?$/.test(raw) ? Number(raw) : raw);

/** Give every dot under `root` its node's colour: `--vb-kind` for a kind the board knows, and its tone if it has one. */
export function applyTimelineLook(root: ParentNode): void {
  for (const dot of root.querySelectorAll<SVGElement>('.vb-timeline-dot')) {
    const kind = dot.dataset.kind;
    if (kind !== undefined && Object.hasOwn(NODE_TYPES, kind)) dot.style.setProperty('--vb-kind', `var(--vb-kind-${kind})`);
    else dot.style.removeProperty('--vb-kind');
    const tone = toneOf(dot.dataset.tone);
    applyTone(dot, isTone(tone) ? tone : undefined);
  }
}
