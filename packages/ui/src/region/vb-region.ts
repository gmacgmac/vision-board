// Region pattern, layer 3 (element): <vb-region>, in light DOM (components.md § The element).
// render() builds the frame's markup from the template once per view version; update() changes
// only attributes and text, so focus and transitions survive. Browser only: the class is created
// inside defineVbRegion(), so importing this file never touches HTMLElement (Node tests import
// the ui front door). It is only the frame: cards stay in their own layer (D-013), and the page
// measures and places it (transform, width, height). The mode row's keyboard, popover and
// settings menu are region-row.ts.
import type { Mode, Region } from '../../../format/src/index.ts';
import type { RegionState } from './region-core.ts';
import { regionColour } from './region-core.ts';
import type { ModeRow, RegionOpen } from './region-row.ts';
import { bindModeRow } from './region-row.ts';
import { holdersTemplate, regionIds, regionTemplate } from './region-template.ts';
import type { RegionFrameOptions } from './region-template.ts';

export const VB_REGION_TAG = 'vb-region';

/** What the page holds: a <vb-region> it renders once and updates in place. */
export interface VbRegionElement extends HTMLElement {
  /** Build from the template; sets data-region, role, aria-labelledby and `--region`; a fixed
   *  frame (`opts.fixed`, the built-in Later) also carries `data-fixed`. */
  render(r: Region, opts?: RegionFrameOptions): void;
  /** Apply the current state (from `regionState`) without rebuilding the markup. */
  update(st: RegionState): void;
  /** Open the layout popover (`mode` highlighted) or the settings menu; the gallery's samples. */
  showPanel(what: RegionOpen, opts?: { mode?: Mode; focus?: boolean }): void;
}

/** Defines `vb-region` once; a second call is a no-op. */
export function defineVbRegion(): void {
  if (customElements.get(VB_REGION_TAG)) return;

  class VbRegion extends HTMLElement implements VbRegionElement {
    /** The holders last drawn, so an unchanged list keeps its buttons (and their focus). */
    private holdersKey = '';
    private readonly row: ModeRow = bindModeRow(this);

    render(r: Region, opts: RegionFrameOptions = {}): void {
      this.row.close();
      this.dataset.region = r.id;
      this.toggleAttribute('data-fixed', opts.fixed === true);
      this.setAttribute('role', 'region');
      this.setAttribute('aria-labelledby', regionIds(r.id).heading);
      this.style.setProperty('--region', regionColour(r));
      this.innerHTML = regionTemplate(r, opts);
      this.holdersKey = '';
    }

    update(st: RegionState): void {
      this.dataset.mode = st.mode;
      for (const b of this.querySelectorAll<HTMLButtonElement>('button[data-mode]'))
        b.setAttribute('aria-checked', String(b.dataset.mode === st.mode));
      for (const t of this.querySelectorAll<HTMLElement>('.vb-mtile')) t.toggleAttribute('data-current', t.dataset.tile === st.mode);
      this.row.sync();
      this.piece('.vb-region-count').textContent = st.countText;
      const reset = this.piece('[data-reset]');
      reset.setAttribute('aria-disabled', String(!st.canReset));
      if (st.canReset) reset.removeAttribute('aria-describedby');
      else reset.setAttribute('aria-describedby', regionIds(this.dataset.region!).hint);
      this.piece('.vb-region-empty').hidden = !st.showEmpty;
      const key = JSON.stringify(st.holders ?? []);
      if (key !== this.holdersKey) {
        this.holdersKey = key;
        this.piece('.vb-region-holders').innerHTML = holdersTemplate(st.holders ?? []);
      }
    }

    showPanel(what: RegionOpen, opts?: { mode?: Mode; focus?: boolean }): void {
      this.row.open(what, opts);
    }

    private piece(selector: string): HTMLElement {
      return this.querySelector<HTMLElement>(selector)!;
    }
  }

  customElements.define(VB_REGION_TAG, VbRegion);
}
