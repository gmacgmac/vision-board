// The pins of notes on groups of cards on the board page (groupNoteOnce flag, group-note-once task,
// maintainer ruling point 103): a note made on a selection of cards is drawn once, as one pin per
// group (`groupMarkers`) on the group's lowest-numbered card drawn (`groupAnchors`, `groupPinAt`; groups
// sharing that card spread over their other cards), in its own layer of
// the world above the cards, so it follows every pan and zoom with them and moves only on a relayout.
// It wears the card pin's look and states (node.css `.vb-note-pin`). Hovering or focusing it, and its
// bubble being open, ring each card of the group with a dashed line in the note's tone
// (`data-group-ring`, node-notes.css); never a box, so no unrelated card is marked. A press selects the
// group's cards and opens the note as a card's pin does (notes.ts). Only a pin whose words or place
// changed is written; a draw with the same state and layout does nothing.
import type { BoardState } from '../../../../packages/actions/src/index.ts';
import type { BoardLayout } from '../../../../packages/layout/src/index.ts';
import type { GroupMarker } from '../../../../packages/ui/src/index.ts';
import { groupAnchors, groupMarkers, groupPinAt, pauseControls } from '../../../../packages/ui/src/index.ts';

/** The pin of the group whose latest note is `seq`: what a note bubble opened from it points back at. */
export const groupPinOf = (seq: number): string => `.vb-group-pin[data-group-note="${seq}"]`;

export interface GroupPinDeps {
  world: HTMLElement;
  state(): BoardState;
  layout(): BoardLayout | null;
  card(id: string): HTMLElement | undefined;
  /** A press on a pin: select `cards` and open note `seq` beside card `anchor` (notes.ts). */
  open(cards: readonly string[], anchor: string, seq: number): void;
}

export interface GroupPins {
  /** Draw the pins for the state and layout as they are now; nothing when neither changed. */
  draw(): void;
  /** The bubble opened on note `seq`, or closed (undefined): its pin is expanded, its cards ringed. */
  mark(seq?: number): void;
  destroy(): void;
}

interface Pin { el: HTMLButtonElement; m: GroupMarker; anchor: string }

export function createGroupPins(d: GroupPinDeps): GroupPins {
  const layer = document.createElement('div');
  layer.className = 'vb-group-notes';
  layer.setAttribute('role', 'group');
  layer.setAttribute('aria-label', 'Notes on groups of cards');
  d.world.append(layer);
  const pins = new Map<string, Pin>();
  /** What the last draw was drawn from. */
  let seen: { s: BoardState | null; l: BoardLayout | null } = { s: null, l: null };
  /** The pins under the pointer and with focus (by group key), and the note whose bubble is open. */
  const near = { hover: '', focus: '' };
  let open: number | undefined;
  let ringed: string[] = [];

  function create(key: string): Pin {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'vb-note-pin vb-group-pin';
    el.setAttribute('aria-haspopup', 'dialog');
    el.setAttribute('aria-expanded', 'false');
    el.dataset.group = key;
    const at = (part: 'hover' | 'focus', on: boolean) => () => { near[part] = on ? key : near[part] === key ? '' : near[part]; ring(); };
    el.addEventListener('pointerenter', at('hover', true));
    el.addEventListener('pointerleave', at('hover', false));
    el.addEventListener('focus', at('focus', true));
    el.addEventListener('blur', at('focus', false));
    el.addEventListener('click', () => {
      const p = pins.get(key);
      if (p) d.open(p.m.cards.map(String), p.anchor, p.m.seq);
    });
    return { el, m: undefined!, anchor: '' };
  }

  /** Ring the cards of the pins near the pointer or focus and of the open note; unring the rest. */
  function ring() {
    const on = new Map<string, string>();
    for (const p of pins.values()) {
      if (p.m.key !== near.hover && p.m.key !== near.focus && p.m.seq !== open) continue;
      for (const n of p.m.cards) on.set(String(n), p.m.sent ? 'sent' : '');
    }
    for (const id of ringed) if (!on.has(id)) d.card(id)?.removeAttribute('data-group-ring');
    for (const [id, tone] of on) d.card(id)?.setAttribute('data-group-ring', tone);
    ringed = [...on.keys()];
  }

  function draw() {
    const s = d.state();
    const l = d.layout();
    if (s === seen.s && l === seen.l) return;
    seen = { s, l };
    const live = new Set<string>();
    let prev: Element | null = null;
    const markers = groupMarkers(s.items.values());
    const at = groupAnchors(markers, (n) => l?.nodes.has(String(n)) === true);
    markers.forEach((m, i) => {
      const p = pins.get(m.key) ?? create(m.key);
      pins.set(m.key, p);
      live.add(m.key);
      p.m = m;
      p.anchor = String(at[i]?.card ?? m.cards[0]);
      const box = at[i] && l?.nodes.get(p.anchor);
      place(p, box ? groupPinAt(box, at[i]!.slot) : undefined, s.locked === true);
      // Reading order is board order: a pin is moved only when it is out of place, so focus stays.
      const want: Element | null = prev ? prev.nextElementSibling : layer.firstElementChild;
      if (want !== p.el) layer.insertBefore(p.el, want);
      prev = p.el;
    });
    for (const [key, p] of pins) {
      if (live.has(key)) continue;
      p.el.remove();
      pins.delete(key);
    }
    ring();
  }

  /** Write one pin's place, number, state and name; `at` undefined: its cards are not drawn. */
  function place({ el, m }: Pin, at: { x: number; y: number } | undefined, locked: boolean) {
    el.hidden = at === undefined;
    if (at) el.style.translate = `${at.x}px ${at.y}px`;
    el.textContent = String(m.index);
    el.dataset.groupNote = String(m.seq);
    el.toggleAttribute('data-sent', m.sent);
    el.setAttribute('aria-label', m.label);
    el.setAttribute('aria-expanded', String(m.seq === open));
    // A locked board pauses the pin as it pauses a card's (paused.ts): a press says why (lock-flow.ts).
    pauseControls(layer, `[data-group="${m.key}"]`, locked);
  }

  return {
    draw,
    mark(seq) {
      open = seq;
      for (const p of pins.values()) p.el.setAttribute('aria-expanded', String(p.m.seq === seq));
      ring();
    },
    destroy() {
      for (const id of ringed) d.card(id)?.removeAttribute('data-group-ring');
      layer.remove();
    },
  };
}
