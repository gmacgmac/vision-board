// Gallery entry for flow branching and direction (BE_01; PLAN decisions 19 and 25): the maintainer's example (seven
// cards, 1>2>3>4 and a branch 2>5>6>7 that rejoins 4) as a row whose links branch, drawn on rows, and as a flow running
// down; three nodes with their edge marks and the room under each; and the header's Flows menu. Every board sample is a mini board drawn by the board's
// own drawing (mini-board.ts).
import type { View } from '#format';
import { mount } from 'svelte';
import { FlowMenu } from '../board/chrome/index.ts';
import { chromeSample } from './chrome-sample.ts';
import { el, group } from './dom.ts';
import type { Fixture } from './fixture.ts';
import { miniBoard } from './mini-board.ts';

const LINKS = [[1, 2], [2, 3], [3, 4], [2, 5], [5, 6], [6, 7], [7, 4]];

/** The example in container `line`, in `mode`; `count` cards (the first three alone have no links). */
function line(fx: Fixture, mode: 'row' | 'flow' | 'column', count = 7): { view: View; state: Fixture['layout']['state'] } {
  const view: View = {
    format: 1, session: 'gallery-flow', version: 1, title: 'Line',
    regions: [{ id: 'line', title: 'From idea to production line', mode }],
    nodes: Array.from({ length: count }, (_, i) => ({ id: `fl${i + 1}`, n: 900 + i + 1, region: 'line', kind: 'topic' as const, title: `Step ${i + 1}` })),
    links: count === 7 ? LINKS.map(([a, b]) => ({ from: `fl${a}`, to: `fl${b}` })) : [],
  };
  return { view, state: fx.layout.state };
}

function flowRows(): HTMLElement {
  const host = el('div', 'g-edge-menu');
  mount(FlowMenu, { target: host, context: chromeSample({}, { direction: 'auto', version: 3 }), props: { ondirection: () => undefined, open: true, placement: 'gallery' } });
  return host;
}

export function flowSection(fx: Fixture): HTMLElement {
  const box = el('section', 'g-section');
  box.dataset.feature = 'flow-branching';
  box.setAttribute('aria-labelledby', 'feature-flow-branching');
  const heading = el('h2', 'g-title', 'Flow branching and direction');
  heading.id = 'feature-flow-branching';
  const meta = el('p', 'g-meta');
  meta.append(el('code', undefined, 'branches.ts branchRows · flow.ts · act direction { board, region?, direction }'), ' · PLAN decisions 19 and 25');
  box.append(heading,
    el('p', 'g-desc', 'A linked flow branches into rows instead of sending its links round the cards: the main line keeps one row, a branch its own row, and a branch that rejoins comes back with one link. A flow runs across or down: the agent sets it on the container, the person for the board in the header (or for one container), and Auto gives back the agent\'s.'),
    meta,
    group('Branches on rows', 'A row whose links are more than a chain in card order is laid out as a flow: the main line on one row and the branch on the next.',
      miniBoard(line(fx, 'row'), 'line', { label: 'A row whose links branch, on rows', suffix: '-rows' })),
    group('Down', 'The same cards as a flow running down; links leave by the bottom and enter by the top.',
      miniBoard(line(fx, 'flow'), 'line', { label: 'A flow running down', direction: 'down', suffix: '-down' })),
    group('Room for the marks', 'The gap under a node (EDGE_ROW_GAP) leaves its bottom marks and the next node\'s number, kind and disc clear of each other.',
      miniBoard(line(fx, 'column', 3), 'line', { label: 'A column of nodes with their edge marks', suffix: '-edges' })),
    group('The board\'s direction', 'The header\'s Flows menu, Auto ticked: a choice is the person\'s direction act for the whole board, for everyone who opens it.', flowRows()));
  return box;
}
