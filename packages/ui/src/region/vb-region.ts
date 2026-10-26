// Region pattern, layer 3 (element): <vb-region>, in light DOM (components.md § The element).
// render() builds the frame's markup from the template once per view version; update() changes
// only attributes and text, so focus and transitions survive. Browser only: the class is created
// inside defineVbRegion(), so importing this file never touches HTMLElement (Node tests import
// the ui front door). It is only the frame: cards stay in their own layer (D-013), and the page
// measures and places it (transform, width, height). The mode row's keyboard, popover and
// settings menu are region-row.ts.
import type { Mode, Region } from '../../../format/src/index.ts';
import type { RegionState } from './region-core.ts';
import { regionColour, widthsTip } from './region-core.ts';
import type { ModeRow, RegionOpen } from './region-row.ts';
import { bindModeRow } from './region-row.ts';
import type { NoteParts } from './region-note.ts';
import { bindNoteParts } from './region-note.ts';
import { bindTitleTip } from './region-title.ts';
import { holdersTemplate, regionIds, regionTemplate } from './region-template.ts';
import type { RegionFrameOptions } from './region-template.ts';
import { pauseControls } from '../paused/paused.ts';

/** The controls a locked board pauses on a frame (N40 ruling 4), but Reset places and Put container
 * back, whose aria-disabled `update` sets itself. The cog still opens its menu; Remove container
 * (N24 ruling 4) pauses with the rest. */
const PAUSED = 'button[data-mode], button.vb-mtile, .vb-widths, .vb-region-grip, .vb-region-comment, .vb-note-btn[data-note-act="edit"], .vb-note-btn[data-note-act="remove"], button.vb-holder[data-revoke], button[data-remove-region]';

export const VB_REGION_TAG = 'vb-region';

/** What the page holds: a <vb-region> it renders once and updates in place. */
export interface VbRegionElement extends HTMLElement {
  /** Build from the template; sets data-region, role, aria-labelledby and `--region`; a fixed
   *  frame (`opts.fixed`, the built-in Later) also carries `data-fixed`, and a frame with its tools
   *  in the rail (`opts.rail`, toolRail flag) `data-rail`. */
  render(r: Region, opts?: RegionFrameOptions): void;
  /** Apply the current state (from `regionState`) without rebuilding the markup. */
  update(st: RegionState): void;
  /** Open the layout popover (`mode` highlighted) or the settings menu; the gallery's samples. */
  showPanel(what: RegionOpen, opts?: { mode?: Mode; focus?: boolean }): void;
  /** Mark the container's note bubble open or closed: `data-note-open` on the frame (3_FE_04
   *  ruling 3), and opening closes the note preview. The page calls it as it opens or closes the
   *  bubble. */
  setNoteOpen(open: boolean): void;
  /** Whether the note block shows under the title line (step 4G ruling 3); reflects
   *  `data-note-shown`. Page state only (not in the ledger). Setting it re-measures the block
   *  and fires `vb-region-note-resize` when its height changed. */
  noteShown: boolean;
  /** The note block's height in the frame's own pixels with its gap to the cards; 0 while it is
   *  hidden or the container has no note. The same number `vb-region-note-resize` carries. */
  noteHeight(): number;
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
    private readonly note: NoteParts = bindNoteParts(this);
    private readonly titleTip = bindTitleTip(this);

    render(r: Region, opts: RegionFrameOptions = {}): void {
      this.row.close();
      this.titleTip.close();
      this.dataset.region = r.id;
      this.toggleAttribute('data-fixed', opts.fixed === true);
      this.toggleAttribute('data-rail', opts.rail === true);
      this.setAttribute('role', 'region');
      this.setAttribute('aria-labelledby', regionIds(r.id).heading);
      this.style.setProperty('--region', regionColour(r));
      this.innerHTML = regionTemplate(r, opts);
      this.note.bind();
      this.setNoteOpen(this.hasAttribute('data-note-open'));
      this.holdersKey = '';
    }

    update(st: RegionState): void {
      this.dataset.mode = st.mode;
      for (const b of this.querySelectorAll<HTMLButtonElement>('button[role="radio"]'))
        b.setAttribute('aria-checked', String(b.dataset.mode === st.mode));
      for (const t of this.querySelectorAll<HTMLElement>('.vb-mtile')) t.toggleAttribute('data-current', t.dataset.tile === st.mode);
      this.applyWidths(st);
      this.row.sync();
      this.applyCount(st);
      const paused = st.paused === true;
      const reset = this.piece('[data-reset]');
      reset.setAttribute('aria-disabled', String(!st.canReset || paused));
      if (st.canReset) reset.removeAttribute('aria-describedby');
      else reset.setAttribute('aria-describedby', regionIds(this.dataset.region!).hint);
      const back = this.piece('[data-put-back]');
      back.setAttribute('aria-disabled', String(!st.canPutBack || paused));
      if (st.canPutBack) back.removeAttribute('aria-describedby');
      else back.setAttribute('aria-describedby', regionIds(this.dataset.region!).back);
      this.applyNote(st);
      this.applyRetired(st);
      this.applyFresh(st);
      this.piece('.vb-region-empty').hidden = !st.showEmpty;
      const key = JSON.stringify(st.holders ?? []);
      if (key !== this.holdersKey) {
        this.holdersKey = key;
        this.piece('.vb-region-holders').innerHTML = holdersTemplate(st.holders ?? []);
      }
      pauseControls(this, PAUSED, paused);
    }

    showPanel(what: RegionOpen, opts?: { mode?: Mode; focus?: boolean }): void {
      this.row.open(what, opts);
    }

    setNoteOpen(open: boolean): void {
      this.toggleAttribute('data-note-open', open);
      // The bubble takes over from the preview.
      if (open) this.note.close();
    }

    get noteShown(): boolean {
      return this.hasAttribute('data-note-shown');
    }

    set noteShown(on: boolean) {
      if (on === this.noteShown) return;
      this.toggleAttribute('data-note-shown', on);
      this.note.shown(on);
    }

    noteHeight(): number {
      return this.note.height();
    }

    titleLine(): HTMLElement {
      return this.piece('.vb-region-head');
    }

    /** The Match card widths switch (widthsControl flag): on for `match`; a press sends the other. */
    private applyWidths(st: RegionState): void {
      const b = this.querySelector<HTMLButtonElement>('.vb-widths');
      if (!b) return;
      b.setAttribute('aria-checked', String(st.widths === 'match'));
      b.title = widthsTip(st.widths);
      b.dataset.widths = st.widths === 'match' ? 'own' : 'match';
    }

    /** The answered count: "1/1" to the eye, its words to screen readers and in the tooltip. */
    private applyCount(st: RegionState): void {
      const c = this.piece('.vb-region-count');
      c.hidden = st.countText === '';
      c.title = st.countLabel;
      this.piece('.vb-region-count-n').textContent = st.countText;
      this.piece('.vb-region-count-words').textContent = st.countLabel;
    }

    /** "N retired" (retiredMarker flag): its number (the word and the icon are in the template), its
     *  name, and the version a press opens with the line its answers run to (`data-until`); with no
     *  version to open it is aria-disabled. */
    private applyRetired(st: RegionState): void {
      const b = this.piece('.vb-region-retired');
      const r = st.retired;
      b.hidden = !r;
      this.piece('.vb-retired-n').textContent = r ? String(r.count) : '';
      if (r) b.setAttribute('aria-label', r.label);
      if (r) b.title = r.label;
      if (r?.version === undefined) delete b.dataset.version;
      else b.dataset.version = String(r.version);
      if (r?.until === undefined) delete b.dataset.until;
      else b.dataset.until = String(r.until);
      b.setAttribute('aria-disabled', String(r?.version === undefined));
    }

    /** A fresh container (freshCards flag): `data-fresh` (its teal border) and the pill's words. */
    private applyFresh(st: RegionState): void {
      const f = st.fresh;
      this.toggleAttribute('data-fresh', f !== undefined);
      const pill = this.piece('.vb-region-fresh');
      pill.hidden = !f;
      pill.title = f?.label ?? '';
      this.piece('.vb-region-fresh-n').textContent = f?.text ?? '';
      this.piece('.vb-region-fresh-words').textContent = f?.label ?? '';
    }

    /** Comment's name and badge, the preview and the note block; a fixed frame (Later) has none
     *  of them. */
    private applyNote(st: RegionState): void {
      this.querySelector('.vb-region-comment')?.setAttribute('aria-label', st.commentLabel);
      this.note.apply(st.note);
    }

    private piece(selector: string): HTMLElement {
      return this.querySelector<HTMLElement>(selector)!;
    }
  }

  customElements.define(VB_REGION_TAG, VbRegion);
}
