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
  /** Mark the container's note bubble open or closed: the pin's aria-expanded and
   *  `data-note-open` on the frame (3_FE_04 ruling 3). The page calls it as it opens or closes
   *  the bubble. */
  setNoteOpen(open: boolean): void;
  /** The title line, whose box the page measures and passes through `titleAnchor` to place the
   *  container's note bubble. */
  titleLine(): HTMLElement;
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
      this.setNoteOpen(this.hasAttribute('data-note-open'));
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
      const back = this.piece('[data-put-back]');
      back.setAttribute('aria-disabled', String(!st.canPutBack));
      if (st.canPutBack) back.removeAttribute('aria-describedby');
      else back.setAttribute('aria-describedby', regionIds(this.dataset.region!).back);
      this.applyNote(st.note);
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

    setNoteOpen(open: boolean): void {
      this.toggleAttribute('data-note-open', open);
      this.querySelector('.vb-region-note-pin')?.setAttribute('aria-expanded', String(open));
    }

    titleLine(): HTMLElement {
      return this.piece('.vb-region-head');
    }

    /** The pin and the "Your note" line; a fixed frame (Later) has neither. */
    private applyNote(note: RegionState['note']): void {
      const pin = this.querySelector<HTMLButtonElement>('.vb-region-note-pin');
      const line = this.querySelector<HTMLElement>('p.vb-region-note');
      if (!pin || !line) return;
      pin.hidden = line.hidden = !note;
      this.toggleAttribute('data-note-sent', note?.sent === true);
      // As a card's pin (vb-node): `data-sent` on the pin itself.
      pin.toggleAttribute('data-sent', note?.sent === true);
      if (!note) {
        pin.removeAttribute('aria-label');
        pin.textContent = '';
        return;
      }
      pin.setAttribute('aria-label', note.label);
      pin.textContent = String(note.index);
      this.piece('.vb-region-note-who').textContent = note.who;
      this.piece('.vb-region-note-text').textContent = note.text;
    }

    private piece(selector: string): HTMLElement {
      return this.querySelector<HTMLElement>(selector)!;
    }
  }

  customElements.define(VB_REGION_TAG, VbRegion);
}
