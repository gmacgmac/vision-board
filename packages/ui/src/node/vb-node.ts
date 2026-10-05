// Node pattern, layer 3 (element): <vb-node>, in light DOM (components.md § The element).
// render() builds the markup from the template once per view version; update() changes only
// attributes, text and the note's Markdown, so focus and transitions survive. Browser only: the
// class is created inside defineVbNode(), so importing this file never touches HTMLElement (Node
// tests import the ui front door). It knows nothing about layout; the page measures and places it.
import type { ActionId, ViewNode } from '../../../format/src/index.ts';
import type { NodeState } from './node-core.ts';
import type { NodeTemplateOptions } from './node-template.ts';
import { nodeTemplate } from './node-template.ts';
import { renderMarkdown } from '../markdown/render.ts';

export const VB_NODE_TAG = 'vb-node';

/** What the page holds: a <vb-node> it renders once and updates in place. */
export interface VbNodeElement extends HTMLElement {
  /** Build from the template; sets data-id, data-kind, data-emphasis, role, tabindex, --kind.
   *  `opts.sizeControl` draws the size control (the nodeSize flag). */
  render(n: ViewNode, opts?: NodeTemplateOptions): void;
  /** Apply the person's current state (from `nodeState`) without rebuilding the markup. */
  update(st: NodeState): void;
}

/** Defines `vb-node` once; a second call is a no-op. */
export function defineVbNode(): void {
  if (customElements.get(VB_NODE_TAG)) return;

  class VbNode extends HTMLElement implements VbNodeElement {
    /** The note source last drawn, so an unchanged note is not rebuilt (a focused link in it keeps focus). */
    private noteSrc: string | undefined;

    render(n: ViewNode, opts: NodeTemplateOptions = {}): void {
      this.noteSrc = undefined;
      this.dataset.id = n.id;
      this.dataset.kind = n.kind;
      this.toggleAttribute('data-emphasis', Boolean(n.emphasis));
      this.setAttribute('role', 'listitem');
      this.tabIndex = 0;
      // CSSOM, not a style attribute: the page's CSP refuses inline styles.
      this.style.setProperty('--kind', `var(--vb-kind-${n.kind})`);
      this.innerHTML = nodeTemplate(n, opts);
    }

    update(st: NodeState): void {
      this.dataset.status = st.status;
      this.setAttribute('aria-label', st.label);
      this.toggleAttribute('data-pinned', st.pinned);
      for (const b of this.querySelectorAll<HTMLButtonElement>('button[data-act]'))
        b.setAttribute('aria-pressed', String(st.pressed[b.dataset.act as ActionId] ?? false));
      // A non-item has no footer, so no status word.
      const status = this.piece('status');
      if (status) status.textContent = st.statusWord;
      this.piece('notes')!.hidden = st.note === undefined;
      if (st.note !== undefined) {
        this.piece('note-who')!.textContent = st.note.who;
        // The note is Markdown (D-023); renderMarkdown escapes every text run, so this is safe markup.
        if (this.noteSrc !== st.note.text) this.piece('note-text')!.innerHTML = renderMarkdown(st.note.text);
        this.noteSrc = st.note.text;
      }
      this.updateSize(st);
    }

    /** data-size sets the width (node.css), so the page applies it before it measures the card. */
    private updateSize(st: NodeState): void {
      const size = st.size;
      if (size) this.dataset.size = size.tier;
      else delete this.dataset.size;
      this.toggleAttribute('data-size-picked', size?.picked ?? false);
      const trig = this.querySelector<HTMLButtonElement>('.vb-size-trig');
      if (!trig || !size) return;
      trig.setAttribute('aria-label', size.label);
      trig.querySelector('.vb-size-shown')!.textContent = size.shown;
      for (const b of this.querySelectorAll<HTMLButtonElement>('button[data-size-pick]')) {
        const pick = b.dataset.sizePick;
        b.setAttribute('aria-pressed', String(size.picked ? pick === size.tier : pick === 'auto'));
        // While Auto is on, the tier it chose is outlined.
        b.toggleAttribute('data-auto', !size.picked && pick === size.tier);
      }
    }

    private piece(name: string): HTMLElement | null {
      return this.querySelector<HTMLElement>(`.vb-node-${name}`);
    }
  }

  customElements.define(VB_NODE_TAG, VbNode);
}
