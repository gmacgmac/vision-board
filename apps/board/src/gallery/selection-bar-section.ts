// Gallery entry for <vb-selection-bar> (3_FE_02): the selection bar over two selected cards, and
// the area bar a lasso leaves when it touched no card. Each sample is a small stage on the board's
// canvas; the bar is placed with `placeBar` exactly as the board places it. The cards are the
// gallery's own non-item samples (topic, note): the bar is what the sample is about, not a card's
// footer buttons, which a 300-400px stage would otherwise squeeze under the target-size minimum.
import type { ViewNode } from '../../../../packages/format/src/index.ts';
import type { VbSelectionBarElement } from '../../../../packages/ui/src/index.ts';
import { barView, placeBar } from '../../../../packages/ui/src/index.ts';
import { AREA_COMMANDS, barButtons, SELECTION_COMMANDS } from '../board/commands.ts';
import { el, group } from './dom.ts';
import type { Fixture } from './fixture.ts';
import { card } from './node-section.ts';

interface Sample {
  caption: string;
  titles: string[];
  area: boolean;
  stage: { w: number; h: number };
}

const SAMPLES: Sample[] = [
  { caption: 'Over two selected cards: Comment, Move to, Zoom to selection, Clear',
    titles: ['Topic: a heading for a group, not an item', 'Note: the agent remarks, nothing to answer'],
    area: false, stage: { w: 680, h: 220 } },
  { caption: 'A lasso that touched no card: only Zoom to this area', titles: ['Topic: a heading for a group, not an item'],
    area: true, stage: { w: 400, h: 180 } },
];

function sample(s: Sample, fx: Fixture): HTMLElement {
  const stage = el('div', 'g-bubble-stage vb-ground');
  stage.style.setProperty('width', `${s.stage.w}px`);
  stage.style.setProperty('height', `${s.stage.h}px`);
  const list = el('div', 'g-bubble-card');
  list.setAttribute('role', 'list');
  const nodes = s.titles.map((t) => fx.view.nodes.find((n: ViewNode) => n.title === t)!);
  const cards = nodes.map((n, i) => {
    const c = card(n, fx, fx.state);
    c.style.transform = `translate(${24 + i * 240}px, 24px)`;
    c.toggleAttribute('data-selected', !s.area);
    list.append(c);
    return c;
  });
  const bar = document.createElement('vb-selection-bar') as VbSelectionBarElement;
  const view = s.area ? barView(0, barButtons(AREA_COMMANDS)) : barView(cards.length, barButtons(SELECTION_COMMANDS));
  bar.show(view);
  stage.append(list, bar);
  requestAnimationFrame(() => {
    const boxes = cards.map((c) => ({ x: c.offsetLeft, y: c.offsetTop, w: c.offsetWidth, h: c.offsetHeight }));
    const box = {
      x: Math.min(...boxes.map((b) => b.x)), y: Math.min(...boxes.map((b) => b.y)),
      w: Math.max(...boxes.map((b) => b.x + b.w)) - Math.min(...boxes.map((b) => b.x)),
      h: Math.max(...boxes.map((b) => b.y + b.h)) - Math.min(...boxes.map((b) => b.y)),
    };
    bar.place(placeBar(box, { w: bar.offsetWidth, h: bar.offsetHeight }, s.stage));
  });
  const fig = el('figure', 'g-bubble');
  fig.append(stage, el('figcaption', 'g-note', s.caption));
  return fig;
}

export function selectionBarSamples(body: HTMLElement, fx: Fixture): void {
  const row = el('div', 'g-bubbles');
  row.append(...SAMPLES.map((s) => sample(s, fx)));
  body.append(group('Every state', 'Centred above the selection, below it when there is no room; the lasso it follows is .vb-lasso. One command table drives the bar, the header buttons and the keys.', row));
}
