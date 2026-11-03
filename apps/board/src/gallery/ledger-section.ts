// Gallery entry for the ledger chip and New ledger (ledgerFolders flag, D-084; LEDGER_UI_01): the board's own Toolbar
// at its three forms with the page's folder and ledger (a long ledger name), "⋯" open at full (New ledger… after Open
// folder…) and at a third (the Ledger row under the Folder row); the chip alone at rest, hovered, focused, pressed,
// opening another ledger and with one ledger; its list as the browser lists it; and the New ledger dialog's form,
// idle, with a name the rule refuses, one the folder has already, refused by the server and creating. Shown only with
// the flag on (it is off by default), so the gallery is as it was without it. Names and paths are examples.
import { mount } from 'svelte';
import { Toolbar } from '../board/chrome/index.ts';
import { chromeState, type ChromeState, FULL_MIN, HALF_MIN, type HeaderTier } from '../board/chrome/index.ts';
import LedgerForm from '../shell/LedgerForm.svelte';
import LedgerPart from '../shell/LedgerPart.svelte';
import type { FolderInfo } from '../shell/page-io.ts';
import * as chromeCommonWords from '../board/words/chrome-common.ts';
import * as ledgerWords from '../shell/words/ledgers.ts';
import { chromeSample } from './chrome-sample.ts';
import { el, group } from './dom.ts';
import type { Fixture } from './fixture.ts';

const none = () => undefined;
const FOLDER = { path: '/home/example/projects/atlas', name: '~/projects/atlas' };
type Ledgers = Pick<FolderInfo, 'ledger' | 'ledgers' | 'boards'>;
const LEDGERS: NonNullable<FolderInfo['ledgers']> = [
  { name: 'main', boards: 7, keptOutOfGit: false },
  { name: 'customer-research-interviews', boards: 3, keptOutOfGit: false },
  { name: 'planning-scratch', boards: 1, keptOutOfGit: true },
];
const OPEN: Ledgers = { ledger: 'customer-research-interviews', ledgers: LEDGERS, boards: 3 };
const ONE: Ledgers = { ledger: 'main', ledgers: [{ name: 'main', boards: 2, keptOutOfGit: false }], boards: 2 };
const WIDTH: Record<HeaderTier, number> = { full: 1470, half: 735, third: 490 };
const NAME = 'Where the atlas goes from here';

const start = chromeState();
const facts = (): ChromeState => ({
  ...start, title: NAME, boardId: 'atlas', boards: [{ board: 'atlas', title: NAME, seq: 12 }] as ChromeState['boards'],
  version: 12, versions: [] as ChromeState['versions'], versionView: true, zoom: 64, counts: { ...start.counts, open: 9 },
});

function bar(fx: Fixture, form: HeaderTier, menuOpen = false): HTMLElement {
  const frame = el('div', 'g-header');
  frame.style.width = `${WIDTH[form]}px`;
  if (menuOpen) frame.dataset.open = form;
  mount(Toolbar, {
    context: chromeSample({ chip: FOLDER, ledger: OPEN, chat: true }),
    target: frame,
    props: {
      onboard: none, onversion: () => Promise.resolve(), ongo: none, onopen: none, oncommand: none, onhide: none,
      onsend: () => Promise.resolve(null), onrevoke: () => Promise.resolve(), onflagged: none, onarchive: none, onlock: none,
      placement: 'gallery', form, facts: facts(), holders: fx.boardAgents, ...(menuOpen && { menuOpen: true }),
    },
  });
  return frame;
}

let samples = 0;
const uid = (what: string) => `g-ledger-${what}-${(samples += 1)}`;

/** The chip alone, in the path's look on the bar's colour. */
function chip(folder: Ledgers, o: { look?: 'hover' | 'focus' | 'pressed'; opening?: string } = {}): HTMLElement {
  const strip = el('div', 'g-toolbar');
  const path = el('div', 'vb-path');
  strip.append(path);
  mount(LedgerPart, { target: path, props: { id: uid('chip'), folder, opening: o.opening ?? null, ...(o.look && { look: o.look }) } });
  return strip;
}

/** The list the chip's select opens, as a list box: the browser draws the real one over the chip. */
function list(): HTMLElement {
  const box = el('select', 'g-ledger-list');
  box.size = LEDGERS.length + 2;
  box.setAttribute('aria-label', chromeCommonWords.ledger);
  for (const l of LEDGERS) box.append(new Option(ledgerWords.ledgerOption(l.name, l.boards, l.keptOutOfGit), l.name, false, l.name === OPEN.ledger));
  box.append(el('hr'), new Option(ledgerWords.newLedger, ':new'));
  return box;
}

/** The New ledger dialog's form, in the dialog's box in the page flow. */
function dialog(o: { name?: string; problem?: string; busy?: boolean; keepOut?: boolean } = {}): HTMLElement {
  const box = el('div', 'vb-dialog vb-ledger-dialog g-ledger-dialog');
  mount(LedgerForm, {
    target: box,
    props: { uid: uid('dialog'), name: o.name ?? '', keepOut: o.keepOut ?? false, taken: LEDGERS.map((l) => l.name), problem: o.problem ?? null, busy: o.busy ?? false, oncreate: none, oncancel: none },
  });
  return box;
}

/** As the server says it (server/words/server-folders.ts, the lock's words), with an example computer and time. */
const REFUSED = 'Another board server holds this ledger: computer "studio-example", process 4120, port 4470, running since 09:12. Stop that server first.';

export function ledgerSection(fx: Fixture): HTMLElement {
  const box = el('section', 'g-section');
  box.dataset.feature = 'ledgerFolders';
  box.setAttribute('aria-labelledby', 'feature-ledgerFolders');
  const heading = el('h2', 'g-title', 'Ledgers');
  heading.id = 'feature-ledgerFolders';
  const meta = el('p', 'g-meta');
  meta.append(el('code', undefined, 'LedgerPart · LedgerRow · LedgerForm · header-tier'), ' · feature flag ledgerFolders, on by default · off with ?flags=-ledgerFolders');
  box.append(heading,
    el('p', 'g-desc', 'A folder holds several ledgers, each with its own boards. The header\'s path reads folder / ledger / board / version: the ledger\'s list switches to another ledger, which the page reloads onto, and ends with New ledger….'),
    meta,
    group('Full', `${FULL_MIN}px and up: the ledger after the folder, with its icon, its name and a chevron; it keeps its room while the folder and the board give theirs.`, bar(fx, 'full')),
    group('Half', `From ${HALF_MIN}px: the folder as its icon, the ledger with its icon and its name, cut with "…" before the board's.`, bar(fx, 'half')),
    group('A third', `Under ${HALF_MIN}px: the ledger is a row of "⋯", under the folder's.`, bar(fx, 'third', true)),
    group('"⋯" at full and half', 'New ledger… follows Open folder…; at a third the Ledger row stands for it.', bar(fx, 'full', true)),
    group('The chip', 'At rest, hovered, focused and pressed: the path\'s looks. A long name is cut with "…"; the whole name is in its tooltip.',
      chip(OPEN), chip(OPEN, { look: 'hover' }), chip(OPEN, { look: 'focus' }), chip(OPEN, { look: 'pressed' })),
    group('Opening another ledger', 'The face says which, and the list is shut, until the page reloads onto it. A refusal is a toast, and the open ledger stays.', chip(OPEN, { opening: 'planning-scratch' })),
    group('One ledger', 'The list still opens: the one ledger, then New ledger….', chip(ONE)),
    group('The list', 'Each ledger by name with its boards, the open one chosen, one kept out of git saying so, then New ledger….', list()),
    group('New ledger', 'Opens fresh, the name empty and "Keep out of git" off; the name is shown as an id as it is typed.', dialog()),
    group('A name the rule refuses', 'Checked as it is typed, by the same rule as the server\'s; Create sends nothing until it passes.', dialog({ name: 'images' })),
    group('A name the folder has', 'Choose it from the ledger list instead.', dialog({ name: 'main' })),
    group('Refused', 'The server\'s words stay in the dialog, and so does the name.', dialog({ name: 'roadmap-2027', keepOut: true, problem: REFUSED })),
    group('Creating', 'Create is busy; Esc, Cancel and the backdrop wait.', dialog({ name: 'roadmap-2027', busy: true })));
  return box;
}
