// Defines the board's elements. The page calls defineBoardElements() once at start-up, before
// it creates any of them; each define is idempotent. Later patterns (<vb-link>) add their
// define call here. Two elements the board needs only on a person's way through it, an app card's
// panel and the zoomed picture, are defined the first time one is wanted (`defineAppFrame`,
// `defineImageView`): their code is a chunk of its own, out of the page's start weight
// (docs/specification/performance.md § What the page leaves out of its start weight). A load that
// fails is tried again on the next call.
import { defineVbNode } from './node/vb-node.ts';
import { defineVbRegion } from './region/vb-region.ts';
import { defineVbNoteBubble } from './note-bubble/vb-note-bubble.ts';
import { defineVbSelectionBar } from './selection-bar/vb-selection-bar.ts';

export function defineBoardElements(): void {
  defineVbNode();
  defineVbRegion();
  defineVbNoteBubble();
  defineVbSelectionBar();
}

/** `define`, run once its module has loaded; a failed load is forgotten so the next call loads again. */
function later(load: () => Promise<() => void>): () => Promise<void> {
  let defined: Promise<void> | null = null;
  return () => (defined ??= load().then((define) => define(), (err: unknown) => { defined = null; throw err; }));
}

/** Define <vb-app-frame>, the first time a board shows an app card's panel. */
export const defineAppFrame = later(() => import('./app-frame/vb-app-frame.ts').then((m) => m.defineVbAppFrame));
/** Define <vb-image-view>, the first time a person opens a picture. */
export const defineImageView = later(() => import('./image-view/vb-image-view.ts').then((m) => m.defineVbImageView));
