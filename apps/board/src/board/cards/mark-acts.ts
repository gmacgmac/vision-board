// What a press on a node's mark does (nodeEdges flag; loaded after the board's first draw, or on the first press, by
// mark-flow.ts, which hears the presses): one menu or box open at a time, the node's menus (mark-menus.ts) and boxes
// (mark-boxes.ts), Tick and Cross through the item acts with their moments, and the tips over the marks
// (mark-tips.ts). mark-flow.ts says what each mark does; this is how. Browser only.
import { MARK_MOMENT_WORDS, POPOVER_CLOSE } from '#ui';
import type { MarkFlowDeps } from './mark-flow.ts';
import type { MarkMenu, MarkMenuName } from './mark-menus.ts';
import { showMarkMenu } from './mark-menus.ts';
import type { MarkSide } from './mark-place.ts';
import { stageBoxOf } from './mark-place.ts';
import type { MarkBox, MarkBoxName } from './mark-boxes.ts';
import { openMarkBox } from './mark-boxes.ts';
import { createMarkTips } from './mark-tips.ts';

/** A write shows it is on its way only past this, so a quick one never flickers (DESIGN_01). */
export const SAVING_MS = 150;

export interface MarkActs {
  press(id: string, mark: string, el: HTMLElement): void;
  /** The number's menu, under the number (held, or the menu key on it). */
  numberMenu(id: string): void;
  /** The node's actions, at client point `x`, `y` on it. */
  actions(id: string, x: number, y: number): void;
  history(id: string): void;
  /** A menu is open on node `id` now (the browser's own menu event after the menu key, or after a long press, opens
   *  no second one). */
  showing(id: string): boolean;
  place(): void;
  close(): boolean;
  destroy(): void;
}

type Open = { id: string; menu: MarkMenu; box?: undefined } | { id: string; box: MarkBox; menu?: undefined };
type Anchor = () => { x: number; y: number; w: number; h: number } | null;

export function createMarkActs(d: MarkFlowDeps): MarkActs {
  const tips = createMarkTips(d.stage);
  let open: Open | null = null;

  const markOf = (id: string, mark: string): HTMLElement | null =>
    d.card(id)?.querySelector<HTMLElement>(`[data-mark="${mark}"]`) ?? null;
  /** Where mark `mark` of node `id` is now, or null once it has gone. */
  const anchorOf = (id: string, mark: string): Anchor => () => {
    const el = markOf(id, mark);
    return el?.isConnected && el.getClientRects().length ? stageBoxOf(el, d.stage) : null;
  };
  /** A point on node `id` (`fx`, `fy`: its share of the node's width and height), so it moves and scales with it. */
  const pointOn = (id: string, fx: number, fy: number): Anchor => () => {
    const card = d.card(id);
    if (!card?.isConnected || !card.getClientRects().length) return null;
    const r = stageBoxOf(card, d.stage);
    return { x: r.x + fx * r.w, y: r.y + fy * r.h, w: 0, h: 0 };
  };

  function close(): boolean {
    const was = open;
    open = null;
    was?.menu?.close(false);
    was?.box?.close(false);
    return was !== null;
  }

  function showMenu(id: string, name: MarkMenuName, opener: HTMLElement | null, side: MarkSide, anchor: Anchor) {
    const [node, state] = [d.node(id), d.state(id)];
    close();
    if (!node || !state) return;
    let menu: MarkMenu | undefined;
    menu = showMarkMenu(d.stage, {
      name, node, state, prefix: d.prefix, opener, anchor, side,
      act: (a) => run(id, a),
      closed: () => { if (open?.menu && open.menu === menu) open = null; },
    });
    open = { id, menu };
  }

  function toggleBox(id: string, name: MarkBoxName, opener: HTMLElement | null) {
    const card = d.card(id);
    const same = open?.box?.name === name && open.id === id;
    close();
    if (same || !card) return;
    let box: MarkBox | null = null;
    box = openMarkBox(card, name, opener, opener && !opener.hidden ? opener : card, () => { if (open?.box && open.box === box) open = null; });
    if (box) open = { id, box };
  }

  function actions(id: string, x: number, y: number) {
    const card = d.card(id);
    if (!card) return;
    const r = card.getBoundingClientRect();
    if (!card.contains(document.activeElement)) card.focus({ preventScroll: true });
    showMenu(id, 'actions', null, 'point', pointOn(id, r.width ? (x - r.left) / r.width : 0, r.height ? (y - r.top) / r.height : 0));
  }

  /** Tick or Cross on node `id`, from the disc's picker, a switch's half or the actions: the item act, its moments. */
  async function answer(id: string, action: 'ack' | 'drop') {
    const mark = () => markOf(id, 'answer') ?? markOf(id, action === 'ack' ? 'tick' : 'cross');
    const el = mark();
    if (el) tips.pressed(el);
    const why = d.paused('answer');
    if (why) return void (el && tips.locked(el, why));
    const saving = window.setTimeout(() => mark()?.toggleAttribute('data-saving', true), SAVING_MS);
    const done = await d.act(id, action);
    clearTimeout(saving);
    mark()?.removeAttribute('data-saving');
    const now = mark();
    if (done === false && now) tips.failed(now, action === 'ack' ? MARK_MOMENT_WORDS.tickNotSaved : MARK_MOMENT_WORDS.crossNotSaved);
  }

  function bookmark(id: string, el: HTMLElement | null) {
    const why = d.paused('bookmark');
    if (why) return void (el && tips.locked(el, why));
    void d.bookmark(id);
  }

  /** A row of a node's menu, once the menu has closed. */
  function run(id: string, act: string) {
    if (act === 'ack' || act === 'drop') return void answer(id, act);
    if (act === 'bookmark' || act === 'unbookmark') return bookmark(id, markOf(id, 'number'));
    if (act === 'history') return toggleBox(id, 'history', markOf(id, 'badge'));
    if (act === 'unpin') return d.unpin(id);
    if (act === 'comment' || act === 'later' || act === 'reopen') void d.act(id, act);
  }

  function press(id: string, mark: string, el: HTMLElement) {
    tips.pressed(el); // the next press takes off what the last one left (a failure), and tries again
    if (mark === 'number') return bookmark(id, el);
    if (mark === 'answer') {
      if (el.dataset.proposed) return toggleBox(id, 'proposal', el);
      const why = d.paused('answer');
      if (why) { close(); return tips.locked(el, why); }
      if (open?.menu?.name === 'answer' && open.id === id) return void close();
      return showMenu(id, 'answer', el, 'right', anchorOf(id, 'answer'));
    }
    if (mark === 'tick' || mark === 'cross') return void answer(id, mark === 'tick' ? 'ack' : 'drop');
    if (mark === 'badge') return toggleBox(id, 'history', el);
    if (mark === 'proposal') return toggleBox(id, 'proposal', el);
    // The conversation is a box beside the node too: one box at a time.
    if (mark === 'notes') { close(); void d.act(id, 'comment'); }
  }

  /** A history row that took the person to a note asks its box to close (history-flow.ts, `POPOVER_CLOSE`). */
  const onBoxClose = (e: Event) => {
    if (!open?.box || (e.target as HTMLElement).dataset.id !== open.id || (e as CustomEvent<string>).detail !== open.box.name) return;
    const box = open.box;
    open = null;
    box.close(true);
  };
  d.stage.addEventListener(POPOVER_CLOSE, onBoxClose);

  return {
    press, actions,
    numberMenu: (id) => showMenu(id, 'number', null, 'below', anchorOf(id, 'number')),
    history: (id) => toggleBox(id, 'history', markOf(id, 'badge')),
    showing: (id) => !!open?.menu && open.id === id,
    close,
    place() {
      if (open?.box && !open.box.el.isConnected) close();
      open?.menu?.place();
      open?.box?.place();
      tips.place();
    },
    destroy() {
      close();
      tips.destroy();
      d.stage.removeEventListener(POPOVER_CLOSE, onBoxClose);
    },
  };
}
