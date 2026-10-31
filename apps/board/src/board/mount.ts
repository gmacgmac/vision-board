// The board in any host (principles § The board is a plugin; host.ts): `mount(root, host)` builds
// the board's elements inside `root` and gives back nclite's view (`unmount`, `pageChip`, `reveal`,
// and `unsaved` and `leave`, which a host asks before it unmounts: `unmount` itself never asks),
// plus what a host draws around the board: its status (status.ts) and, until they move inside, the
// standalone page's toolbar and strips (`BoardControls`). It adds no element outside `root` but the
// zoomed image view (a modal dialog's top layer),
// no document id of its own (ids inside cards and frames carry the mount's prefix, mount-ids.ts), and
// nothing outlives `unmount`: every listener on the document or the window goes, the image view goes,
// and `root` is emptied and given back as it was. Each mount has its own calls (io.ts), status and
// controller, so two boards on one page work apart.
import { boardChip, numberOf } from '#actions';
import type { BoardHost, BoardPage, BoardView } from './host.ts';
import { createIo } from './io.ts';
import type { Board, BoardElements } from './controller.ts';
import { createBoard } from './controller.ts';
import { takeIdPrefix } from './mount-ids.ts';
import type { Status } from './status.ts';
import { createStatus, initialStatus } from './status.ts';
import * as boardWords from './words/board.ts';
import * as commonWords from './words/common.ts';

/** The class a host's root takes: the board's scope and its `@container vb-board` (D-061). */
export const BOARD_ROOT = 'vb-board';
/** The classes the root takes as the board's stage. */
const ROOT_CLASSES = [BOARD_ROOT, 'vb-stage', 'vb-ground'];
const SVG = 'http://www.w3.org/2000/svg';

/** What the standalone page's own toolbar and strips call, until they move inside `mount`; and its
 *  test door (`rebuild`, `idle`, work.ts). No chat goes through it: that is `BoardView` and `BoardChat`. */
export type BoardControls = Pick<Board, 'switchTo' | 'showVersion' | 'goToContainer' | 'command' | 'toggleHide' | 'access' | 'proposals' | 'boardEdit' | 'nextFlagged' | 'go' | 'rebuild' | 'idle'>;

/** What `mount` gives back: the view, and what a host draws around the board. */
export interface MountedBoard extends BoardView {
  /** The board's controls: switching boards, versions, view commands, the toolbar's acts. */
  readonly board: BoardControls;
  /** What a host shows of the board (status.ts): read `now`, hear each change with `on`. */
  readonly status: Status;
  /** Send to agent, through the host's chat (`BoardChat.send`): null once done or held, else the problem's words. */
  send(): Promise<string | null>;
}

/** The board's layers inside `root`, as the standalone page drew them, with no ids. */
function build(root: HTMLElement): BoardElements & { message: HTMLElement } {
  const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls: string, attrs: Record<string, string> = {}) => {
    const e = document.createElement(tag);
    e.className = cls;
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
    return e;
  };
  const svg = (cls: string) => {
    const e = document.createElementNS(SVG, 'svg');
    e.setAttribute('class', cls);
    e.setAttribute('aria-hidden', 'true');
    return e;
  };
  const world = el('div', 'vb-world no-anim');
  const regions = el('div', 'vb-regions');
  const wires = svg('vb-wires');
  const cards = el('div', 'vb-cards', { role: 'list', 'aria-label': boardWords.itemsInNumberOrder });
  const wiresTop = svg('vb-wires vb-wires-top');
  // Markers for link labels with no room on their line (linkLabels flag, link-marks.ts).
  const marks = el('div', 'vb-link-marks', { role: 'group', 'aria-label': boardWords.linkLabels });
  marks.hidden = true;
  world.append(regions, wires, cards, wiresTop, marks);
  const message = el('div', 'vb-message', { role: 'status' });
  message.hidden = true;
  root.append(world, message);
  return { stage: root, world, regions, cards, wires, wiresTop, marks, message };
}

/** Mount the board in `root`, an element the host gives (empty, or holding only what it drew). */
export function mount(root: HTMLElement, host: BoardHost): MountedBoard {
  const added = ROOT_CLASSES.filter((c) => !root.classList.contains(c));
  root.classList.add(...added);
  const own = (['tabindex', 'aria-label'] as const).filter((a) => !root.hasAttribute(a));
  if (own.includes('tabindex')) root.tabIndex = -1;
  if (own.includes('aria-label')) root.setAttribute('aria-label', commonWords.board);
  const status = createStatus();
  const ids = takeIdPrefix();
  const io = createIo(host.api, host.page?.person);

  // A press the board handles itself (a lasso, a Cmd or Ctrl pan) stops the browser moving focus, so
  // a key would still go to whatever had it before, a host's button (keys.ts: keys stay inside the root).
  const takeFocus = () => { if (!root.contains(document.activeElement)) root.focus({ preventScroll: true }); };
  root.addEventListener('pointerup', takeFocus);

  let els = build(root);
  let board!: Board;
  /** With no page of its own, the board starts again in place. */
  const page: BoardPage = host.page ?? { wanted: () => [], opened() {}, restart: () => queueMicrotask(restart) };
  const say = (text: string | null) => {
    els.message.textContent = text ?? '';
    els.message.hidden = text === null;
  };
  const start = () => {
    board = createBoard(els, { host, io, status, say, page, ids: ids.prefix });
    void board.boot();
  };
  const stop = () => {
    board.destroy();
    els.world.remove();
    els.message.remove();
  };
  function restart() {
    stop();
    status.set(initialStatus());
    els = build(root);
    start();
  }
  start();

  /** Bring into view, on the board open now, the cards, the card `n` or the note `seq` (`reveal`). */
  function show({ n, seq, cards }: Parameters<BoardView['reveal']>[0]) {
    if (cards) return board.zoomToCards(cards);
    if (n !== undefined) return board.go.to(n);
    const s = board.ledger();
    const ask = seq === undefined ? undefined : s?.asks.get(seq);
    if (!s || !ask || seq === undefined || ask.region !== undefined) return; // a container's note: its board is enough
    const at = numberOf(s, ask.nodes?.[0] ?? ask.id);
    board.go.to(at);
    board.showNote(String(at), seq);
  }

  return {
    get board() { return board; },
    status,
    send: () => host.chat.send(() => board.send()),
    unsaved: () => board.unsaved(),
    leave: () => board.leave(),
    pageChip() {
      const s = board.ledger();
      const id = board.id();
      const chip = s && id ? boardChip(s, id) : undefined;
      return chip && !('refused' in chip) ? chip : null;
    },
    reveal(ref) {
      // Another board opens first, and may ask (a note's unsaved words, `Board.switchTo`): what `ref`
      // names is shown only once it has opened; Cancel shows nothing. One the ledger does not hold yet
      // opens when its line arrives (`Board.jump`).
      const to = ref.board;
      if (!to || to === board.id()) return show(ref);
      void (board.ledger()?.boards.has(to) ? board.switchTo(to) : board.jump(to)).then((ok) => { if (ok && board.id() === to) show(ref); });
    },
    unmount() {
      stop();
      ids.release();
      root.removeEventListener('pointerup', takeFocus);
      root.replaceChildren();
      root.classList.remove(...added);
      for (const a of own) root.removeAttribute(a);
    },
  };
}
