// Selection bar pattern, layer 3 (element): <vb-selection-bar>, in light DOM (components.md § The
// element). A toolbar over the person's selection: the page calls `show()` with what it says and
// `place()` on every pan, zoom, relayout and change of the selection, and listens for
// `vb-command` (and `vb-toggle`, the pill's click or Enter, stage5-follow-ups FE_02); the element
// never acts itself. With the grid (selection-grid task) the pill's click says where it landed, the
// anchor cell takes focus as the grid opens, `anchor()` measures it for `placeGrid`, and the arrow
// keys move between the cells (`gridStep`). Browser only: the class is created inside
// defineVbSelectionBar(), so importing this file never touches HTMLElement.
import type { BarPlacement, BarView, GridAnchor } from './selection-bar-core.ts';
import { gridStep, isGridKey } from './selection-bar-core.ts';
import { selectionBarTemplate } from './selection-bar-template.ts';

export const VB_SELECTION_BAR_TAG = 'vb-selection-bar';

/** A button was pressed: the `vb-command` event's detail. */
export interface CommandEventDetail { command: string }

/** The pill was pressed: the `vb-toggle` event's detail, whether the bar is asked to open, and where the pointer
 *  pressed it, in client pixels (none from the keyboard). */
export interface ToggleEventDetail { open: boolean; at?: { x: number; y: number } }

export interface VbSelectionBarElement extends HTMLElement {
  /** Draw the bar from `barView`; redrawn only when what it says changed. */
  show(v: BarView): void;
  /** Put it over the selection (from `placeBar`), in its offset parent's pixels. */
  place(p: BarPlacement): void;
  /** The open grid's anchor cell, measured as drawn (`placeGrid`); null without the grid. */
  anchor(): GridAnchor | null;
}

export function defineVbSelectionBar(): void {
  if (customElements.get(VB_SELECTION_BAR_TAG)) return;

  class VbSelectionBar extends HTMLElement implements VbSelectionBarElement {
    private drawn = '';
    private open = false;

    constructor() {
      super();
      this.addEventListener('click', (e) => {
        if ((e.target as HTMLElement).closest('.vb-sb-pill')) {
          // A click from the keyboard (Enter, Space) has no pointer: detail 0.
          const toggle: ToggleEventDetail = { open: !this.open, ...(e.detail > 0 && { at: { x: e.clientX, y: e.clientY } }) };
          return void this.dispatchEvent(new CustomEvent<ToggleEventDetail>('vb-toggle', { bubbles: true, detail: toggle }));
        }
        const b = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-command]');
        if (!b) return;
        const detail: CommandEventDetail = { command: b.dataset.command! };
        this.dispatchEvent(new CustomEvent<CommandEventDetail>('vb-command', { bubbles: true, detail }));
      });
      this.addEventListener('keydown', (e) => {
        if (!this.open || !this.hasAttribute('data-grid') || !isGridKey(e.key)) return;
        const cells = [...this.querySelectorAll<HTMLElement>('[data-row]')];
        const from = cells.indexOf(e.target as HTMLElement);
        if (from < 0) return;
        e.preventDefault();
        const usable = cells.map((c) => c instanceof HTMLButtonElement && !c.disabled);
        cells[gridStep(from, e.key, this.dataset.side === 'below', usable)]!.focus();
      });
    }

    show(v: BarView): void {
      this.setAttribute('role', 'toolbar');
      this.setAttribute('aria-label', v.name);
      // Opening or closing the pill redraws nothing: the pill keeps its focus.
      const key = JSON.stringify({ ...v, open: undefined });
      if (key !== this.drawn) this.innerHTML = selectionBarTemplate(v);
      this.drawn = key;
      const opened = !this.open && !!v.open;
      this.open = !!v.open;
      this.toggleAttribute('data-pill', !!v.pill);
      this.toggleAttribute('data-grid', !!v.cells);
      this.toggleAttribute('data-open', this.open);
      const pill = this.querySelector<HTMLElement>('.vb-sb-pill');
      pill?.setAttribute('aria-expanded', String(this.open));
      this.hidden = false;
      // The grid opens with its anchor under the pointer and focused, so a second click or Enter runs it; the pill
      // keeps focus when the anchor's command is absent or off.
      if (opened && v.cells) (this.querySelector<HTMLElement>('button[data-anchor]:not(:disabled)') ?? pill)?.focus({ preventScroll: true });
    }

    anchor(): GridAnchor | null {
      const a = this.querySelector<HTMLElement>('[data-anchor]');
      if (!a || !this.hasAttribute('data-grid')) return null;
      // Offsets are from the padding edge: the border (clientLeft, clientTop) is added back.
      const y = this.clientTop + a.offsetTop + a.offsetHeight / 2;
      return { x: this.clientLeft + a.offsetLeft + a.offsetWidth / 2, reach: Math.min(y, this.offsetHeight - y) };
    }

    place(p: BarPlacement): void {
      this.dataset.side = p.side;
      // CSSOM, not a style attribute: the page's CSP refuses inline styles.
      this.style.left = `${Math.round(p.x)}px`;
      this.style.top = `${Math.round(p.y)}px`;
    }
  }

  customElements.define(VB_SELECTION_BAR_TAG, VbSelectionBar);
}
