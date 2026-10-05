// Selection bar pattern, layer 3 (element): <vb-selection-bar>, in light DOM (components.md § The
// element). A toolbar over the person's selection: the page calls `show()` with what it says and
// `place()` on every pan, zoom, relayout and change of the selection, and listens for
// `vb-command`; the element never acts itself. Browser only: the class is created inside
// defineVbSelectionBar(), so importing this file never touches HTMLElement.
import type { BarPlacement, BarView } from './selection-bar-core.ts';
import { selectionBarTemplate } from './selection-bar-template.ts';

export const VB_SELECTION_BAR_TAG = 'vb-selection-bar';

/** A button was pressed: the `vb-command` event's detail. */
export interface CommandEventDetail { command: string }

export interface VbSelectionBarElement extends HTMLElement {
  /** Draw the bar from `barView`; redrawn only when what it says changed. */
  show(v: BarView): void;
  /** Put it over the selection (from `placeBar`), in its offset parent's pixels. */
  place(p: BarPlacement): void;
}

export function defineVbSelectionBar(): void {
  if (customElements.get(VB_SELECTION_BAR_TAG)) return;

  class VbSelectionBar extends HTMLElement implements VbSelectionBarElement {
    private drawn = '';

    constructor() {
      super();
      this.addEventListener('click', (e) => {
        const b = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-command]');
        if (!b) return;
        const detail: CommandEventDetail = { command: b.dataset.command! };
        this.dispatchEvent(new CustomEvent<CommandEventDetail>('vb-command', { bubbles: true, detail }));
      });
    }

    show(v: BarView): void {
      this.setAttribute('role', 'toolbar');
      this.setAttribute('aria-label', v.name);
      const key = JSON.stringify(v);
      if (key !== this.drawn) this.innerHTML = selectionBarTemplate(v);
      this.drawn = key;
      this.hidden = false;
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
