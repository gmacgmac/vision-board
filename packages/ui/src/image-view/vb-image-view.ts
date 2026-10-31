// Image view pattern, layer 3 (element): <vb-image-view>, in light DOM (components.md § Image view).
// The zoomed view of an image on a card (D-048 ruling 22): a modal dialog over the board, named by the
// image's alt text, with the image at `fitImage`'s size in the middle of the board's root (with no root
// round it, a gallery's sample, of the screen) over a backdrop, and an ×. It is a real modal, so a host's
// page is inert while it is open, but it draws only over the root: the top layer takes no more room. It grows from the image's place on the card and shrinks back to it (`flipFrom`), for
// `motionMs` of the board's motion token and its easing, so reduced motion shows it without motion.
// Esc, a click outside the image and the × close it; focus stays on the × while it is open and goes
// back to the image's button after; keys and the wheel stay in the dialog, so the board neither pans
// nor zooms. The page opens it and hands it a newer version (`swap`); it fetches nothing itself.
// Browser only: the class is created inside defineVbImageView().
import type { Rect } from './image-view-core.ts';
import { centred, fitImage, flipFrom, motionMs } from './image-view-core.ts';
import { imageViewTemplate } from './image-view-template.ts';
import { IMAGE_BUTTON } from './card-image.ts';

export const VB_IMAGE_VIEW_TAG = 'vb-image-view';

export interface VbImageViewElement extends HTMLElement {
  /** Open `img`, a loaded image on a card, over the board from its place there; `still`: without
   * motion (the gallery's sample; reduced motion does the same through the token). */
  open(img: HTMLImageElement, still?: boolean): void;
  /** The open image has a newer version, already loaded: show `src`, fitted again. */
  swap(src: string): void;
  /** Shrink back to the card and close; focus goes back to the image's button. */
  close(): void;
  /** The image on its card that is open, else null. */
  readonly shown: HTMLImageElement | null;
}

const rectOf = (el: Element): Rect => {
  const r = el.getBoundingClientRect();
  return { x: r.left, y: r.top, w: r.width, h: r.height };
};

/** What the view fills: the board's root it sits in, else the window. */
const areaOf = (el: Element): Rect => {
  const root = el.closest('.vb-board');
  return root ? rectOf(root) : { x: 0, y: 0, w: innerWidth, h: innerHeight };
};

export function defineVbImageView(): void {
  if (customElements.get(VB_IMAGE_VIEW_TAG)) return;

  class VbImageView extends HTMLElement implements VbImageViewElement {
    private dlg: HTMLDialogElement | null = null;
    private pic!: HTMLImageElement;
    private scrim!: HTMLElement;
    private x!: HTMLButtonElement;
    shown: HTMLImageElement | null = null;
    /** The card of the image open: focus goes back to it when the image's button has gone meanwhile. */
    private card: HTMLElement | null = null;
    private still = false;
    private closing = false;
    /** What the view fills, in the screen's pixels. */
    private area: Rect = { x: 0, y: 0, w: 0, h: 0 };
    /** Where the image is drawn while open, in the view's pixels. */
    private box: Rect = { x: 0, y: 0, w: 0, h: 0 };
    private runs: Animation[] = [];
    private readonly refit = () => this.fit();

    private build(): HTMLDialogElement {
      this.innerHTML = imageViewTemplate();
      const dlg = this.querySelector('dialog')!;
      this.pic = dlg.querySelector('.vb-iv-img')!;
      this.scrim = dlg.querySelector('.vb-iv-scrim')!;
      this.x = dlg.querySelector('.vb-iv-x')!;
      // Esc asks the dialog to cancel: it closes the way the × does, moving back to the card.
      dlg.addEventListener('cancel', (e) => { e.preventDefault(); this.close(); });
      dlg.addEventListener('click', (e) => { if (e.target !== this.pic) this.close(); });
      // The × is the only control: Tab keeps focus on it, inside the dialog.
      dlg.addEventListener('keydown', (e) => { if (e.key === 'Tab') { e.preventDefault(); this.x.focus(); } });
      dlg.addEventListener('wheel', (e) => e.preventDefault(), { passive: false });
      dlg.addEventListener('close', () => this.closed());
      this.pic.addEventListener('load', this.refit);
      return (this.dlg = dlg);
    }

    open(img: HTMLImageElement, still = false): void {
      const dlg = this.dlg ?? this.build();
      if (dlg.open) return;
      this.closing = false; // a close before this one may not have had its close event yet
      this.shown = img;
      this.card = img.closest('vb-node');
      this.still = still;
      dlg.setAttribute('aria-label', img.alt);
      this.pic.alt = img.alt;
      this.pic.src = img.currentSrc || img.src;
      dlg.showModal();
      this.fit();
      addEventListener('resize', this.refit);
      // Held over the card until the larger picture can be drawn, so its first frame is never empty.
      const from = flipFrom(this.inView(img), this.box);
      [this.pic.style.transform, this.scrim.style.opacity] = [from, '0'];
      void this.pic.decode().catch(() => undefined).then(() => {
        [this.pic.style.transform, this.scrim.style.opacity] = ['', ''];
        if (this.shown === img) void this.move(from, 'none', 0, 1);
      });
    }

    swap(src: string): void {
      if (this.dlg?.open) this.pic.src = src;
    }

    close(): void {
      const dlg = this.dlg;
      if (!dlg?.open || this.closing) return;
      this.closing = true;
      const card = this.shown;
      // From wherever it is now (an open still under way), back to the card, or in place if it went.
      const now = getComputedStyle(this.pic).transform;
      const back = card?.isConnected && card.getClientRects().length ? flipFrom(this.inView(card), this.box) : now;
      void this.move(now, back, Number(getComputedStyle(this.scrim).opacity), 0, 'forwards').then(() => dlg.close());
    }

    /** Where `el` is, in the view's pixels. */
    private inView(el: Element): Rect {
      const r = rectOf(el);
      return { ...r, x: r.x - this.area.x, y: r.y - this.area.y };
    }

    /** The view over what it fills, the image at its zoomed size in the middle (and again when the window
     * or the picture changes). */
    private fit(): void {
      this.area = areaOf(this);
      const screen = { w: this.area.w, h: this.area.h };
      const d = this.dlg!.style;
      const inRoot = this.closest('.vb-board') !== null;
      [d.left, d.top, d.width, d.height] = [this.area.x, this.area.y, this.area.w, this.area.h].map((v) => (inRoot ? `${v}px` : '')) as [string, string, string, string];
      const pic = this.pic.naturalWidth ? this.pic : this.shown;
      const natural = { w: pic?.naturalWidth ?? 0, h: pic?.naturalHeight ?? 0 };
      this.box = centred(fitImage(natural, screen), screen);
      // CSSOM, not a style attribute: the page's CSP refuses inline styles.
      const s = this.pic.style;
      [s.left, s.top, s.width, s.height] = [this.box.x, this.box.y, this.box.w, this.box.h].map((v) => `${v}px`) as [string, string, string, string];
    }

    /** The image's transform and the backdrop's opacity from one end to the other, for the motion
     * token's share, eased by the board's easing; no motion when the token is 0 (reduced motion). */
    private move(from: string, to: string, fade0: number, fade1: number, fill: FillMode = 'none'): Promise<void> {
      for (const a of this.runs) a.cancel();
      const css = getComputedStyle(this);
      const duration = this.still ? 0 : motionMs(css.getPropertyValue('--vb-motion'));
      this.runs = [];
      if (!duration) return Promise.resolve();
      const timing: KeyframeAnimationOptions = { duration, easing: css.getPropertyValue('--vb-ease').trim() || 'ease', fill };
      this.runs = [this.pic.animate([{ transform: from }, { transform: to }], timing), this.scrim.animate([{ opacity: fade0 }, { opacity: fade1 }], timing)];
      return this.runs[0]!.finished.then(() => undefined, () => undefined);
    }

    /** Taken out of the page (the board unmounts) while open: nothing of it stays on the window. */
    disconnectedCallback(): void {
      for (const a of this.runs) a.cancel();
      this.runs = [];
      removeEventListener('resize', this.refit);
    }

    /** The dialog closed (also when a second Esc closes it at once): nothing left moving, and focus
     * back on the image's button, or its card. A close event that comes once it is open again is an
     * earlier close's, late: it changes nothing. */
    private closed(): void {
      if (this.dlg?.open) return;
      for (const a of this.runs) a.cancel();
      this.runs = [];
      removeEventListener('resize', this.refit);
      this.closing = false;
      const back = [this.shown?.closest<HTMLElement>(`.${IMAGE_BUTTON}`), this.card].find((el) => el?.isConnected);
      this.shown = this.card = null;
      this.pic.removeAttribute('src');
      back?.focus({ preventScroll: true });
    }
  }

  customElements.define(VB_IMAGE_VIEW_TAG, VbImageView);
}
