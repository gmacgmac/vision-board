// Folds the project ledger (D-017) into board state: what the agent drew (folded by
// `applyDrawn` in packages/format, which also gives `boardView`), the container index (folded by
// `indexEvent` in packages/format: agents, creators, holders, grant requests), plus the person's
// responses (status and notes: notes.ts), replies, proposals, parks, sizes, moves (moves.ts), Sends
// and what the person has seen (each node's version, each board's line), each agent's retry keys,
// and each board's own last line, last drawing line, last agent line, runs and from where its cards are new (rounds.ts),
// what its next Send carries (unsent.ts), what was retired (retire.ts), the person's private
// flags (card-flags.ts), the boards the person archived (archive.ts) and locked (lock.ts), each
// board's dates, the agent's clears (clears.ts), each app's allowed hash (apps.ts) and each card's times (card-times.ts). Every map is
// keyed by a card's identity (`id`); the reads give board numbers (numbers.ts, api.md 125). One board
// as the page reads it: board-state.ts. Pure: same events, same state; events are assumed valid.
import type {
  ActEvent, DrawnState, LedgerEvent, LedgerIndex, LedgerRegion, Mode, NodeSize, ParkBundle, ProposeEvent, Widths,
} from '#format';
import { applyDrawn, BOARD_MARKS, emptyDrawn, emptyIndex, indexEvent, isContainerAct, isPrivateAct } from '#format';
import { type BoardDates, foldArchive } from './archive.ts';
import { type AppAllows, foldAppAct } from './apps.ts';
import { foldLock } from './lock.ts';
import type { Place } from './containers.ts';
import { applyContainerAct } from './containers.ts';
import type { Ask, ItemLog, ItemNote, ItemState } from './notes.ts';
import { askOf, askVer, cardsOf, foldNoteAct, itemOf, latestAsk } from './notes.ts';
import { eventBoard } from './references.ts';
import { closeProposals, endProposal } from './proposals.ts';
import { foldRetire, keepRetiredRegion } from './retire.ts';
import { foldFlag } from './card-flags.ts';
import { foldNotesHidden } from './card-notes-hidden.ts';
import { addDrawing, seeBoard } from './rounds.ts';
import { foldUnsent } from './unsent.ts';
import { type Clear, cutOf, foldClears } from './clears.ts';
import { type CardTimes, foldCardTimes } from './card-times.ts';

export type { ItemNote, ItemState } from './notes.ts';

export interface LedgerReply { seq: number; at: string; text: string; to?: number; agent?: string }
/** An agent's proposal on card `id` (its identity; the reads give its board number as `n`). */
export interface Proposal {
  seq: number; at: string; id: number; ver: number; action: ProposeEvent['action'];
  reason: string; source?: string; agent?: string;
  /** `seq` of the line that ended it, and how (api.md 93): `accepted` by the act naming it with its
   * own action, `rejected`, or `closed` by an acknowledge or drop on its card or its card's retire
   * line (api.md 127). */
  decidedBy?: number;
  outcome?: 'accepted' | 'rejected' | 'closed';
}

/** What the pending rules need per node (api.md 36): the person's latest comment or "needs
 * context" (its `seq` and the version it was made on), the latest "later", the latest park. */
export interface Marks {
  ask?: { kind: 'comment' | 'context'; seq: number; ver: number };
  later?: number;
  park?: number;
}

/** A kept grant request's words: why the agent asked, and the person's note if refused. */
export interface GrantNote { reason: string; at: string; text?: string }

/** What was drawn (DrawnState, from packages/format) plus the person's side, and the person's allows of
 * app code (`appAllowed`, apps.ts). */
export interface LedgerState extends DrawnState, AppAllows {
  /** The container index, folded by packages/format (`indexEvent`), never folded again here. */
  index: LedgerIndex;
  /** Agent id -> the label it joined with. */
  agents: Map<string, string>;
  /** `grant-request` seq -> its words. The ledger refuses a second open request from the same
   * agent for the same container (api.md 26), so every request is kept. */
  grantNotes: Map<number, GrantNote>;
  items: Map<number, ItemState>;
  replies: Map<number, LedgerReply[]>;
  pins: Map<number, { x: number; y: number }>;
  /** Card id -> the container of the person's latest `move` (api.md 66): it wins over the agent's. */
  moves: Map<number, string>;
  /** Card id -> the person's size pick; `auto` deletes it (api.md 16). */
  sizes: Map<number, NodeSize>;
  /** board -> region -> the person's layout choice. */
  modes: Map<string, Map<string, Mode>>;
  /** board -> region -> the person's card widths choice (api.md 132), folded like `modes`. */
  widths: Map<string, Map<string, Widths>>;
  /** board -> `seq` of the person's latest Send. */
  lastSend: Map<string, number>;
  /** board -> the lines since its last Send that the next Send carries, and card id -> its ✓, ✗, Later
   * or clear among them, so a newer one replaces it without a scan (unsent.ts): `board.unsent`. */
  unsent: Map<string, Set<number>>;
  unsentMarks: Map<string, Map<number, number>>;
  /** agent -> retry key -> `seq` of the event that carried it, across the project (api.md 29). */
  keys: Map<string, Map<string, number>>;
  /** Card id -> latest version the person has seen. */
  seen: Map<number, number>;
  /** Card id -> `seq` of the person's latest card `seen` line or act naming it (api.md 94). */
  looked: Map<number, number>;
  /** Card id -> the latest clear the agent's answer made on it (clears.ts, D-045 ruling 7). */
  clears: Map<number, Clear>;
  /** propose `seq` -> proposal. */
  proposals: Map<number, Proposal>;
  parks: Map<number, ParkBundle>;
  marks: Map<number, Marks>;
  /** Card id -> the item's asks and decisions, from which `items` is worked out (notes.ts). */
  logs: Map<number, ItemLog>;
  /** `seq` of a `comment` or `context` act -> its ask, so `note-edit` and `note-remove` find it. */
  asks: Map<number, Ask>;
  /** board -> region -> the person's place for that container (containers.ts, api.md 74). */
  regionPins: Map<string, Map<string, Place>>;
  /** board -> region -> the notes on that whole container (containers.ts, api.md 73). */
  regionLogs: Map<string, Map<string, ItemLog>>;
  /** Every person act, in order, for `responsesAfter`. */
  acts: ActEvent[];
  /** board -> `seq` of its own last line (references.ts `eventBoard`): `list_boards` and the page's
   * picker. The person's board `seen` is not a change to the board, so it moves no head (api.md 87). */
  heads: Map<string, number>;
  /** board -> `seq` of the last line an agent drew on it (`DRAWING_EVENTS`): conditions `board.drawn`. */
  drawnHeads: Map<string, number>;
  /** board -> `seq` of the last line any agent wrote on it (drawing, replies, proposals, requests):
   * conditions `board.changed`, which the person's own acts never set off. */
  agentHeads: Map<string, number>;
  /** board -> the highest `head` of the person's board `seen` (api.md 87): `board.new`, `board.changed`. */
  seenBoards: Map<string, number>;
  /** board -> the `head` of the person's first board seen on it: `item.new` counts from it (rounds.ts). */
  firstSeenBoards: Map<string, number>;
  /** board -> the end of each run of agent drawing lines on it, oldest first: its versions
   * (reads.ts `boardVersions`). */
  runs: Map<string, BoardRun[]>;
  /** Card id -> `seq` of the line that drew its first version: conditions `item.new`. */
  firstDrawn: Map<number, number>;
  /** board -> its first card line and the index in `runs` of the run it came in (rounds.ts). */
  firstCards: Map<string, { seq: number; run: number }>;
  /** `containerKey` -> a retired container as it was, and its retire line (`show_container`, api.md 127). */
  retiredRegions: Map<string, { region: LedgerRegion; seq: number }>;
  /** Card id -> `seq` of the person's `flag` on it, while it stands (card-flags.ts, api.md 128).
   * The page's only: no agent read looks here. */
  flags: Map<number, number>;
  /** Card id -> `seq` of the person's `notes-hide` on it, while it stands; the page's only (card-notes-hidden.ts, api.md 156). */
  notesHidden: Map<number, number>;
  /** board -> `seq` of the person's `archive` of it, while it stands (archive.ts, api.md 135). Read
   * through `boardVisibility` only. */
  archived: Map<string, number>;
  /** board -> `seq` of the person's `lock` of it, while it stands (lock.ts, api.md 138). Read through
   * `boardLocked`, which counts an archived board as locked too. */
  locked: Map<string, number>;
  /** board -> when its first line and its own last line (`heads`) were written: the page's archive
   * confirm and Archived list (api.md 137). */
  dates: Map<string, BoardDates>;
  /** Card id -> when the history box's few kinds happened to it, without words (card-times.ts, card-polish FE_03). */
  times: CardTimes;
}

/** The last line of one run of drawing lines by one agent on one board, with no other line on
 * that board between them (a board seen is none): one version of the board, "v<seq>". */
export interface BoardRun { seq: number; at: string; agent?: string }

/** The agent's drawing lines: what "the agent drew" means (conditions `board.drawn`, the page's
 * toast, a board version). A retire takes cards off the board, so it is one (api.md 127). */
export const DRAWING_EVENTS: ReadonlySet<LedgerEvent['type']> = new Set(['board', 'region', 'node', 'link', 'unlink', 'retire']);

export const emptyState = (): LedgerState => ({
  ...emptyDrawn(), index: emptyIndex(), agents: new Map(), grantNotes: new Map(), items: new Map(),
  replies: new Map(), pins: new Map(), moves: new Map(), sizes: new Map(), modes: new Map(), widths: new Map(), lastSend: new Map(), unsent: new Map(), unsentMarks: new Map(),
  keys: new Map(), seen: new Map(), looked: new Map(), clears: new Map(), proposals: new Map(), parks: new Map(), marks: new Map(),
  logs: new Map(), asks: new Map(), regionPins: new Map(), regionLogs: new Map(), acts: [], heads: new Map(),
  drawnHeads: new Map(), agentHeads: new Map(), seenBoards: new Map(), runs: new Map(),
  firstDrawn: new Map(), firstSeenBoards: new Map(), firstCards: new Map(),
  retiredRegions: new Map(), flags: new Map(), notesHidden: new Map(), archived: new Map(), locked: new Map(), dates: new Map(), appAllowed: new Map(), times: new Map(),
});

/** Fold every event, in order, into the current state. */
export function foldLedger(events: readonly LedgerEvent[]): LedgerState {
  const s = emptyState();
  for (const e of events) applyEvent(s, e);
  return s;
}

/** One of the person's private marks: a flag, hidden notes, an archive or restore, a lock or unlock. */
function foldMark(s: LedgerState, e: ActEvent): void {
  if (e.action === 'notes-hide' || e.action === 'notes-show') return foldNotesHidden(s, e);
  if (!BOARD_MARKS.has(e.action)) return foldFlag(s, e);
  return e.action === 'lock' || e.action === 'unlock' ? foldLock(s, e) : foldArchive(s, e);
}

const push = <K, V>(m: Map<K, V[]>, k: K, v: V) => { m.set(k, [...(m.get(k) ?? []), v]); };
const marksOf = (s: LedgerState, id: number): Marks => {
  const m = s.marks.get(id) ?? {};
  s.marks.set(id, m);
  return m;
};

/** Apply one valid event to `s`: the drawn part and the index in format, the rest here. The
 * person's private marks fold into `flags`, `notesHidden`, `archived` and `locked` only: they move no head, see no
 * card and are no answer (api.md 128, 135, 138, 156). */
export function applyEvent(s: LedgerState, e: LedgerEvent): void {
  if (e.type === 'retire') keepRetiredRegion(s, e);
  applyDrawn(s, e);
  indexEvent(s.index, e);
  if (isPrivateAct(e)) return foldMark(s, e as ActEvent);
  const board = eventBoard(s, e);
  const before = board === undefined ? undefined : s.heads.get(board);
  if (board !== undefined && !(e.type === 'seen' && 'board' in e)) {
    s.heads.set(board, e.seq);
    s.dates.set(board, { created: s.dates.get(board)?.created ?? e.at, updated: e.at });
  }
  // The person's `board` line (a rename, api.md 90) is no agent drawing: no toast, no version.
  if (board !== undefined && DRAWING_EVENTS.has(e.type) && e.by === 'agent') {
    s.drawnHeads.set(board, e.seq);
    addDrawing(s, board, e, before);
  }
  if (board !== undefined && e.by === 'agent') s.agentHeads.set(board, e.seq);
  if ('key' in e && e.key !== undefined && e.agent !== undefined) {
    const keys = s.keys.get(e.agent) ?? new Map<string, number>();
    s.keys.set(e.agent, keys.set(e.key, e.seq));
  }
  switch (e.type) {
    case 'join': if (e.agent !== undefined) s.agents.set(e.agent, e.label); break;
    case 'grant-request': s.grantNotes.set(e.seq, { reason: e.reason, at: e.at }); break;
    case 'act': s.acts.push(e); applyAct(s, e); seeCards(s, e); if (board !== undefined) foldUnsent(s, board, e); break;
    case 'seen': if ('id' in e) look(s, e.id, e.ver, e.seq); else seeBoard(s, e.board, e.head); break;
    case 'retire': foldRetire(s, e); break;
    case 'reply':
      push(s.replies, e.id, { seq: e.seq, at: e.at, text: e.text, ...(e.to !== undefined && { to: e.to }), ...(e.agent && { agent: e.agent }) });
      for (const id of foldClears(s, e)) restate(s, id, s.logs.get(id)!);
      break;
    case 'node': for (const id of foldClears(s, e)) restate(s, id, s.logs.get(id)!); break;
    case 'propose':
      s.proposals.set(e.seq, {
        seq: e.seq, at: e.at, id: e.id, ver: e.ver, action: e.action, reason: e.reason,
        ...(e.source && { source: e.source }), ...(e.agent && { agent: e.agent }),
      });
      break;
    case 'park': s.parks.set(e.id, e.bundle); marksOf(s, e.id).park = e.seq; break;
  }
  foldCardTimes(s, e);
}

function applyAct(s: LedgerState, e: ActEvent): void {
  if (isContainerAct(e)) return applyContainerAct(s, e);
  switch (e.action) {
    case 'mode': {
      const regions = s.modes.get(e.board!) ?? new Map<string, Mode>();
      s.modes.set(e.board!, regions.set(e.region!, e.mode!));
      break;
    }
    case 'widths': {
      const regions = s.widths.get(e.board!) ?? new Map<string, Widths>();
      s.widths.set(e.board!, regions.set(e.region!, e.widths!));
      break;
    }
    case 'pin': s.pins.set(e.id!, { x: e.x!, y: e.y! }); break;
    case 'unpin': s.pins.delete(e.id!); break;
    // A pin is local to its container (rule 9), so a card that changes container leaves it behind.
    case 'move':
      for (const id of e.nodes ?? [e.id!]) {
        s.moves.set(id, e.region!);
        s.pins.delete(id);
      }
      break;
    case 'size': if (e.size === 'auto') s.sizes.delete(e.id!); else s.sizes.set(e.id!, e.size!); break;
    case 'reject': endProposal(s.proposals.get(e.proposal!), e.seq, 'rejected'); break;
    case 'send': s.lastSend.set(e.board!, e.seq); break;
    case 'deny': { const note = s.grantNotes.get(e.request!); if (note && e.text) note.text = e.text; break; }
    case 'grant': case 'revoke': break; // holders live in the index
    case 'app-allow': case 'app-revoke': foldAppAct(s, e); break;
    default: applyItemAct(s, e);
  }
}

/** An act on one item: a decision, an ask (`comment`, `context`), or a change to a note. The
 * status, notes and owed ask of every card it touches (all the cards of a note on a group) are
 * worked out again from their logs (notes.ts). */
function applyItemAct(s: LedgerState, e: ActEvent): void {
  const ask = e.note === undefined ? undefined : s.asks.get(e.note);
  const logOf = (id: number): ItemLog => {
    const log = s.logs.get(id) ?? { asks: [], decisions: [] };
    s.logs.set(id, log);
    return log;
  };
  let cards = ask ? cardsOf(ask) : [e.id!];
  if (e.action === 'comment' || e.action === 'context') {
    const made = askOf(e, (id) => s.nodes.get(id)?.versions.at(-1)?.ver ?? 0);
    cards = cardsOf(made);
    for (const id of cards) logOf(id).asks.push(made);
    s.asks.set(e.seq, made);
  } else if (ask) foldNoteAct(ask, e);
  else logOf(e.id!).decisions.push({ seq: e.seq, action: e.action });
  for (const id of cards) restate(s, id, logOf(id));
  if (e.action === 'later') marksOf(s, e.id!).later = e.seq;
  if (e.action === 'ack' || e.action === 'drop') closeProposals(s, e);
}

/** Any person act naming cards, but a Send, counts as seeing each one's latest version (api.md 94).
 * A note on or a place for a whole container names no card. */
function seeCards(s: LedgerState, e: ActEvent): void {
  if (e.action === 'send' || isContainerAct(e)) return;
  for (const id of e.nodes ?? (e.id === undefined ? [] : [e.id])) look(s, id, s.nodes.get(id)!.versions.at(-1)!.ver, e.seq);
}

/** The person looked at card `id` at version `ver` on line `seq`: `seen` is raised, never lowered. */
const look = (s: LedgerState, id: number, ver: number, seq: number): void => { s.seen.set(id, Math.max(s.seen.get(id) ?? 0, ver)); s.looked.set(id, seq); };

/** Card `id`'s status, notes and owed ask, from its log and the agent's latest clear on it. */
function restate(s: LedgerState, id: number, log: ItemLog): void {
  s.items.set(id, itemOf(log, cutOf(s, id)));
  const latest = latestAsk(log);
  const m = marksOf(s, id);
  if (latest) m.ask = { kind: latest.kind, seq: latest.seq, ver: askVer(latest, id) };
  else delete m.ask;
}

// When a note is history (a Send after it, or the agent's answer) lives in note-lock.ts.
export { sentAfter, sentNotes } from './note-lock.ts';
