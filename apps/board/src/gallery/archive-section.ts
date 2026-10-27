// Gallery entry for archiving a board (archiveBoard flag, N39 rulings 5-6, api.md 135-137): the "⋯"
// menu with Archive board…, its confirm (the shell's confirm dialog, drawn in the page flow with
// archiveAsk's words), and the board's own ArchivedList in each state: boards to restore, one on its
// way, a refusal kept, and none left. Names and dates are made up. Shown only with the flag on, so
// ?flags=-archiveBoard draws the gallery as it was.
import { mount } from 'svelte';
import type { ArchivedBoard } from '#actions';
import ArchivedList from '../shell/ArchivedList.svelte';
import ToolbarMenu from '../shell/ToolbarMenu.svelte';
import { archiveAsk } from '../board/boards/index.ts';
import { el, group } from './dom.ts';

const BOARDS: ArchivedBoard[] = [
  { board: 'multi-bot', title: 'Multi-bot', created: '2026-10-11T09:00:00Z', updated: '2026-10-11T17:30:00Z', archived: 410 },
  { board: 'pricing-2025', title: 'Pricing review 2025', created: '2025-11-03T10:00:00Z', updated: '2025-12-01T15:00:00Z', archived: 120 },
];
const REFUSED = 'board: "multi-bot" isn\'t archived';
/** Today, fixed, so the samples' days read the same every year. */
const NOW = new Date('2026-10-12T09:00:00Z');
const none = () => undefined;

let samples = 0;
function list(boards: readonly ArchivedBoard[], opts: { busy?: string; problem?: string } = {}): HTMLElement {
  const host = el('div', 'vb-dialog g-archived');
  mount(ArchivedList, { target: host, props: { boards, uid: `g-archived-${(samples += 1)}`, now: NOW, onrestore: none, onclose: none, ...opts } });
  return host;
}

/** The "⋯" menu, open, without the board's ids. */
function menu(): HTMLElement {
  const host = el('div', 'g-toolbar g-archive-menu');
  host.toggleAttribute('data-menu-open', true);
  mount(ToolbarMenu, { target: host, props: { theme: 'system', ontheme: none, onhide: none, onarchive: none, open: true, placement: 'gallery' } });
  return host;
}

/** The confirm, as the shell's dialog shows it: Cancel first, so Enter never archives. */
function confirm(): HTMLElement {
  const [heading, body, ok] = archiveAsk(BOARDS[0]!.title, BOARDS[0]!, NOW);
  const host = el('div', 'g-confirm vb-dialog');
  const actions = el('div', 'vb-dialog-actions');
  const button = (text: string, primary = false) => {
    const b = el('button', primary ? 'vb-btn vb-btn-primary' : 'vb-btn', text);
    b.type = 'button';
    return b;
  };
  actions.append(button('Cancel'), button(ok, true));
  host.append(el('p', 'g-confirm-head', heading), el('p', 'vb-dialog-item', body), actions);
  return host;
}

export function archiveSection(): HTMLElement {
  const box = el('section', 'g-section');
  box.dataset.feature = 'archiveBoard';
  box.setAttribute('aria-labelledby', 'feature-archiveBoard');
  const heading = el('h2', 'g-title', 'Archive a board');
  heading.id = 'feature-archiveBoard';
  const meta = el('p', 'g-meta');
  meta.append(el('code', undefined, 'archive · restore · ArchivedDialog · ArchivedList'), ' · feature flag archiveBoard, on by default · off with ?flags=-archiveBoard');
  box.append(heading,
    el('p', 'g-desc', 'The person hides a board from every agent, as if it never existed, and from the board picker; the ledger keeps every line, and the board comes back with Restore.'),
    meta,
    group('Archive board…', 'In the "⋯" menu; it acts on the open board. Off while no board is open or a past version shows.', menu()),
    group('The confirm', 'Its name and dates, what archiving does and how to undo it. Cancel is focused first. Archived, the next board opens, or with none left the empty board.', confirm()),
    group('Archived boards', 'The board picker ends with Archived (N)… while any board is archived: each board with when it was last updated and Restore, which brings it back and opens it.', list(BOARDS)),
    group('Restoring', 'One Restore on its way: its button says so, and the others wait.', list(BOARDS, { busy: 'multi-bot' })),
    group('Refused', 'The server refused: the words stay under the list, which is kept.', list(BOARDS, { problem: REFUSED })),
    group('None left', 'The last one was restored meanwhile.', list([])));
  return box;
}
