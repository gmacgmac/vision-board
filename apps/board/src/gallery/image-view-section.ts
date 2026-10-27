// Gallery entry for images in cards (cardImages flag, D-048, app-cards FE_03): real <vb-node> cards whose
// Markdown names images, wired by the board's own card-images.ts, so each loads through the image route
// and opens in the zoomed view as on the board. The two pictures are files in the served project's
// `.visionboard/images/gallery/` (the page tests save them there: tests/pages/gallery-images.ts); a
// folder without them shows the missing state. The states a request would only reach by failing (a
// missing file, one too big, one that is not a real png) are drawn from the route's own words
// (IMAGE_WORDS), so the gallery makes no failing request; loading is a card kept from loading.
import type { ViewNode } from '#format';
import { IMAGE_WORDS, imageNotReal } from '#format';
import type { VbImageViewElement } from '#ui';
import { showProblem } from '#ui';
import { createCardImages } from '../board/card-images.ts';
import { wholePixels } from './app-frame-section.ts';
import { cardList, el, group } from './dom.ts';
import type { Fixture } from './fixture.ts';
import { REGION_OTHER } from './fixture.ts';
import { card } from './node-section.ts';

/** The pictures in the served project (gallery-images.ts saves them). */
const FLOW = 'gallery/flow.png';
const PHONE = 'gallery/phone.png';

/** A sample card: the fixture's finding with a title and a Markdown body of its own. */
interface Sample { id: string; title: string; body: string; problem?: string; still?: true }

const IN_A_CARD: Sample[] = [
  { id: 'img-wide', title: 'A wide image', body: `![Sign-in flow, three steps](${FLOW})\n\nAt the card's width; a click opens it larger.` },
  { id: 'img-tall', title: 'A tall image', body: `![Phone screen](${PHONE})` },
  { id: 'img-loading', title: 'Loading', body: '![An image on its way](gallery/loading.png)', still: true },
  { id: 'img-missing', title: 'Missing', body: '![Old diagram](gallery/gone.png)', problem: IMAGE_WORDS.missing },
  { id: 'img-big', title: 'Too big', body: '![A huge scan](gallery/scan.png)', problem: IMAGE_WORDS.tooBig },
  { id: 'img-fake', title: 'Not an image', body: '![Chart](gallery/chart.png)', problem: imageNotReal('png') },
  { id: 'img-outside', title: 'Outside the images folder', body: '![Secret](../notes.png) and ![Logo](https://example.com/logo.png)' },
  { id: 'img-noalt', title: 'No alt text', body: `![](${FLOW})` },
];

function sampleCard(s: Sample, fx: Fixture): HTMLElement {
  const base = fx.view.nodes.find((n) => n.region === REGION_OTHER && n.kind === 'finding')!;
  const n: ViewNode = { ...base, id: s.id, title: s.title, body: s.body, emphasis: false };
  delete n.tags;
  return card(n, fx, fx.state, {}, false);
}

/** "Open" buttons for the zoomed view of a card's image: with motion, and without it (as under reduced motion). */
function openers(view: VbImageViewElement, cards: HTMLElement[]): HTMLElement {
  const row = el('div', 'g-cards');
  const open = (label: string, id: string, still = false) => {
    const b = el('button', 'vb-btn', label);
    b.type = 'button';
    b.addEventListener('click', () => {
      const img = cards.find((c) => c.dataset.id === id)?.querySelector<HTMLImageElement>('img[src]');
      if (img?.naturalWidth) view.open(img, still);
    });
    return b;
  };
  row.append(open('Open the wide image', 'img-wide'), open('Open the tall image', 'img-tall'), open('Open without motion', 'img-wide', true));
  return row;
}

export function imageViewSamples(body: HTMLElement, fx: Fixture): void {
  const cards = IN_A_CARD.map((s) => sampleCard(s, fx));
  const still = new Set(IN_A_CARD.filter((s) => s.still || s.problem).map((s) => s.id));
  // Its height in whole pixels, so the sections under it stay on the pixel grid (their screenshots).
  wholePixels(body);
  const images = createCardImages({ host: body, near: (c) => !still.has(c.dataset.id!), grown: () => wholePixels(body) });
  body.append(group('In a card', 'At the card\'s width, its own shape. Loading is a sunken box; a missing or refused file, or a path outside the images folder, says why in its place. No alt text shows the path.',
    cardList('Images in cards', ...cards)));
  images.drawn(cards);
  for (const s of IN_A_CARD) {
    const img = s.problem ? cards.find((c) => c.dataset.id === s.id)?.querySelector<HTMLImageElement>('img[data-path]') : null;
    if (img) showProblem(img, img.dataset.path!, s.problem!);
  }
  images.place();
  const view = document.body.appendChild(document.createElement('vb-image-view') as VbImageViewElement);
  body.append(group('The zoomed view', 'A click, Enter or Space on an image opens it over the board at 70% of the screen on its longer side, growing from the card. Esc, a click outside it or the × closes it. Under reduced motion it opens without moving.',
    openers(view, cards)));
}
