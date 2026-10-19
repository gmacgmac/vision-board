// Approval card pattern, layer 3 (element): <chat-approval>, in light DOM. The feed creates one per
// approval entry, calls `show()` when the entry or its waiting changes and `tick()` every second
// while it waits. A click raises `chat-answer` once; the element never calls the server. While an
// answer is on its way further clicks do nothing (nclite: answer-once, controls left enabled);
// `setPhase('error')` says why it did not go through and takes clicks again. Browser only.
import type { ApprovalAnswer } from '../events.ts';
import { CHAT_ANSWER_EVENT } from '../events.ts';
import type { ApprovalEntry } from '../feed/feed-core.ts';
import type { ChoiceId } from './approval-core.ts';
import { APPROVAL_CHOICES, approvalView, timeLeft } from './approval-core.ts';
import { approvalTemplate } from './approval-template.ts';

export const CHAT_APPROVAL_TAG = 'chat-approval';
/** The `chat-answer` event's detail (bubbles). */
export interface ChatAnswerDetail { approvalId: string; answer: ApprovalAnswer }
export type AnswerPhase = 'idle' | 'sending' | 'error';

export interface ChatApprovalElement extends HTMLElement {
  show(e: ApprovalEntry, open: boolean, now: number): void;
  /** Keeps the time line current; an open card whose time ran out is drawn as lapsed. */
  tick(now: number): void;
  setPhase(phase: AnswerPhase, message?: string): void;
}

export function defineChatApproval(): void {
  if (customElements.get(CHAT_APPROVAL_TAG)) return;

  class ChatApproval extends HTMLElement implements ChatApprovalElement {
    private entry?: ApprovalEntry;
    private open = false;

    constructor() {
      super();
      this.addEventListener('click', (ev) => {
        const b = (ev.target as HTMLElement).closest<HTMLButtonElement>('button[data-choice]');
        if (b && !b.disabled) this.answer(b.dataset.choice as ChoiceId);
      });
    }

    show(e: ApprovalEntry, open: boolean, now: number): void {
      this.entry = e;
      this.open = open;
      const v = approvalView(e, open, now);
      this.setAttribute('role', 'group');
      this.setAttribute('aria-label', `Approval: ${v.title}`);
      this.dataset.phase = v.phase;
      this.dataset.kind = e.facts.kind;
      this.innerHTML = approvalTemplate(v, timeLeft(e.expiresAt, now));
      this.setPhase('idle');
    }

    tick(now: number): void {
      if (!this.entry || this.dataset.phase !== 'open') return;
      if (approvalView(this.entry, this.open, now).phase !== 'open') return this.show(this.entry, this.open, now);
      const ttl = this.querySelector('.chat-ask-ttl');
      if (ttl) ttl.textContent = timeLeft(this.entry.expiresAt, now);
    }

    setPhase(phase: AnswerPhase, message = ''): void {
      this.dataset.answer = phase;
      if (phase === 'sending') this.setAttribute('aria-busy', 'true');
      else this.removeAttribute('aria-busy');
      const error = this.querySelector<HTMLElement>('.chat-ask-error');
      if (!error) return;
      error.hidden = phase !== 'error';
      error.textContent = phase === 'error' ? message : '';
    }

    private answer(id: ChoiceId): void {
      if (!this.entry || this.dataset.answer === 'sending') return;
      const choice = APPROVAL_CHOICES.find((c) => c.id === id)!;
      this.setPhase('sending');
      const detail: ChatAnswerDetail = { approvalId: this.entry.approvalId, answer: choice.answer };
      this.dispatchEvent(new CustomEvent<ChatAnswerDetail>(CHAT_ANSWER_EVENT, { bubbles: true, detail }));
    }
  }

  customElements.define(CHAT_APPROVAL_TAG, ChatApproval);
}
