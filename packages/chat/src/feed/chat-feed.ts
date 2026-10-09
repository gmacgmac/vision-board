// Chat feed pattern, layer 3 (element): <chat-feed>, in light DOM. The host applies events with the
// core (`applyEvent`) and calls `show(state)`; the feed adds and redraws only the entries that are
// new or changed (an unchanged entry is the same object), keeps the view at the bottom when it was
// there, and keeps the open approvals' time current. It raises `chat-change` when a change chip is
// clicked; approval cards raise `chat-answer`. It never calls the server. Browser only.
import type { RenderText } from '../esc.ts';
import { plainText } from '../esc.ts';
import type { ChatApprovalElement } from '../approval/chat-approval.ts';
import { CHAT_APPROVAL_TAG } from '../approval/chat-approval.ts';
import type { ChatMessageElement } from '../message/chat-message.ts';
import { CHAT_MESSAGE_TAG } from '../message/chat-message.ts';
import type { ChatState, FeedEntry } from './feed-core.ts';
import { activityLine, EMPTY_CHAT } from './feed-core.ts';
import { changeTemplate, feedTemplate, systemTemplate } from './feed-template.ts';

export const CHAT_FEED_TAG = 'chat-feed';
export const CHAT_CHANGE_EVENT = 'chat-change';
/** The `chat-change` event's detail (bubbles): the board write a chip stands for. */
export interface ChatChangeDetail { board: string; cards: number[]; head?: number }

export interface ChatFeedOptions {
  /** The agent's words to markup (the host's Markdown renderer); plain text by default. */
  render?: RenderText;
  /** A board's name for change chips (its title); the id by default. */
  boardName?: (id: string) => string;
  /** What the feed says before the first message. */
  empty?: string;
  /** The log's accessible name. */
  label?: string;
  /** The time, for the approvals' countdown (the gallery fixes it). */
  clock?: () => number;
}

export interface ChatFeedElement extends HTMLElement {
  configure(o: ChatFeedOptions): void;
  show(s: ChatState): void;
  /** The answer to an approval did not go through: say why on its card. */
  answerFailed(approvalId: string, message: string): void;
}

/** How close to the bottom still counts as at the bottom, in pixels. */
const NEAR_BOTTOM = 48;

interface Row { entry: FeedEntry; open: boolean; node: HTMLElement }

export function defineChatFeed(): void {
  if (customElements.get(CHAT_FEED_TAG)) return;

  class ChatFeed extends HTMLElement implements ChatFeedElement {
    private opts: Required<Omit<ChatFeedOptions, 'boardName'>> & Pick<ChatFeedOptions, 'boardName'> = {
      render: plainText, empty: 'No messages yet.', label: 'Conversation', clock: () => Date.now(),
    };
    private rows = new Map<string, Row>();
    private state: ChatState = EMPTY_CHAT;
    private timer?: ReturnType<typeof setInterval>;

    constructor() {
      super();
      this.addEventListener('click', (e) => {
        const b = (e.target as HTMLElement).closest<HTMLButtonElement>('button.chat-change');
        if (!b) return;
        const row = this.rows.get(b.closest<HTMLElement>('[data-key]')?.dataset.key ?? '');
        if (row?.entry.type !== 'change') return;
        const { board, cards, head } = row.entry;
        const detail: ChatChangeDetail = { board, cards: [...cards], ...(head !== undefined && { head }) };
        this.dispatchEvent(new CustomEvent<ChatChangeDetail>(CHAT_CHANGE_EVENT, { bubbles: true, detail }));
      });
    }

    /** Joining the page opens at the latest words. */
    connectedCallback(): void {
      this.show(this.state);
      const log = this.skeleton();
      log.scrollTop = log.scrollHeight;
    }

    disconnectedCallback(): void {
      this.tickEvery(false);
    }

    configure(o: ChatFeedOptions): void {
      this.opts = { ...this.opts, ...o };
      this.innerHTML = '';
      this.rows.clear();
      this.skeleton();
      this.show(this.state);
    }

    show(s: ChatState): void {
      this.state = s;
      const log = this.skeleton();
      const bottom = log.scrollHeight - log.scrollTop - log.clientHeight <= NEAR_BOTTOM;
      const seen = new Set<string>();
      s.entries.forEach((entry, i) => {
        seen.add(entry.key);
        const open = entry.type === 'approval' && s.pending.includes(entry.approvalId);
        let row = this.rows.get(entry.key);
        if (!row || row.entry !== entry || row.open !== open) row = this.draw(entry, open, row?.node);
        if (log.children[i] !== row.node) log.insertBefore(row.node, log.children[i] ?? null);
      });
      for (const [key, row] of this.rows) if (!seen.has(key)) { row.node.remove(); this.rows.delete(key); }
      this.querySelector<HTMLElement>('.chat-empty')!.hidden = s.entries.length > 0;
      const line = activityLine(s);
      const activity = this.querySelector<HTMLElement>('.chat-activity')!;
      activity.textContent = line ?? '';
      activity.toggleAttribute('data-on', line !== null);
      this.dataset.busy = String(s.busy);
      if (bottom) log.scrollTop = log.scrollHeight;
      this.tickEvery(s.pending.length > 0);
    }

    answerFailed(approvalId: string, message: string): void {
      this.querySelector<ChatApprovalElement>(`[data-key="a-${CSS.escape(approvalId)}"] ${CHAT_APPROVAL_TAG}`)?.setPhase('error', message);
    }

    private skeleton(): HTMLElement {
      let log = this.querySelector<HTMLElement>(':scope > .chat-log');
      if (log) return log;
      this.innerHTML = feedTemplate(this.opts.empty, this.opts.label);
      log = this.querySelector<HTMLElement>(':scope > .chat-log')!;
      for (const row of this.rows.values()) log.append(row.node);
      return log;
    }

    /** The row for an entry, drawn into its old node when it had one. */
    private draw(entry: FeedEntry, open: boolean, node: HTMLElement = document.createElement('div')): Row {
      node.className = 'chat-row';
      node.dataset.key = entry.key;
      node.dataset.type = entry.type;
      if (entry.type === 'person' || entry.type === 'agent') {
        const m = node.firstElementChild?.localName === CHAT_MESSAGE_TAG ? node.firstElementChild as ChatMessageElement
          : document.createElement(CHAT_MESSAGE_TAG) as ChatMessageElement;
        m.show(entry, this.opts.render);
        node.replaceChildren(m);
      } else if (entry.type === 'approval') {
        const a = node.firstElementChild?.localName === CHAT_APPROVAL_TAG ? node.firstElementChild as ChatApprovalElement
          : document.createElement(CHAT_APPROVAL_TAG) as ChatApprovalElement;
        a.show(entry, open, this.opts.clock());
        node.replaceChildren(a);
      } else {
        node.innerHTML = entry.type === 'change' ? changeTemplate(entry, this.opts.boardName) : systemTemplate(entry);
      }
      const row = { entry, open, node };
      this.rows.set(entry.key, row);
      return row;
    }

    private tickEvery(on: boolean): void {
      if (on && this.timer === undefined && this.isConnected) {
        this.timer = setInterval(() => {
          const now = this.opts.clock();
          for (const a of this.querySelectorAll<ChatApprovalElement>(CHAT_APPROVAL_TAG)) a.tick(now);
        }, 1000);
      } else if (!on && this.timer !== undefined) {
        clearInterval(this.timer);
        this.timer = undefined;
      }
    }
  }

  customElements.define(CHAT_FEED_TAG, ChatFeed);
}
