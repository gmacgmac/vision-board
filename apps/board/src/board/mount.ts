// The board in any host (principles § The board is a plugin; host.ts): `mount(root, host)` builds
// the board's elements inside `root` and gives back nclite's view (`unmount`, `pageChip`, `reveal`,
// and `unsaved` and `leave`, which a host asks before it unmounts: `unmount` itself never asks),
// plus what a host shows of the board: its status (status.ts). `root` holds the whole board: its header,
// strips, dialogs and search (chrome/) round the stage the cards draw in. It adds no element outside
// `root`, every id it sets carries the mount's prefix (mount-ids.ts), a modal's keys stop at the root, and
// nothing outlives `unmount`: every listener on the document or the window goes, the image view goes,
// and `root` is emptied and given back as it was. Each mount has its own calls (io.ts), status and
// controller, so two boards on one page work apart.
import type { Ref } from '#actions';
import { boardChip } from '#actions';
import { mountChrome } from './chrome/index.ts';
import type { BoardHost, BoardPage, BoardView } from './host.ts';
import { memoryStore } from './host.ts';
import { createIo } from './io.ts';
import type { Board, BoardElements } from './controller.ts';
import { createBoard } from './controller.ts';
import { takeIdPrefix } from './mount-ids.ts';
import type { Status } from './status.ts';
import { createStatus, initialStatus } from './status.ts';
import { finishAll } from './teardown.ts';
import * as boardWords from './words/board.ts';

/** The class a host's root takes: the board's scope and its `@container vb-board` (D-061). */
export const BOARD_ROOT = 'vb-board';
const SVG = 'http://www.w3.org/2000/svg';
const isCount = (n: unknown): n is number => typeof n === 'number' && Number.isSafeInteger(n) && n >= 0;

/** What the board's controls call (chrome/), and the standalone page's test door (`rebuild`, `idle`,
 *  work.ts). No chat goes through it: that is `BoardView` and `BoardChat`. */
export type BoardControls = Pick<Board, 'switchTo' | 'showVersion' | 'goToContainer' | 'command' | 'toggleHide' | 'access' | 'proposals' | 'boardEdit' | 'nextFlagged' | 'go' | 'rebuild' | 'idle'>;

/** What `mount` gives back: the view, and what a host draws around the board. */
export interface MountedBoard extends BoardView {
  /** What the controls call: switching boards, versions, view commands, the toolbar's acts. */
  readonly board: BoardControls;
  /** What a host shows of the board (status.ts): read `now`, hear each change with `on`. */
  readonly status: Status;
  /** Send to agent, through the host's chat (`BoardChat.send`): null once done or held, else the problem's words. */
  send(): Promise<string | null>;
}

/** The board's layers inside the stage, with no ids. */
function build(stage: HTMLElement): BoardElements & { message: HTMLElement } {
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
  stage.append(world, message);
  return { stage, world, regions, cards, wires, wiresTop, marks, message };
}

/** Mount the board in `root`, an element the host gives (empty, or holding only what it drew). */
export function mount(root: HTMLElement, host: BoardHost): MountedBoard {
  const added = root.classList.contains(BOARD_ROOT) ? [] : [BOARD_ROOT];
  root.classList.add(...added);
  const status = createStatus();
  const ids = takeIdPrefix();
  const store = host.store ?? memoryStore();
  let board!: Board;
  /** `unmount` ran: whatever a host keeps calling on the view does nothing. */
  let gone = false;
  /** Send to agent. A host's `send` that rejects (a `fetch` that failed) is Send's error state, as words it answers are.
   *  The record goes to the board the Send was pressed on, with what the host says went (`BoardChat.send`). */
  const send = async (): Promise<string | null> => {
    if (gone) return null;
    const id = board.id();
    try { return (await host.chat.send((acks) => board.send(id, acks))) ?? null; } catch (err) {
      console.error(err);
      return boardWords.theChatCouldNotSend;
    }
  };
  const chrome = mountChrome(root, host, { status, ids: ids.prefix, store, board: () => board, send });
  const stage = chrome.stage;
  // A modal of the board's (a dialog, the zoomed image) closes on the browser's own Esc, which a
  // `preventDefault` would stop: so a key pressed in one goes no further than the root, and a host never
  // acts on it as well.
  const keepModalKeys = (e: KeyboardEvent) => { if ((e.target as Element).closest('dialog')) e.stopPropagation(); };
  root.addEventListener('keydown', keepModalKeys);
  const io = createIo(host.api, host.page?.person);

  // A press the board handles itself (a lasso, a Cmd or Ctrl pan) stops the browser moving focus, so
  // a key would still go to whatever had it before, a host's button (keys.ts: keys stay inside the root).
  const takeFocus = () => { if (!stage.contains(document.activeElement)) stage.focus({ preventScroll: true }); };
  stage.addEventListener('pointerup', takeFocus);

  let els = build(stage);
  /** With no page of its own, the board starts again in place. */
  const page: BoardPage = host.page ?? { wanted: () => [], opened() {}, restart: () => queueMicrotask(restart) };
  const say = (text: string | null) => {
    els.message.textContent = text ?? '';
    els.message.hidden = text === null;
  };
  const start = () => {
    board = createBoard(els, { host, io, status, say, page, ids: ids.prefix, store });
    void board.boot();
  };
  const stop = () => finishAll([board.destroy, () => els.world.remove(), () => els.message.remove()]);
  function restart() {
    stop();
    status.set(initialStatus());
    els = build(stage);
    start();
  }
  start();

  /** Bring into view, on the board open now, the cards, the card `n` or the note `seq` (`reveal`): each read only when it
   *  is of its kind (a list of whole numbers, a whole number), the rest of the ref ignored. */
  function show({ n, seq, cards }: Ref) {
    if (Array.isArray(cards) && cards.every(isCount)) return board.zoomToCards(cards as readonly number[]);
    if (isCount(n)) return board.revealCard(n);
    if (isCount(seq)) board.revealNote(seq);
  }

  return {
    get board() { return board; },
    status,
    send,
    unsaved: () => !gone && board.unsaved(),
    leave: () => (gone ? Promise.resolve(true) : board.leave()),
    pageChip() {
      if (gone) return null;
      const s = board.ledger();
      const id = board.id();
      const chip = s && id ? boardChip(s, id) : undefined;
      return chip && !('refused' in chip) ? chip : null;
    },
    reveal(ref) {
      if (gone) return;
      // Another board opens first, and may ask (a note's unsaved words, `Board.switchTo`): what `ref`
      // names is shown only once it has opened; Cancel shows nothing. One the ledger does not hold yet
      // opens when its line arrives (`Board.jump`).
      const to = typeof ref.board === 'string' ? ref.board : undefined;
      if (!to || to === board.id()) return show(ref);
      void (board.ledger()?.boards.has(to) ? board.switchTo(to) : board.jump(to)).then((ok) => { if (ok && board.id() === to) show(ref); });
    },
    unmount() {
      gone = true;
      finishAll([stop, ids.release, () => stage.removeEventListener('pointerup', takeFocus), () => root.removeEventListener('keydown', keepModalKeys),
        chrome.unmount, () => root.replaceChildren(), () => root.classList.remove(...added)]);
    },
  };
}
