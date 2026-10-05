// Region pattern, layer 3 (element): <vb-region>, in light DOM (components.md § The element).
// render() builds the frame's markup from the template once per view version; update() changes
// only attributes and text, so focus and transitions survive. Browser only: the class is created
// inside defineVbRegion(), so importing this file never touches HTMLElement (Node tests import
// the ui front door). It is only the frame: cards stay in their own layer (D-013), and the page
// measures and places it (transform, width, height).
import type { Region } from '../../../format/src/index.ts';
import type { RegionState } from './region-core.ts';
import { regionColour } from './region-core.ts';
import { holdersTemplate, regionTemplate } from './region-template.ts';

export const VB_REGION_TAG = 'vb-region';

/** What the page holds: a <vb-region> it renders once and updates in place. */
export interface VbRegionElement extends HTMLElement {
  /** Build from the template; sets data-region, role, aria-labelledby and `--region`. */
  render(r: Region): void;
  /** Apply the current state (from `regionState`) without rebuilding the markup. */
  update(st: RegionState): void;
}

/** Defines `vb-region` once; a second call is a no-op. */
export function defineVbRegion(): void {
  if (customElements.get(VB_REGION_TAG)) return;

  class VbRegion extends HTMLElement implements VbRegionElement {
    /** The holders last drawn, so an unchanged list keeps its buttons (and their focus). */
    private holdersKey = '';

    render(r: Region): void {
      this.dataset.region = r.id;
      this.setAttribute('role', 'region');
      this.setAttribute('aria-labelledby', `region-${r.id}`);
      this.style.setProperty('--region', regionColour(r));
      this.innerHTML = regionTemplate(r);
      this.holdersKey = '';
    }

    update(st: RegionState): void {
      this.dataset.mode = st.mode;
      for (const b of this.querySelectorAll<HTMLButtonElement>('button[data-mode]'))
        b.setAttribute('aria-pressed', String(b.dataset.mode === st.mode));
      this.piece('.vb-region-count').textContent = st.countText;
      this.piece('[data-reset]').hidden = !st.showReset;
      this.piece('.vb-region-empty').hidden = !st.showEmpty;
      const key = JSON.stringify(st.holders ?? []);
      if (key !== this.holdersKey) {
        this.holdersKey = key;
        this.piece('.vb-region-holders').innerHTML = holdersTemplate(st.holders ?? []);
      }
    }

    private piece(selector: string): HTMLElement {
      return this.querySelector<HTMLElement>(selector)!;
    }
  }

  customElements.define(VB_REGION_TAG, VbRegion);
}
