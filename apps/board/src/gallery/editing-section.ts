// Gallery entry for a ledger open read-only, and Edit (readOnlyStart flag, D-085; READONLY_UI_01): the board's own
// Toolbar at its three forms with the page's folder, ledger and state chip, read-only and editing ("⋯" open at a third,
// holding Edit); the chip alone at rest, hovered, focused, pressed, opening for editing, editing, and held by another
// computer with its menu open; Edit and Stop editing as a button and as a row of "⋯", loading too; the refusal's toast;
// and what read-only pauses: the cards (the flag too), the container, Send, the "⋯" menu's Lock and Archive rows. Shown
// only with the flag on (it is off by default), so the gallery is as it was without it. Names and times are examples.
import { mount } from 'svelte';
import { READ_ONLY_PERSON } from '#actions';
import { chromeState, type ChromeState, FULL_MIN, HALF_MIN, type HeaderTier, SendButton, Toolbar, ToolbarMenu } from '../board/chrome/index.ts';
import EditButton from '../shell/EditButton.svelte';
import EditChip from '../shell/EditChip.svelte';
import type { FolderInfo } from '../shell/page-io.ts';
import Toast from '../shell/Toast.svelte';
import * as editingWords from '../shell/words/editing.ts';
import { chromeSample } from './chrome-sample.ts';
import { el, group } from './dom.ts';
import type { Fixture } from './fixture.ts';
import { pausedBoard } from './lock-section.ts';

const none = () => undefined;
type Editing = Pick<FolderInfo, 'readOnly' | 'editing'>;
const FOLDER = { path: '/home/example/projects/atlas', name: '~/projects/atlas' };
const LEDGER: Pick<FolderInfo, 'ledger' | 'ledgers' | 'boards'> = { ledger: 'main', ledgers: [{ name: 'main', boards: 7, keptOutOfGit: false }], boards: 7 };
const READ_ONLY: Editing = { readOnly: true };
const EDITING: Editing = { editing: { here: true } };
/** Another computer edits, since a time today (the example's clock: 09:12 on the day the gallery is drawn). */
const since = (): string => { const t = new Date(); t.setHours(9, 12, 0, 0); return t.toISOString(); };
const HELD = (): Editing => ({ readOnly: true, editing: { host: 'studio-example', since: since() } });
const WIDTH: Record<HeaderTier, number> = { full: 1470, half: 735, third: 490 };
const NAME = 'Where the atlas goes from here';

const start = chromeState();
const facts = (readOnly: boolean): ChromeState => ({
  ...start, title: NAME, boardId: 'atlas', boards: [{ board: 'atlas', title: NAME, seq: 12 }] as ChromeState['boards'],
  version: 12, versions: [] as ChromeState['versions'], versionView: true, zoom: 64, counts: { ...start.counts, open: 9 }, readOnly,
});

function bar(fx: Fixture, form: HeaderTier, editing: Editing, menuOpen = false): HTMLElement {
  const frame = el('div', 'g-header');
  frame.style.width = `${WIDTH[form]}px`;
  if (menuOpen) frame.dataset.open = form;
  mount(Toolbar, {
    context: chromeSample({ chip: FOLDER, ledger: LEDGER, editing, chat: true }, { readOnly: !!editing.readOnly }),
    target: frame,
    props: {
      onboard: none, onversion: () => Promise.resolve(), ongo: none, onopen: none, oncommand: none, onhide: none,
      onsend: () => Promise.resolve(null), onrevoke: () => Promise.resolve(), onflagged: none, onarchive: none, onlock: none,
      placement: 'gallery', form, facts: facts(!!editing.readOnly), holders: fx.boardAgents, ...(menuOpen && { menuOpen: true }),
    },
  });
  return frame;
}

let samples = 0;
const uid = (what: string) => `g-editing-${what}-${(samples += 1)}`;

/** The chip alone on the bar's colour; with `open`, its menu shown under it. */
function chip(editing: Editing, o: { look?: 'hover' | 'focus' | 'pressed'; busy?: 'edit' | 'stop'; open?: boolean } = {}): HTMLElement {
  const strip = el('div', 'g-toolbar');
  if (o.open) strip.toggleAttribute('data-menu-open', true);
  mount(EditChip, { target: strip, props: { id: uid('chip'), folder: editing, busy: o.busy ?? null, open: o.open ?? false, ...(o.look && { look: o.look }) } });
  return strip;
}

/** Edit or Stop editing: the button at full, or the row of "⋯" (in a menu's box). */
function button(editing: Editing, o: { look?: 'hover' | 'focus' | 'pressed'; busy?: 'edit' | 'stop'; row?: boolean } = {}): HTMLElement {
  const strip = el('div', o.row ? 'vb-menu-list g-editing-row' : 'g-toolbar');
  mount(EditButton, { target: strip, props: { id: uid('edit'), folder: editing, busy: o.busy ?? null, ...(o.look && { look: o.look }), ...(o.row && { choose: (run: () => void) => run() }) } });
  return strip;
}

/** The "⋯" menu on a read-only ledger: Lock board… and Archive board… off, saying why. */
function menu(): HTMLElement {
  const host = el('div', 'g-toolbar g-archive-menu');
  host.toggleAttribute('data-menu-open', true);
  mount(ToolbarMenu, { target: host, context: chromeSample({ folder: FOLDER }, { readOnly: true, version: 12 }), props: { onhide: none, onlock: none, onarchive: none, open: true, placement: 'gallery' } });
  return host;
}

function send(): HTMLElement {
  const host = el('div', 'g-toolbar');
  mount(SendButton, { target: host, props: { id: uid('send'), paused: READ_ONLY_PERSON, unsent: true } });
  return host;
}

/** The refusal, as the page's toast says it. */
function refused(): HTMLElement {
  const host = el('div', 'g-toolbar');
  mount(Toast, { target: host, props: { placement: 'gallery', toast: { text: editingWords.editRefused('studio-example', '09:12'), tone: 'error', seq: 1 } } });
  return host;
}

export function editingSection(fx: Fixture): HTMLElement {
  const box = el('section', 'g-section');
  box.dataset.feature = 'readOnlyStart';
  box.setAttribute('aria-labelledby', 'feature-readOnlyStart');
  const heading = el('h2', 'g-title', 'Read-only and Edit');
  heading.id = 'feature-readOnlyStart';
  const meta = el('p', 'g-meta');
  meta.append(el('code', undefined, 'EditChip · EditButton · header-tier · paused'), ' · feature flag readOnlyStart, off by default · on with ?flags=readOnlyStart');
  const [frame, cards] = pausedBoard(fx, { ...fx.marks.state, readOnly: true }, 'A read-only ledger\'s cards');
  box.append(heading,
    el('p', 'g-desc', `A ledger opens read-only: nothing is written until the person presses Edit, which opens it for changes here unless another computer is editing it. The header always says which, at every width; every control that would write is paused, saying "${READ_ONLY_PERSON}".`),
    meta,
    group('Full, read-only', `${FULL_MIN}px and up: the state after the path, then Edit (its pencil alone under 1500px; from 1400px of bar, else in the chip's menu), then Locked when the board is locked.`, bar(fx, 'full', READ_ONLY)),
    group('Full, editing', 'This board server holds the ledger: Editing, with Stop editing beside it.', bar(fx, 'full', EDITING)),
    group('Half', `From ${HALF_MIN}px: the state keeps its word while there is room; Edit is a row of "⋯".`, bar(fx, 'half', READ_ONLY)),
    group('A third', `Under ${HALF_MIN}px: the state's icon stays in the bar, never in "⋯" (its word for screen readers); Edit is a row of "⋯".`, bar(fx, 'third', READ_ONLY, true)),
    group('The chip', 'At rest, hovered, focused and pressed. Its tooltip and name say the whole state; a press opens its menu.',
      chip(READ_ONLY), chip(READ_ONLY, { look: 'hover' }), chip(READ_ONLY, { look: 'focus' }), chip(READ_ONLY, { look: 'pressed' })),
    group('Opening for editing', 'While the server takes the ledger: a spinner, the words, aria-busy; nothing more can be pressed.', chip(READ_ONLY, { busy: 'edit' })),
    group('Editing', 'The pencil in the accent, the ring in the accent\'s line.', chip(EDITING), chip(EDITING, { busy: 'stop' })),
    group('Held by another computer', 'Its menu says who edits and since when, then Edit, which checks again when pressed.', chip(HELD(), { open: true })),
    group('Edit and Stop editing', 'The button at full: at rest, hovered, focused, pressed, loading; then Stop editing.',
      button(READ_ONLY), button(READ_ONLY, { look: 'hover' }), button(READ_ONLY, { look: 'focus' }), button(READ_ONLY, { look: 'pressed' }),
      button(READ_ONLY, { busy: 'edit' }), button(EDITING)),
    group('The row of "⋯"', 'At half and a third: Edit, loading, and Stop editing.', button(READ_ONLY, { row: true }), button(READ_ONLY, { row: true, busy: 'edit' }), button(EDITING, { row: true })),
    group('Edit refused', 'Another computer holds the ledger: the toast says who and since when, and the ledger stays read-only.', refused()),
    group('"⋯" on a read-only ledger', 'Lock board and Archive board are off, their tooltip the reason.', menu()),
    group('A read-only ledger\'s container', 'Paused as on a locked board: in place, quiet, aria-disabled; a press says why.', frame!),
    group('A read-only ledger\'s cards', 'The review buttons, the size control, the note pin and the flag too (read-only writes no flag) are paused.', cards!),
    group('Send to agent', 'Paused, with the reason as its title.', send()));
  return box;
}
