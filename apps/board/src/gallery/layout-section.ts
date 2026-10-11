// Gallery entries for field report batch 3 (FE_01), each shown by default behind its flag: link
// labels (linkLabels: a label on its line, a marker where it has no room, and a marker's label
// floating as hover or focus opens it), the viewer's alignment (alignSetting: a row of cards lined
// up by its tops, and centred) and card widths (widthsControl: a column under Match card widths and
// one under its own widths, the switch on and focused, off and hovered). Every sample is a mini board
// drawn by the board's own drawing from the fixture ledger's layout board (mini-board.ts).
import { el, group } from './dom.ts';
import type { Fixture } from './fixture.ts';
import { miniBoard } from './mini-board.ts';

function section(feature: string, title: string, code: string, desc: string, ...groups: HTMLElement[]): HTMLElement {
  const box = el('section', 'g-section');
  box.dataset.feature = feature;
  box.setAttribute('aria-labelledby', `feature-${feature}`);
  const heading = el('h2', 'g-title', title);
  heading.id = `feature-${feature}`;
  const meta = el('p', 'g-meta');
  meta.append(el('code', undefined, code), ` · feature flag ${feature} (field report batch 3), on by default · off with ?flags=-${feature}`);
  box.append(heading, el('p', 'g-desc', desc), meta, ...groups);
  return box;
}

/** The marker of the link `from` > `to` drawn open, as hover or keyboard focus opens it. */
const openMark = (to: string) => (host: HTMLElement) => {
  const mark = [...host.querySelectorAll<HTMLElement>('.vb-link-mark')]
    .find((m) => m.querySelector('button')?.getAttribute('aria-label')?.includes(` to ${to}:`));
  mark?.toggleAttribute('data-tip-open', true);
  mark?.querySelector('button')?.setAttribute('data-look', 'focus');
};

export function linkLabelSection(fx: Fixture): HTMLElement {
  return section('linkLabels', 'Link labels', 'Route.labelAt · link-labels.ts · link-marks.ts',
    'A link\'s label sits on its line near the source, on the canvas colour so the line does not show through, wherever the layout found it room. '
    + 'Where it did not, a small marker sits on the line; hovering or focusing the marker floats the label above everything, and Esc closes it.',
    group('Fits, and a marker', 'The straight link\'s short label fits on its line; the two longer labels have no room on theirs, so each is a marker.',
      miniBoard(fx.layout, 'labels', { label: 'Cards joined by labelled links', labels: true })),
    group('A marker\'s label floating', 'As hover or keyboard focus opens it: the label over the board, the marker in its focus ring.',
      miniBoard(fx.layout, 'labels', { label: 'Cards with a marker open', labels: true, suffix: '-open', then: openMark('3-open') })));
}

export function alignSection(fx: Fixture): HTMLElement {
  return section('alignSetting', 'Card alignment', '"⋯" menu · Centre cards · vb.align',
    'The viewer\'s own setting, kept in this browser and never sent to an agent. Off (the default), a row of cards lines up by its tops and a column by its left edges; on, both are centred.',
    group('Top (default)', 'Centre cards off: the row lines up by its tops.', miniBoard(fx.layout, 'align', { label: 'A row lined up by its tops' })),
    group('Centred', 'Centre cards on: the row is centred on one line.', miniBoard(fx.layout, 'align', { label: 'A centred row', align: 'center', suffix: '-centred' })));
}

/** The switch in a look the pointer or focus would give (only one element can hold them for real). */
const switchLook = (look: 'hover' | 'focus') => (host: HTMLElement) => {
  const b = host.querySelector<HTMLElement>('.vb-widths');
  if (look === 'hover') b?.toggleAttribute('data-hover', true);
  else b?.setAttribute('data-look', 'focus');
};

export function widthsSection(fx: Fixture): HTMLElement {
  return section('widthsControl', 'Card widths', 'act widths { board, region, widths } · .vb-widths',
    'Per container: under Match card widths every card in a column takes its widest card\'s width (and its height at that width); under its own widths each card keeps its own. '
    + 'Match is the default for grid and column, own for flow, row, lanes and radial; the agent may set it when drawing, and the person\'s switch in the mode row wins.',
    group('Match (on), focused', 'A column of S, M and L cards at the L card\'s width, each card\'s height measured at that width: the switch is on (the checked look) and has keyboard focus.',
      miniBoard(fx.layout, 'widths-match', { label: 'A column under Match card widths', widths: true, then: switchLook('focus') })),
    group('Own (off), hovered', 'The same cards after the person turned the switch off: each at its own width; the pointer is on the switch.',
      miniBoard(fx.layout, 'widths-own', { label: 'A column under its own widths', widths: true, then: switchLook('hover') })));
}
