// Chat feed pattern, layer 3 (element): <chat-feed>, in light DOM. The host applies events with the
// core (`applyEvent`) and calls `show(state)`; the feed adds and redraws only the entries that are
// new or changed (an unchanged entry is the same object), follows the latest words, and keeps the open
// approvals' time current. Following is on by default and only the person's own scrolling away from
// the latest turns it off (the wheel, a key, dragging the scrollbar or a touch); reaching the end
// again, the "Jump to latest" button or `follow()` (the host calls it when the person sends) turns it
// on. While on, a ResizeObserver on the log and its rows keeps the view at the end whatever changes
// size (a reply growing, the composer, the status line), and a panel that opens shows the latest. It
// raises `chat-change` when a change chip is clicked; approval cards raise `chat-answer`. It never
// calls the server. Browser only.
import { CHAT_CHANGE_EVENT } from '../events.ts';
import type { RenderText } from '../esc.ts';
import { plainText } from '../esc.ts';
import type { ChatApprovalElement } from '../approval/chat-approval.ts';
import { CHAT_APPROVAL_TAG } from '../approval/chat-approval.ts';
import type { ChatMessageElement } from '../message/chat-message.ts';
import { CHAT_MESSAGE_TAG } from '../message/chat-message.ts';
import type { ChatState, FeedEntry } from './feed-core.ts';
import { activityLine, EMPTY_CHAT, followAfterScroll, leavesLatest } from './feed-core.ts';
import type { PersonInput } from './feed-core.ts';
import { changeTemplate, feedTemplate, systemTemplate } from './feed-template.ts';

export const CHAT_FEED_TAG = 'chat-feed';
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
  /** Follow the latest again and show it (the person sent a message). */
  follow(): void;
  /** The answer to an approval did not go through: say why on its card. */
  answerFailed(approvalId: string, message: string): void;
}

/** How long after the person's wheel or key a scroll still counts as theirs (smooth scrolling, momentum), in ms. */
const PERSON_MS = 400;

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
    private following = true;
    /** The person is dragging the scrollbar or a touch: a scroll off the end is theirs. */
    private dragging = false;
    /** Where the log was when the person's input took it off the latest, until it moves: a scroll event
     *  still on its way from the page's own scroll to the end (same place) is not the person's. */
    private awayFrom: number | null = null;
    private lastTop = 0;
    /** When the person last used the wheel or a key on the log: a scroll within `PERSON_MS` of it is theirs
     *  (the browser may scroll before the wheel's handler runs, so the position at the input proves nothing). */
    private personAt = -Infinity;
    private shown = false;
    private readonly sizes = new ResizeObserver(() => this.resized());

    constructor() {
      super();
      this.listenToPerson();
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

    /** Joining the page opens at the latest words: the observer sees the log's size and pins. */
    connectedCallback(): void {
      this.show(this.state);
      this.observe();
      document.addEventListener('pointerup', this.release);
      document.addEventListener('touchend', this.release);
      document.addEventListener('pointercancel', this.release);
    }

    disconnectedCallback(): void {
      this.tickEvery(false);
      this.sizes.disconnect();
      document.removeEventListener('pointerup', this.release);
      document.removeEventListener('touchend', this.release);
      document.removeEventListener('pointercancel', this.release);
    }

    configure(o: ChatFeedOptions): void {
      this.opts = { ...this.opts, ...o };
      this.innerHTML = '';
      this.rows.clear();
      this.sizes.disconnect();
      this.skeleton();
      if (this.isConnected) this.observe();
      this.show(this.state);
    }

    follow(): void {
      this.personAt = -Infinity;
      this.dragging = false;
      this.setFollowing(true);
      this.pin();
    }

    show(s: ChatState): void {
      this.state = s;
      const log = this.skeleton();
      const seen = new Set<string>();
      s.entries.forEach((entry, i) => {
        seen.add(entry.key);
        const open = entry.type === 'approval' && s.pending.includes(entry.approvalId);
        let row = this.rows.get(entry.key);
        if (!row || row.entry !== entry || row.open !== open) row = this.draw(entry, open, row?.node);
        if (log.children[i] !== row.node) log.insertBefore(row.node, log.children[i] ?? null);
      });
      for (const [key, row] of this.rows) if (!seen.has(key)) { this.sizes.unobserve(row.node); row.node.remove(); this.rows.delete(key); }
      this.querySelector<HTMLElement>('.chat-empty')!.hidden = s.entries.length > 0;
      const line = activityLine(s);
      const activity = this.querySelector<HTMLElement>('.chat-activity')!;
      activity.textContent = line ?? '';
      activity.toggleAttribute('data-on', line !== null);
      this.dataset.busy = String(s.busy);
      this.pin();
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
      this.querySelector<HTMLButtonElement>('.chat-jump-btn')!.hidden = this.following;
      this.dataset.following = String(this.following);
      return log;
    }

    /** Watch the log and every row for a change of size. */
    private observe(): void {
      this.sizes.observe(this.skeleton());
      for (const row of this.rows.values()) this.sizes.observe(row.node);
    }

    /** Something changed size: a panel that opens (the log was hidden) shows the latest; else stay at the end if following. */
    private resized(): void {
      const shown = this.skeleton().clientHeight > 0;
      if (shown && !this.shown) this.setFollowing(true);
      this.shown = shown;
      this.pin();
    }

    /** At the end of the log while following. A programmatic scroll never changes `following`. */
    private pin(): void {
      if (!this.following) return;
      const log = this.skeleton();
      log.scrollTop = log.scrollHeight;
    }

    private setFollowing(on: boolean): void {
      if (on) this.awayFrom = null;
      this.following = on;
      this.dataset.following = String(on);
      const jump = this.querySelector<HTMLButtonElement>('.chat-jump-btn');
      if (jump) jump.hidden = on;
    }

    /** The person's own input is the only thing that takes the view off the latest. */
    private listenToPerson(): void {
      const away = (input: PersonInput) => {
        this.personAt = performance.now();
        const log = this.skeleton();
        if (!this.following || !leavesLatest(input, log)) return;
        this.awayFrom = log.scrollTop;
        this.setFollowing(false);
      };
      this.addEventListener('wheel', (e) => away({ kind: 'wheel', deltaY: e.deltaY }), { passive: true });
      this.addEventListener('keydown', (e) => {
        if ((e.target as HTMLElement).closest('input, textarea, select, [contenteditable]')) return;
        away({ kind: 'key', key: e.key, shift: e.shiftKey });
      });
      this.addEventListener('pointerdown', (e) => { if (e.target === this.skeleton()) this.dragging = true; });
      this.addEventListener('touchstart', () => { this.dragging = true; }, { passive: true });
      this.addEventListener('scroll', () => {
        const log = this.skeleton();
        const down = log.scrollTop > this.lastTop;
        this.lastTop = log.scrollTop;
        if (this.awayFrom !== null) {
          if (log.scrollTop === this.awayFrom) return;
          this.awayFrom = null;
        }
        const next = followAfterScroll(this.following, log, { down, person: this.dragging || performance.now() - this.personAt < PERSON_MS });
        if (next !== this.following) this.setFollowing(next);
      }, true);
      this.addEventListener('click', (e) => {
        if (!(e.target as HTMLElement).closest('.chat-jump-btn')) return;
        this.follow();
        this.skeleton().focus({ preventScroll: true });
      });
    }

    private release = (): void => { this.dragging = false; };

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
      this.sizes.observe(node);
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
