// What needs the person's attention on the page (FE_01, D-033), read from the conditions table
// (packages/actions conditions.ts) and never from page-local sets: the picker's " · new" and
// " · changed" marks (`board.new`, `board.changed`, never on the open board), the container badges
// (`container.owed`), the requests the strip announces (`grant.requested` lines in the batch), the
// proposals on the cards and the bar (`proposal.open`, `proposal.stale`; announced when their line
// is in the batch), the changed cards (`item.unseen`, update-flow.ts), the cards awaiting a handover
// (`item.awaiting`, parking.ts), whether Send to agent has anything to send (`board.unsent`) and the
// "agent drew" toast (`board.drawn`, when its line is in the batch), and with the freshCards flag the
// new and updated cards (`shell.freshCards`, the toolbar's "N new") and the fresh containers
// (`container.fresh`, their border and pill), none while a past version shows. `pageConditions` (board-data.ts, also the
// gallery's) is the one read; this runs it after every batch and switch,
// and records the board seen (api.md 87) that ends the marks, whenever one is due (`boardNews`):
// when a board opens, when the page leaves it (a switch, or the page going away) and, while it
// stays open, at most once a minute when an agent's line arrives. Never while a past version of
// the board shows (versions.ts): the person is not looking at now.
import type { LedgerEvent } from '#format';
import type { LedgerState } from '#actions';
import { boardNews } from '#actions';
import type { FreshCount, ProposalFound } from './board-data.ts';
import { pageConditions } from './board-data.ts';
import { markBoardSeen } from './io.ts';
import { shell } from '../shell/shell.svelte.ts';

/** The least time between two board seen lines while a board stays open (api.md 87). */
const SEEN_EVERY_MS = 60_000;

export interface AttentionDeps {
  state(): LedgerState | null;
  /** The open board's id; '' before one opens. */
  board(): string;
  fail(err: unknown): void;
  /** A past version of the open board shows: no board seen. */
  readOnly(): boolean;
  /** The freshCards flag: the "N new" list and the fresh containers. */
  fresh?: boolean;
}

export interface Attention {
  /** After a batch was applied (`full`: the state was read afresh): marks, badges and the strip's
   * news again; true when the agent drew on the open board in this batch (the toast). */
  batch(lines: readonly LedgerEvent[], full: boolean): boolean;
  /** The open board changed from `from` (already set): a board seen for the one left and the one
   * opened, and every mark read again. */
  switched(from: string): void;
  /** The containers on the open board the agent owes an answer on: their badges. */
  owed(): ReadonlySet<string>;
  /** The agent's proposals on the open board not yet answered (proposal-flow.ts). */
  proposals(): readonly ProposalFound[];
  /** The items on the open board whose latest version the person has not seen (update-flow.ts). */
  unseen(): ReadonlySet<number>;
  /** The items the agent added in the open board's latest round and the person has not seen: NEW (update-flow.ts). */
  fresh(): ReadonlySet<number>;
  /** The items on the open board in Later whose handover is still owed (parking.ts). */
  awaiting(): ReadonlySet<number>;
  /** The cards on the open board owed an answer or a handover (`item.owed`): "Hide answered" keeps them. */
  owedCards(): ReadonlySet<number>;
  /** The fresh containers on the open board and their pills' counts (`container.fresh`); none with
   * the freshCards flag off or while a past version shows. */
  freshIn(): ReadonlyMap<string, FreshCount>;
  destroy(): void;
}

export function createAttention(d: AttentionDeps): Attention {
  let owed = new Set<string>();
  let proposals: ProposalFound[] = [];
  let unseen: ReadonlySet<number> = new Set();
  let fresh: ReadonlySet<number> = new Set();
  let awaiting: ReadonlySet<number> = new Set();
  let owedCards: ReadonlySet<number> = new Set();
  let freshIn: ReadonlyMap<string, FreshCount> = new Map();
  const none: ReadonlyMap<string, FreshCount> = new Map();
  let timer = 0;
  let sentAt = 0;
  /** board -> the head last sent, so a board seen still on its way is not sent twice. */
  const sent = new Map<string, number>();

  /** Record a board seen on `board` when it would carry a mark if it were not open. */
  function see(board: string, leaving = false) {
    const s = d.state();
    const head = s?.heads.get(board);
    if (!s || d.readOnly() || head === undefined || !boardNews(s, board) || (sent.get(board) ?? 0) >= head) return;
    sent.set(board, head);
    sentAt = Date.now();
    markBoardSeen(board, head, leaving).catch((err: unknown) => {
      sent.delete(board);
      d.fail(err);
    });
  }

  /** While a board stays open: a board seen when one is due, at most once a minute. */
  function keep() {
    const s = d.state();
    if (timer || !s || d.readOnly() || !d.board() || !boardNews(s, d.board())) return;
    timer = window.setTimeout(() => { timer = 0; see(d.board()); }, Math.max(0, sentAt + SEEN_EVERY_MS - Date.now()));
  }

  /** Read the conditions again; true when the agent drew on the open board from line `from` on. */
  function read(from: number): boolean {
    const s = d.state();
    if (!s) return false;
    const c = pageConditions(s, d.board());
    owed = c.owed;
    proposals = c.proposals;
    unseen = c.unseen;
    fresh = c.fresh;
    awaiting = c.awaiting;
    owedCards = c.owedCards;
    freshIn = d.fresh ? c.freshIn : none;
    const cards = d.fresh ? c.freshCards : [];
    if (JSON.stringify(cards) !== JSON.stringify(shell.freshCards)) shell.freshCards = cards;
    if (JSON.stringify(c.marks) !== JSON.stringify(shell.boardMarks)) shell.boardMarks = c.marks;
    shell.unsent = c.unsent;
    const news = c.requests.filter((seq) => seq >= from);
    if (news.length) shell.requestNews = news;
    const proposed = c.proposals.map((p) => p.seq).filter((seq) => seq >= from);
    if (proposed.length) shell.proposalNews = proposed;
    return c.drawn !== undefined && c.drawn >= from;
  }

  const leave = () => see(d.board(), true);
  addEventListener('pagehide', leave);

  return {
    batch(lines, full) {
      const drew = read(full ? Infinity : lines[0]?.seq ?? Infinity);
      keep();
      return drew;
    },
    switched(from) {
      clearTimeout(timer);
      timer = 0;
      if (from) see(from);
      see(d.board());
      read(Infinity);
    },
    owed: () => owed,
    proposals: () => proposals,
    unseen: () => unseen,
    fresh: () => fresh,
    awaiting: () => awaiting,
    owedCards: () => owedCards,
    freshIn: () => (d.readOnly() ? none : freshIn),
    destroy() {
      clearTimeout(timer);
      removeEventListener('pagehide', leave);
    },
  };
}
