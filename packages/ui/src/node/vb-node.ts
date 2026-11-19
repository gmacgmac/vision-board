// Node pattern, layer 3 (element): <vb-node>, in light DOM (components.md § The element).
// render() builds the markup from the template once per view version; update() changes only
// attributes, text and the note's Markdown, so focus and transitions survive. Browser only: the
// class is created inside defineVbNode(), so importing this file never touches HTMLElement (Node
// tests import the ui front door). It knows nothing about layout; the page measures and places it.
import type { ViewNode } from '#format';
import type { NodeState } from './node-core.ts';
import type { HoverTip } from '../tip/hover-tip.ts';
import type { NodeTemplateOptions } from './node-template.ts';
import { applyApp, applyPanelSize, applyWindow, bindAppNameTip, keepingDrawer, renderKeepingPanel } from './node-app-apply.ts';
import { handoverMarkup, isWindow, nodeTemplate, proposalsMarkup, stepMarkup } from './node-template.ts';
import { panelSize } from '../app-frame/app-frame-core.ts';
import { explainPaused, pauseControls } from '../paused/paused.ts';
import { READ_ONLY_PERSON } from '#actions';
import { SKIN_DEFS } from '../skins.ts';
import { applyMarks, applyTone } from './node-edges-apply.ts';
import { datedOf } from './node-date.ts';

/** The controls a locked board pauses on a node (N40 ruling 4): everything that changes it but the bookmark: the
 *  answer, the disc or the switch's halves, which look as they would at rest (point 328), and a proposal's answers. */
const PAUSED = 'button[data-answer], [data-mark="answer"], [data-mark="tick"], [data-mark="cross"]';
/** The bookmark, the number, which a lock lets be but a read-only ledger pauses with the rest (D-085 3). */
const BOOKMARK = '[data-mark="number"]';
/** An app card's Allow and Stop app, which a read-only ledger pauses too (FE_01); "Allowed ▾" only opens the menu. */
const APP = 'button[data-app-act="app-allow"], button[data-app-act="app-revoke"]';
/** An out-of-date proposal's Accept is aria-disabled for its own reason, locked or not. */
const staleAccept = (el: Element): boolean => el.matches('[data-answer="accept"]') && el.closest('.vb-prop[data-stale]') !== null;

export const VB_NODE_TAG = 'vb-node';

/** What the page holds: a <vb-node> it renders once and updates in place. */
export interface VbNodeElement extends HTMLElement {
  /** Build from the template; sets data-id, data-kind, data-emphasis, data-edges, data-timeline, role, tabindex, --vb-kind. */
  render(n: ViewNode, opts?: NodeTemplateOptions): void;
  /** Apply the person's current state (from `nodeState`) without rebuilding the markup. */
  update(st: NodeState): void;
}

/** Defines `vb-node` once; a second call is a no-op. */
export function defineVbNode(): void {
  if (customElements.get(VB_NODE_TAG)) return;

  class VbNode extends HTMLElement implements VbNodeElement {
    /** The proposals last drawn in the proposal box (FE_01). */
    private proposalSrc: string | undefined;
    /** The step section last drawn (FE_02). */
    private stepSrc: string | undefined;
    /** The handover last drawn in the node's body (FE_03, DESIGN_01). */
    private handoverSrc: string | undefined;
    /** The tip over an app window's name in its bar (card-polish FE_04), bound once per node. */
    private nameTip: HoverTip | undefined;
    /** An app card's state view last drawn (D-047). */
    private appSrc: string | undefined;
    /** How `render` was told this card's Markdown renders; `update` draws by it too. */
    private markdown: NodeTemplateOptions['markdown'];

    render(n: ViewNode, opts: NodeTemplateOptions = {}): void {
      this.markdown = opts.markdown;
      this.dataset.id = n.id;
      this.dataset.kind = n.kind;
      if (opts.idPrefix) this.dataset.idPrefix = opts.idPrefix;
      else delete this.dataset.idPrefix;
      this.toggleAttribute('data-emphasis', Boolean(n.emphasis));
      // An app card is a window (node-window.ts), with the edges' number, badge and history in its bar.
      const win = isWindow(n, opts);
      const def = opts.edges ?? SKIN_DEFS.default;
      this.toggleAttribute('data-edges', true);
      this.toggleAttribute('data-window', win);
      // Where the skin's row puts the answer and the marks (skins.ts): CSS places by these, never by a skin's name.
      Object.assign(this.dataset, { answerAt: def.answer, marksAt: def.marks });
      this.toggleAttribute('data-icon', n.icon !== undefined);
      // A dated node (D-105): its date, the hook the page's pointer and CSS read (no drag starts on it); a new version
      // that adds or drops the key sets or clears it here, in place.
      const dated = datedOf(n);
      if (dated) this.dataset.timeline = dated;
      else delete this.dataset.timeline;
      applyTone(this, n.tone);
      this.setAttribute('role', 'listitem');
      this.tabIndex = 0;
      // CSSOM, not a style attribute: the page's CSP refuses inline styles.
      this.style.setProperty('--vb-kind', `var(--vb-kind-${n.kind})`);
      // An app card is as wide as its panel plus its padding (node.css); no size word applies to it.
      const app = n.kind === 'app' && opts.appCards !== false;
      applyPanelSize(this, app ? panelSize(n.app ?? { id: '' }) : undefined);
      // In place of innerHTML: a loaded app panel stays loaded through a new version (D-050).
      // ...and an open drawer keeps its conversation, the words typed in it and its focus (FE_08).
      keepingDrawer(this, () => renderKeepingPanel(this, nodeTemplate(n, opts)));
      this.proposalSrc = this.stepSrc = this.handoverSrc = this.appSrc = undefined;
      // The page opens the history and proposal boxes from their marks (FE_02): nothing opens on hover.
      if (app) this.nameTip ??= bindAppNameTip(this);
      this.nameTip?.close();
    }

    update(st: NodeState): void {
      this.dataset.status = st.status;
      this.setAttribute('aria-label', st.label);
      this.toggleAttribute('data-pinned', st.pinned);
      this.toggleAttribute('data-selected', st.selected);
      this.toggleAttribute('data-bookmarked', st.bookmarked === true);
      applyMarks(this, st.marks);
      this.updateSize(st);
      this.updateProposal(st);
      this.updateHandover(st);
      this.updateSteps(st);
      if (st.app && this.querySelector('.vb-app')) this.appSrc = applyApp(this, st.app, this.appSrc);
      if (st.app && this.hasAttribute('data-window')) applyWindow(this, st.app, st.marks);
      pauseControls(this, PAUSED, st.paused === true, staleAccept);
      pauseControls(this, BOOKMARK, st.readOnly === true);
      pauseControls(this, APP, st.readOnly === true);
      explainPaused(this, `${PAUSED}, ${BOOKMARK}, ${APP}`, st.readOnly === true ? READ_ONLY_PERSON : undefined);
    }

    /** The handover (DESIGN_01 ruling): once written it is a section of the node's body, under a "Handover" heading;
     *  while owed, the quiet Awaiting tab says so (node-edges-apply.ts). */
    private updateHandover(st: NodeState): void {
      const section = this.piece('handover');
      if (!section) return;
      const v = st.handover;
      section.hidden = v === undefined;
      const src = v ? JSON.stringify(v) : '';
      if (this.handoverSrc === src) return;
      this.handoverSrc = src;
      // Markup from handoverMarkup, which escapes every text run and renders the Markdown safely.
      section.innerHTML = v ? `<h4 class="vb-node-handover-head">${v.tab}</h4>${handoverMarkup(v, this.markdown)}` : '';
    }

    /** The step section and the stepper in the history box (FE_02, planner's call 9; the badge opens it): the section
     *  is rebuilt only when its step changed. */
    private updateSteps(st: NodeState): void {
      if (!this.piece('steps')) return;
      const v = st.updates;
      const section = this.piece('steps')!;
      section.hidden = !v?.open;
      if (v?.step) section.setAttribute('aria-label', v.step.label);
      else section.removeAttribute('aria-label');
      const src = v?.open ? stepMarkup(v, this.markdown) : '';
      // Markup from stepMarkup, which escapes every text run.
      if (this.stepSrc !== src) section.innerHTML = src;
      this.stepSrc = src;
      const nav = this.piece('stepnav')!;
      nav.hidden = !v?.step;
      this.piece('stepcount')!.textContent = v?.step?.count ?? '';
      const back = nav.querySelector('[data-step="back"]')!;
      if (v?.step?.first) back.setAttribute('aria-disabled', 'true');
      else back.removeAttribute('aria-disabled');
    }

    /** The proposal box (FE_01), which the disc or a switch's proposal chip opens (node-edges-apply.ts): rebuilt only
     *  when the proposals changed. */
    private updateProposal(st: NodeState): void {
      const box = this.querySelector<HTMLElement>('[data-pop="proposal"]');
      if (!box) return;
      const v = st.proposal;
      if (v) box.setAttribute('aria-label', v.box);
      const src = v ? JSON.stringify(v.entries) : '';
      if (this.proposalSrc === src) return;
      this.proposalSrc = src;
      // Markup from proposalsMarkup, which escapes every text run.
      box.innerHTML = v ? proposalsMarkup(v, this.dataset.idPrefix) : '';
    }

    /** data-size sets the width (node.css), so the page applies it before it measures the card. */
    private updateSize(st: NodeState): void {
      const size = st.size;
      if (size) this.dataset.size = size.tier;
      else delete this.dataset.size;
      this.toggleAttribute('data-size-picked', size?.picked ?? false);
    }

    private piece(name: string): HTMLElement | null {
      return this.querySelector<HTMLElement>(`.vb-node-${name}`);
    }
  }

  customElements.define(VB_NODE_TAG, VbNode);
}
