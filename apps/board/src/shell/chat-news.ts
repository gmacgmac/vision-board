// Working alongside the agent (workAlongside flag, point 328; agent-access-and-working WORK_01): what
// the chat says of its agent (`agentWork`, read from the chat's own conditions table: working while its
// turn runs, asking while a question waits for the person; the board's mark hears it through
// `BoardChat.status`, chat-bridge.ts), and the replies the
// person has not seen (`createReplyNews`). A reply is the words a turn ended on (a `message_out` that
// is not interim); it is news when it lands while the person can't see the latest of the feed (the
// panel closed, or scrolled away from the latest), and only one that lands after the page began
// following the session: the replies already there when the page opened are not news. The count is
// cleared the moment the person can see the latest again. Pure but for the clock, which a test gives.
import type { ChatEvent, ChatState } from '#chat';
import { chatConditions } from '#chat';
import type { ChatWork } from '../board/host.ts';

/** What the board's mark shows: nothing, the agent working, or the agent waiting for the person's OK. */
export type AgentWork = ChatWork;

/** The mark from the chat's conditions: `waiting` (a question open) before `busy` (the turn runs). */
export function agentWork(s: ChatState): AgentWork {
  const holding = chatConditions(s);
  return holding.includes('waiting') ? 'asking' : holding.includes('busy') ? 'working' : 'idle';
}

/** Whether `e` is a reply that landed at or after `since` (ms since the epoch, the page's clock: the
 *  server is on the same machine and stamps `at` as it emits). */
export const isNewReply = (e: ChatEvent, since: number): boolean =>
  e.kind === 'message_out' && e.interim !== true && Date.parse(e.at) >= since;

export interface ReplyNewsDeps {
  /** Whether the person can see the latest of the feed now: the panel open, the feed following. */
  seen(): boolean;
  /** The count of replies not seen changed. */
  count(n: number): void;
  /** A reply landed out of sight: say so, with a way to it. */
  announce(): void;
  /** The clock; the page's by default. */
  now?(): number;
}

export interface ReplyNews {
  /** A session is followed from its start: nothing is news before now. */
  follow(): void;
  /** One event applied to the feed. */
  event(e: ChatEvent): void;
  /** The person may see the latest now (the panel opened, the feed back at the latest): clear the count if so. */
  check(): void;
  readonly count: number;
}

export function createReplyNews(d: ReplyNewsDeps): ReplyNews {
  const now = d.now ?? (() => Date.now());
  let [n, since] = [0, now()];
  const set = (next: number) => {
    if (next === n) return;
    n = next;
    d.count(n);
  };
  return {
    follow() { since = now(); set(0); },
    event(e) {
      if (!isNewReply(e, since) || d.seen()) return;
      set(n + 1);
      d.announce();
    },
    check() { if (n > 0 && d.seen()) set(0); },
    get count() { return n; },
  };
}

/** What the page tells the chat panel for working alongside (chat-panel.ts `ChatPanelDeps`; the
 *  workAlongside flag: App.svelte passes them only with it on). */
export interface NewsHost {
  /** Whether the sidebar is open. */
  isOpen?(): boolean;
  /** The count of replies not seen changed. */
  news?(count: number): void;
  /** A reply landed out of sight: say so, with `open`, which opens the chat at it. */
  announce?(open: () => void): void;
}

/** What the panel's news reads of the panel: its feed once drawn, and a way to open and draw it. */
export interface NewsPanel {
  feed(): (HTMLElement & { follow(): void }) | null;
  /** Open the sidebar and draw it; true once drawn. */
  reveal(): Promise<boolean>;
  /** Put focus in the composer: the toast's button that had it is gone. */
  focus(): void;
}

export interface PanelNews extends Pick<ReplyNews, 'follow' | 'event'> {
  /** The feed was drawn: the person scrolling back to the latest sees the replies there. */
  drawn(feed: HTMLElement): void;
  /** The sidebar opened: with replies not seen, the feed goes to the latest. */
  opened(): void;
}

/** The chat panel's side of working alongside: the replies not seen, told to the page. */
export function panelNews(host: NewsHost, panel: NewsPanel): PanelNews {
  const news = createReplyNews({
    seen: () => {
      const feed = panel.feed();
      return !!feed && host.isOpen?.() === true && feed.dataset.following !== 'false';
    },
    count: (n) => host.news?.(n),
    announce: () => host.announce?.(() => void toLatest(true)),
  });
  async function toLatest(focus = false) {
    if (!(await panel.reveal())) return;
    panel.feed()?.follow();
    news.check();
    if (focus) panel.focus();
  }
  return {
    follow: () => news.follow(),
    event: (e) => news.event(e),
    drawn: (feed) => new MutationObserver(() => news.check()).observe(feed, { attributeFilter: ['data-following'] }),
    opened() { if (news.count > 0) void toLatest(); },
  };
}
