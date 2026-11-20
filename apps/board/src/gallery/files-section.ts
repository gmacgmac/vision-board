// Gallery entry for export, import and Save as PDF (D-107, export-import-print FE_01; nclite ADR-0381): the "⋯" menu with
// its section of Save as PDF…, Export… and Import…; a container's settings menu with Save container as PDF… and Export
// container…; and the one dialog's form (FilesForm) in each of its states: Save the board as PDF (borders on) and a
// container (its border off), Export the board and a container, the conversations ticked, Exporting…, Import with This
// board on and off, a refusal kept, and an import that left parts of the file out. Titles and parts are made up. The PDF
// itself is a print of the page: tests/pages/board-files.spec.ts prints it to PDF. The section keeps its id
// (`exportImportPrint`), which other specs name.
import { mount } from 'svelte';
import type { VbRegionElement } from '#ui';
import { regionState } from '#ui';
import { LOCKED_PERSON } from '#actions';
import type { FilesAsk } from '../board/boards/index.ts';
import { FilesForm, ToolbarMenu } from '../board/chrome/index.ts';
import { chromeSample } from './chrome-sample.ts';
import { el, group, ownIds } from './dom.ts';
import type { Fixture } from './fixture.ts';

const none = () => undefined;
const CONTAINER: FilesAsk = { kind: 'export', region: 'options', title: 'Pricing options' };
const DROPPED = ['answers: ✓ on "fee-q" (only the person answers on this board)', 'containers: "options" center (a card number)', 'notes: 1 with no card in the file'];
const REFUSED = 'board: "pricing" already exists';

let samples = 0;
/** The form as the dialog shows it, in a state. */
function form(ask: FilesAsk, o: { border?: boolean; notes?: boolean; into?: 'new' | 'current'; busy?: boolean; problem?: string; dropped?: string[]; current?: string } = {}): HTMLElement {
  const host = el('div', 'vb-dialog g-files');
  const uid = `g-files-${(samples += 1)}-`;
  mount(FilesForm, { target: host, props: { ask, idOf: (n: string) => `${uid}${n}`, onsubmit: none, oncancel: none, border: ask.region === undefined, ...o } });
  return host;
}

/** The "⋯" menu, open, without the board's ids: its files rows after the board's own. */
function menu(): HTMLElement {
  const host = el('div', 'g-toolbar g-archive-menu g-files-menu');
  host.toggleAttribute('data-menu-open', true);
  mount(ToolbarMenu, { target: host, context: chromeSample(), props: { onhide: none, onarchive: none, onfiles: none, open: true, placement: 'gallery' } });
  return host;
}

/** A container with its settings menu open: Save container as PDF… and Export container… after the place rows. */
function frame(fx: Fixture): HTMLElement {
  const { view, state } = fx;
  const region = view.regions.find((r) => r.id !== 'later')!;
  const f = document.createElement('vb-region') as VbRegionElement;
  f.render(region, { ...ownIds(), files: { print: true, export: true } });
  f.update(regionState(region, view, state, new Set(view.nodes.map((n) => n.id))));
  const frames = el('div', 'g-frames g-remove-frames g-files-frames vb-ground');
  frames.append(f);
  f.showPanel('menu', { focus: false });
  return frames;
}

export function filesSection(fx: Fixture): HTMLElement {
  const box = el('section', 'g-section');
  box.dataset.feature = 'exportImportPrint';
  box.setAttribute('aria-labelledby', 'feature-exportImportPrint');
  const heading = el('h2', 'g-title', 'Export, import and Save as PDF');
  heading.id = 'feature-exportImportPrint';
  const meta = el('p', 'g-meta');
  meta.append(el('code', undefined, 'export_board · write_board import · BoardHost saveFile, openFile, savePdf'), ' · D-107');
  box.append(heading,
    el('p', 'g-desc', 'The board, or one container, leaves as a .vboard.json file and comes back as fresh cards; or saves as a PDF, one page the size of what is saved, through the host\'s Save as PDF. Each item shows only when the host gives its hook. Where the person opens it sets the scope, so the one dialog asks only what is left.'),
    meta,
    group('The "⋯" menu', 'A section of its own after the board\'s rows: Save as PDF…, Export… and Import…, each for the whole board.', menu()),
    group('A container\'s settings', 'Save container as PDF… and Export container…, after the place rows; never disabled, since neither changes the board.', frame(fx)),
    group('Save the board as PDF', 'The borders, on, and light or dark, the screen\'s first. Save as PDF closes the dialog, then the host saves.', form({ kind: 'print' })),
    group('Save a container as PDF', 'Its border off by default: the cards alone, under the container\'s title.', form({ kind: 'print', region: 'options', title: 'Pricing options' })),
    group('Export the board', 'Only the conversations to choose, off.', form({ kind: 'export' })),
    group('Export a container, with the conversations', 'Named in the words; the file is named after the board and the container.', form(CONTAINER, { notes: true })),
    group('Exporting', 'The button says so, and Cancel waits.', form(CONTAINER, { busy: true })),
    group('Import', 'Into a new board, named from the file\'s title, or this one. The button opens the file picker.', form({ kind: 'import' })),
    group('Import on a locked board', 'This board is off, saying why; a new board still takes it.', form({ kind: 'import' }, { current: LOCKED_PERSON })),
    group('Refused', 'The server\'s words stay in the dialog, the choice kept.', form({ kind: 'import' }, { into: 'new', problem: REFUSED })),
    group('Imported, with parts left out', 'What the board could not take, named; Close.', form({ kind: 'import' }, { dropped: DROPPED })));
  return box;
}
