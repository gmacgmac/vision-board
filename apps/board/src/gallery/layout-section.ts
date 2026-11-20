// Gallery entries for field report batch 3 (FE_01), each shown by default behind its flag: link
// labels (linkLabels, point 646: a label on its line, beside it in the gap, centred on or beside an upright, a short tag where
// it has no room, and a tag's whole label floating as hover or focus opens it), the viewer's alignment (alignSetting: a row of cards lined
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

/** The short tag of the link `from` > `to` drawn open, as hover or keyboard focus opens it. */
const openMark = (to: string) => (host: HTMLElement) => {
  const mark = [...host.querySelectorAll<HTMLElement>('.vb-link-mark')]
    .find((m) => m.querySelector('button')?.getAttribute('aria-label')?.includes(` to ${to}:`));
  mark?.toggleAttribute('data-tip-open', true);
  mark?.querySelector('button')?.setAttribute('data-look', 'focus');
};

export function linkLabelSection(fx: Fixture): HTMLElement {
  return section('linkLabels', 'Link labels', 'Route.labelAt · route/labels.ts · link-labels.ts · link-marks.ts',
    'A link\'s label is a word read where it sits: on a straight piece of its line near the source, else just above or below a level piece inside the gap between its two cards, '
    + 'else centred on the elbow\'s upright piece, else just right or left of it (stacked cards), always on the canvas colour and clear of every card and other label. Cards never move. '
    + 'Only a label that fits none of these is a short tag: its first words and an ellipsis, a hairline border; hovering or focusing it floats the whole label, and Esc closes it. '
    + 'On paper every label is drawn whole: the tag shows all its words, wrapped.',
    group('Every place a label takes', '"feeds" sits on its line\'s upright piece; "next" has no room on its short level piece, so it sits just above it; '
      + '"when a note fits no theme" is centred on its upright piece, in the gap; "once every note has been read" fits nowhere between cards 1 and 2, so it is the short tag "once…".',
      miniBoard(fx.layout, 'labels', { label: 'Cards joined by labelled links', labels: true })),
    group('Stacked cards', 'A column: the line between two stacked cards is too short for "unblocks" on it, and centred on it the word would cover the arrowhead, so it sits just right of the line, in the gap.',
      miniBoard(fx.layout, 'labels-down', { label: 'Two stacked cards joined by a labelled link', labels: true })),
    group('A short tag\'s label floating', 'As hover or keyboard focus opens it: the whole label over the board, the tag in its focus ring.',
      miniBoard(fx.layout, 'labels', { label: 'Cards with a short tag open', labels: true, suffix: '-open', then: openMark('2-open') })));
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
