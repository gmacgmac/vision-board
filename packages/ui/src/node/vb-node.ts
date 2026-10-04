// Node pattern, layer 3 (element): <vb-node>, in light DOM (components.md § The element).
// render() builds the markup from the template once per view version; update() changes only
// attributes and text, so focus and transitions survive. Browser only: the class is created
// inside defineVbNode(), so importing this file never touches HTMLElement (Node tests import
// the ui front door). It knows nothing about layout; the page measures and places it.
import type { ActionId, ViewNode } from '../../../format/src/index.ts';
import type { NodeState } from './node-core.ts';
import { nodeTemplate } from './node-template.ts';

export const VB_NODE_TAG = 'vb-node';

/** What the page holds: a <vb-node> it renders once and updates in place. */
export interface VbNodeElement extends HTMLElement {
  /** Build from the template; sets data-id, data-kind, data-emphasis, role, tabindex, --kind. */
  render(n: ViewNode): void;
  /** Apply the person's current state (from `nodeState`) without rebuilding the markup. */
  update(st: NodeState): void;
}

/** Defines `vb-node` once; a second call is a no-op. */
export function defineVbNode(): void {
  if (customElements.get(VB_NODE_TAG)) return;

  class VbNode extends HTMLElement implements VbNodeElement {
    render(n: ViewNode): void {
      this.dataset.id = n.id;
      this.dataset.kind = n.kind;
      this.toggleAttribute('data-emphasis', Boolean(n.emphasis));
      this.setAttribute('role', 'listitem');
      this.tabIndex = 0;
      // CSSOM, not a style attribute: the page's CSP refuses inline styles.
      this.style.setProperty('--kind', `var(--vb-kind-${n.kind})`);
      this.innerHTML = nodeTemplate(n);
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
        this.piece('note-text')!.textContent = st.note.text;
      }
    }

    private piece(name: string): HTMLElement | null {
      return this.querySelector<HTMLElement>(`.vb-node-${name}`);
    }
  }

  customElements.define(VB_NODE_TAG, VbNode);
}
