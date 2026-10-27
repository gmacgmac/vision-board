// Node pattern, layer 3 (element): <vb-node>, in light DOM (components.md § The element).
// render() builds the markup from the template once per view version; update() changes only
// attributes, text and the note's Markdown, so focus and transitions survive. Browser only: the
// class is created inside defineVbNode(), so importing this file never touches HTMLElement (Node
// tests import the ui front door). It knows nothing about layout; the page measures and places it.
import type { ActionId, ViewNode } from '#format';
import type { NodeState } from './node-core.ts';
import type { HoverTip } from '../tip/hover-tip.ts';
import type { NodeTemplateOptions } from './node-template.ts';
import { bindNoteTip } from './node-note-tip.ts';
import { bindCardPopover } from './node-popover.ts';
import { HISTORY, HISTORY_TAB } from './node-history.ts';
import { applyApp, applyPanelSize, bindAppNameTip, renderKeepingPanel } from './node-app-apply.ts';
import { handoverMarkup, nodeTemplate, notesMarkup, proposalsMarkup, stepMarkup } from './node-template.ts';
import { panelSize } from '../app-frame/app-frame-core.ts';
import { AWAITING, isItem } from './node-core.ts';
import { bindHoverTip } from '../tip/hover-tip.ts';
import { pauseControls } from '../paused/paused.ts';

/** The controls a locked board pauses on a card (N40 ruling 4): everything that changes it but the flag. */
const PAUSED = 'button[data-act], .vb-size-trig, .vb-size-opt, .vb-note-pin, button[data-answer]';
/** An out-of-date proposal's Accept is aria-disabled for its own reason, locked or not. */
const staleAccept = (el: Element): boolean => el.matches('[data-answer="accept"]') && el.closest('.vb-prop[data-stale]') !== null;

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
    /** The notes last drawn, so unchanged notes are not rebuilt (a focused link in one keeps focus). */
    private noteSrc: string | undefined;
    /** One tip per drawn note; closed before the notes are rebuilt, so none leaves a listener behind. */
    private noteTips: HoverTip[] = [];
    /** The proposal box (FE_01): its popover, bound once per card, and the proposals last drawn. */
    private proposalPop: HoverTip | undefined;
    private proposalSrc: string | undefined;
    /** The step section last drawn (FE_02). */
    private stepSrc: string | undefined;
    /** The handover box (FE_03): its popover, bound once per card, and the handover last drawn. */
    private handoverPop: HoverTip | undefined;
    private handoverSrc: string | undefined;
    /** The history box (card-polish FE_03), bound once per card; the page fills it as it shows. */
    private historyPop: HoverTip | undefined;
    /** The tip over an app card's name in its footer (card-polish FE_04), bound once per card. */
    private nameTip: HoverTip | undefined;
    /** The tip over the footer's "Awaiting" (FE_03), bound once per card. */
    private statusTip: HoverTip | undefined;
    /** An app card's state view last drawn (D-047). */
    private appSrc: string | undefined;

    render(n: ViewNode, opts: NodeTemplateOptions = {}): void {
      for (const t of this.noteTips) t.close();
      this.noteTips = [];
      this.noteSrc = undefined;
      this.dataset.id = n.id;
      this.dataset.kind = n.kind;
      if (opts.idPrefix) this.dataset.idPrefix = opts.idPrefix;
      else delete this.dataset.idPrefix;
      this.toggleAttribute('data-emphasis', Boolean(n.emphasis));
      this.setAttribute('role', 'listitem');
      this.tabIndex = 0;
      // CSSOM, not a style attribute: the page's CSP refuses inline styles.
      this.style.setProperty('--kind', `var(--vb-kind-${n.kind})`);
      // An app card is as wide as its panel plus its padding (node.css); no size word applies to it.
      const app = n.kind === 'app' && opts.appCards !== false;
      applyPanelSize(this, app ? panelSize(n.app ?? { id: '' }) : undefined);
      // In place of innerHTML: a loaded app panel stays loaded through a new version (D-050).
      renderKeepingPanel(this, nodeTemplate(n, opts));
      this.proposalSrc = this.stepSrc = this.handoverSrc = this.appSrc = undefined;
      // Bound once: each listens on the card itself and finds its tab and box afresh on every event.
      this.proposalPop?.close();
      this.handoverPop?.close();
      this.historyPop?.close();
      if (opts.history) this.historyPop ??= bindCardPopover(this, HISTORY, HISTORY_TAB);
      if (app) this.nameTip ??= bindAppNameTip(this);
      this.nameTip?.close();
      if (isItem(n)) {
        this.proposalPop ??= bindCardPopover(this, 'proposal');
        this.handoverPop ??= bindCardPopover(this, 'handover');
        this.statusTip ??= bindHoverTip(this, {
          anchor: '.vb-node-state', tip: '.vb-status-tip', attr: 'data-status-tip-open', needed: () => this.hasAttribute('data-awaiting'),
        });
      }
    }

    update(st: NodeState): void {
      this.dataset.status = st.status;
      this.setAttribute('aria-label', st.label);
      this.toggleAttribute('data-pinned', st.pinned);
      this.toggleAttribute('data-selected', st.selected);
      for (const b of this.querySelectorAll<HTMLButtonElement>('button[data-act]'))
        b.setAttribute('aria-pressed', String(st.pressed[b.dataset.act as ActionId] ?? false));
      this.toggleAttribute('data-flagged', st.flagged === true);
      this.querySelector('button[data-flag]')?.setAttribute('aria-pressed', String(st.flagged === true));
      // A non-item has no footer, so no status word.
      const status = this.piece('status');
      if (status) status.textContent = st.statusWord;
      this.toggleAttribute('data-awaiting', st.awaiting === true);
      const tip = this.querySelector('.vb-status-tip');
      if (tip) tip.textContent = st.awaiting ? AWAITING.tip : '';
      if (!st.awaiting) this.statusTip?.close();
      this.updateNotes(st);
      this.updateSize(st);
      this.updateProposal(st);
      this.updateHandover(st);
      this.updateSteps(st);
      if (st.app && this.querySelector('.vb-app')) this.appSrc = applyApp(this, st.app, this.appSrc);
      const fresh = this.querySelector<HTMLElement>('[data-tab="new"]');
      if (fresh) fresh.hidden = st.fresh !== true;
      pauseControls(this, PAUSED, st.paused === true, staleAccept);
    }

    /** The HANDOVER tab and its box (FE_03): rebuilt only when the handover changed, closed when none is left. */
    private updateHandover(st: NodeState): void {
      const tab = this.querySelector<HTMLButtonElement>('[data-tab="handover"]');
      if (!tab) return;
      const v = st.handover;
      tab.hidden = v === undefined;
      tab.textContent = v?.tab ?? '';
      if (v) tab.setAttribute('aria-label', v.label);
      const src = v ? JSON.stringify(v) : '';
      if (this.handoverSrc === src) return;
      this.handoverSrc = src;
      const box = this.querySelector<HTMLElement>('[data-pop="handover"]')!;
      // Markup from handoverMarkup, which escapes every text run and renders the Markdown safely.
      box.innerHTML = v ? handoverMarkup(v) : '';
      if (v) box.setAttribute('aria-label', v.box);
      else this.handoverPop?.close();
    }

    /** The "N updates" tab, the step section and the stepper in the footer (FE_02): the section is
     *  rebuilt only when its step changed; data-stepping swaps the footer for the stepper. */
    private updateSteps(st: NodeState): void {
      const tab = this.querySelector<HTMLButtonElement>('[data-tab="updates"]');
      if (!tab) return;
      const v = st.updates;
      tab.hidden = !v?.tab;
      tab.textContent = v?.tab ?? '';
      tab.setAttribute('aria-expanded', String(v?.open ?? false));
      if (v) tab.setAttribute('aria-label', v.label);
      this.toggleAttribute('data-stepping', v?.step !== undefined);
      const section = this.piece('steps')!;
      section.hidden = !v?.open;
      if (v?.step) section.setAttribute('aria-label', v.step.label);
      else section.removeAttribute('aria-label');
      const src = v?.open ? stepMarkup(v) : '';
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

    /** The PROPOSAL tab and its box (FE_01): rebuilt only when the proposals changed, closed when none is left. */
    private updateProposal(st: NodeState): void {
      const tab = this.querySelector<HTMLButtonElement>('[data-tab="proposal"]');
      if (!tab) return;
      const v = st.proposal;
      tab.hidden = v === undefined;
      tab.textContent = v?.tab ?? '';
      tab.toggleAttribute('data-stale', v?.stale ?? false);
      if (v) tab.setAttribute('aria-label', v.label);
      const src = v ? JSON.stringify(v.entries) : '';
      if (this.proposalSrc === src) return;
      this.proposalSrc = src;
      const box = this.querySelector<HTMLElement>('[data-pop="proposal"]')!;
      // Markup from proposalsMarkup, which escapes every text run.
      box.innerHTML = v ? proposalsMarkup(v, this.dataset.idPrefix) : '';
      if (v) box.setAttribute('aria-label', v.box);
      else this.proposalPop?.close();
    }

    /** The note pin and the "Your note" block (2e_FE_01 ruling 7), put away or not (card-polish FE_02). */
    private updateNotes(st: NodeState): void {
      const block = this.piece('notes')!;
      const pin = this.querySelector<HTMLButtonElement>('.vb-note-pin');
      const v = st.notes;
      block.hidden = v === undefined;
      this.toggleAttribute('data-noted', v?.pin !== undefined);
      if (pin) {
        pin.hidden = v?.pin === undefined;
        pin.textContent = v?.pin ? String(v.pin.index) : '';
        pin.toggleAttribute('data-sent', v?.pin?.sent ?? false);
        if (v?.pin) {
          pin.dataset.note = String(v.pin.seq);
          pin.setAttribute('aria-label', v.pin.label);
        }
      }
      // Markdown (D-023): notesMarkup escapes every text run, so this is safe markup. The times say
      // "Today" and "Yesterday", so the first update on a new day draws them again.
      const now = new Date();
      const src = v ? JSON.stringify(v) + now.toDateString() : '';
      if (this.noteSrc !== src) {
        // The Hide or Show toggle had focus: the one drawn in its place takes it (card-polish FE_02).
        const toggled = block.contains(document.activeElement) && document.activeElement!.matches('[data-notes]');
        for (const t of this.noteTips) t.close();
        block.innerHTML = v ? notesMarkup(v, now) : '';
        this.noteTips = [...block.querySelectorAll<HTMLElement>('.vb-node-note, .vb-node-reply')].map(bindNoteTip);
        if (toggled) block.querySelector<HTMLElement>('[data-notes]')?.focus({ preventScroll: true });
      }
      this.noteSrc = src;
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
