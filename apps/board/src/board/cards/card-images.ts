// Images in cards on the page (D-048 rulings 21-23, app-cards FE_03). The renderer writes each image's
// one shape, and the image-view pattern draws its button, the box saying why one is not shown and the
// zoomed view (packages/ui); this wires them to the board:
// - a card's images wait until the card is on screen or near it and the board is not zoomed out past
//   FAR_K (`near`, after every draw, pan and zoom); then the route says which version the file is
//   (io.ts `imageVersion`, the page's one I/O layer) and the picture loads at that version (`?v=`), so
//   the page knows the version it shows; a file the route refuses gives its place to the box;
// - an image in a card's body is the button that opens it over the board;
// - selecting its card, or opening it, asks again with that version's ETag (a conditional request, on
//   no timer); a newer picture is loaded out of sight, then swapped in, on the card and in the view;
// - a card whose image loaded, changed or gave way to a box is measured again, alone (`grown`); so is
//   an app card whose panel told a new height or whose frame went (APP_FRAME_RESIZE_EVENT, the appFit
//   flag), through the same path: the one re-measure for a card that changed height by itself.
import { IMAGE_ROUTE, imageNotReal, imageTypeByName } from '#format';
import type { VbImageViewElement } from '#ui';
import { APP_FRAME_RESIZE_EVENT, IMAGE_BUTTON, imageButton, showProblem } from '#ui';
import { imageVersion } from '../io.ts';

export interface CardImagesDeps {
  /** Where the cards are: the board's card layer, or a gallery section. */
  host: HTMLElement;
  /** Whether `card`'s images may load now (ruling 23). */
  near(card: HTMLElement): boolean;
  /** Cards whose height changed by itself (an image, an app panel's height): measure them again, and
   * nothing else (rule 15). */
  grown(ids: string[]): void;
}

export interface CardImages {
  /** Cards just drawn or updated: their new images wait to load; one in a card's body is its button. */
  drawn(cards: Iterable<HTMLElement>): void;
  /** After every draw, pan and zoom: the images of cards now near start loading, in the next frame
   * (once a board just opened has its view, and once per frame while the view moves). */
  place(): void;
  /** Cards just selected: ask whether their images have a newer version (ruling 21). */
  selected(cards: Iterable<HTMLElement>): void;
  /** Take the zoomed view away (the board unmounts): it is the one element outside the board's
   *  root, the top layer of a modal dialog. */
  destroy(): void;
}

/** The version of a file the page shows: its ETag, and the address that loads exactly it. */
interface Shown { etag: string; src: string }

/** Where an image keeps its path once the page holds its loading back. */
const PATH = 'data-path';
const versioned = (path: string, etag: string) => `${IMAGE_ROUTE}${path}?v=${encodeURIComponent(etag.replace(/^W\/|"/g, ''))}`;
/** Load `src` out of sight; settles once it can be drawn at once (or can't be drawn at all). */
const loaded = (src: string): Promise<unknown> => { const pic = new Image(); pic.src = src; return pic.decode().catch(() => undefined); };

export function createCardImages(d: CardImagesDeps): CardImages {
  /** The version shown of each file, by path. */
  const shown = new Map<string, Shown>();
  /** Each loaded picture's size, by address, so an image drawn again keeps its card's height at once. */
  const sizes = new Map<string, [number, number]>();
  /** Images whose loading waits for their card to come near. */
  const waiting = new Set<HTMLImageElement>();
  /** The question in flight for each path: one at a time. */
  const asking = new Map<string, Promise<void>>();
  let view: VbImageViewElement | null = null;
  let grownIds = new Set<string>();
  let frame = 0;
  let placing = 0;

  const imagesOf = (path: string) => d.host.querySelectorAll<HTMLImageElement>(`img[${PATH}="${CSS.escape(path)}"]`);

  /** The card holding `el` changed height: measure it again in the next frame, with any others. */
  function grew(el: Element): void {
    const id = el.closest<HTMLElement>('vb-node')?.dataset.id;
    if (id === undefined) return;
    grownIds.add(id);
    frame ||= requestAnimationFrame(() => {
      frame = 0;
      const ids = [...grownIds];
      grownIds = new Set();
      d.grown(ids);
    });
  }

  /** Version `s` on `img`, its size first when known, so its card keeps its height. */
  function show(img: HTMLImageElement, s: Shown): void {
    waiting.delete(img);
    const wh = sizes.get(s.src);
    if (wh) [img.width, img.height] = wh;
    if (img.getAttribute('src') !== s.src) img.src = s.src;
  }

  /** Every image of `path` gives its place to the box saying why (the view of it closes). */
  function refuse(path: string, reason: string): void {
    if (view?.shown?.getAttribute(PATH) === path) view.close();
    for (const img of imagesOf(path)) {
      grew(img);
      waiting.delete(img);
      const card = img.closest<HTMLElement>('vb-node');
      const focused = img.closest(`.${IMAGE_BUTTON}`)?.contains(document.activeElement);
      showProblem(img, path, reason);
      if (focused) card?.focus({ preventScroll: true });
    }
  }

  /** Ask the route which version `path` is, or with `etag` whether it still is that one. A newer one is
   * loaded out of sight first, then shown on every image of it and in the view. */
  function ask(path: string, etag?: string): Promise<void> {
    const was = asking.get(path);
    if (was) return was;
    const run = imageVersion(path, etag).then(async (v) => {
      if (v.problem !== undefined) return refuse(path, v.problem);
      if (v.same || !v.etag || v.etag === shown.get(path)?.etag) return;
      const next = { etag: v.etag, src: versioned(path, v.etag) };
      if (etag !== undefined) await loaded(next.src);
      shown.set(path, next);
      for (const img of imagesOf(path)) show(img, next);
      if (view?.shown?.getAttribute(PATH) === path) view.swap(next.src);
    }).catch(() => undefined).finally(() => asking.delete(path));
    asking.set(path, run);
    return run;
  }

  /** A new image on a card: it waits (or shows the version already known), and in the body it is the
   * button that opens it (not in a link: a link is the control there). */
  function hold(img: HTMLImageElement): void {
    const src = img.getAttribute('src');
    if (!src?.startsWith(IMAGE_ROUTE)) return;
    const path = src.slice(IMAGE_ROUTE.length);
    img.setAttribute(PATH, path);
    img.removeAttribute('src');
    if (img.closest('.vb-node-body') && !img.closest('a')) imageButton(img);
    const s = shown.get(path);
    if (s) show(img, s);
    else waiting.add(img);
  }

  /** The image of button `b` over the board, once it has loaded; then ask for a newer version. */
  async function open(b: HTMLButtonElement): Promise<void> {
    const img = b.querySelector<HTMLImageElement>(`img[${PATH}]`);
    if (!img) return;
    const path = img.getAttribute(PATH)!;
    if (!img.naturalWidth) {
      if (!shown.has(path)) void ask(path);
      const ok = await new Promise<boolean>((done) => {
        img.addEventListener('load', () => done(true), { once: true });
        img.addEventListener('error', () => done(false), { once: true });
      });
      if (!ok || !img.isConnected) return;
    }
    view ??= document.body.appendChild(document.createElement('vb-image-view') as VbImageViewElement);
    view.open(img);
    const s = shown.get(path);
    if (s) void ask(path, s.etag);
  }

  d.host.addEventListener('click', (e) => {
    const b = (e.target as Element).closest<HTMLButtonElement>(`.${IMAGE_BUTTON}`);
    if (b) void open(b);
  });
  // A picture loaded (or swapped): its size, kept for the next draw, and its card measured again.
  d.host.addEventListener('load', (e) => {
    const img = e.target as HTMLImageElement;
    if (!img.matches?.(`img[${PATH}][src]`)) return;
    const wh: [number, number] = [img.naturalWidth, img.naturalHeight];
    sizes.set(img.getAttribute('src')!, wh);
    [img.width, img.height] = wh;
    grew(img);
  }, true);
  // An app card's panel told a new height, or its frame went: its card measured again, as for a picture.
  d.host.addEventListener(APP_FRAME_RESIZE_EVENT, (e) => grew(e.target as Element));
  // One that would not draw: the route says why, or its bytes were not a picture after all.
  d.host.addEventListener('error', (e) => {
    const img = e.target as HTMLImageElement;
    if (!img.matches?.(`img[${PATH}][src]`)) return;
    const path = img.getAttribute(PATH)!;
    void imageVersion(path).then((v) => refuse(path, v.problem ?? imageNotReal(imageTypeByName(path)!)), () => undefined);
  }, true);

  return {
    drawn(cards) {
      for (const card of cards) for (const img of card.querySelectorAll<HTMLImageElement>(`img.vb-md-img:not([${PATH}])`)) hold(img);
    },
    place() {
      placing ||= requestAnimationFrame(() => {
        placing = 0;
        for (const img of waiting) {
          const card = img.isConnected ? img.closest<HTMLElement>('vb-node') : null;
          if (!card) waiting.delete(img);
          else if (d.near(card)) {
            waiting.delete(img);
            void ask(img.getAttribute(PATH)!);
          }
        }
      });
    },
    selected(cards) {
      const paths = new Set<string>();
      for (const card of cards) for (const img of card.querySelectorAll(`img[${PATH}]`)) paths.add(img.getAttribute(PATH)!);
      for (const path of paths) {
        const s = shown.get(path);
        if (s) void ask(path, s.etag);
      }
    },
    destroy() {
      cancelAnimationFrame(placing);
      view?.remove();
      view = null;
    },
  };
}
