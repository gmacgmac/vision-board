// A card's history (card-polish BE_02, PLAN Key Changes 7): what happened to one card, newest first,
// as a time and one line ("Agent drew v3", "You sent note 1"). It says when what happened, never
// what was said: no note, reply, reason or handover text is copied (that is on the card), and the
// person's private marks (`PRIVATE_ACTIONS`: the flag, hidden notes, a board's archive or lock) and
// `seen` lines never show. A card is an identity (D-041): its lines are matched by identity, so a
// card keeps one history whatever its board number. A note on a group of cards shows on each card it
// names; an edit or removal is matched by the note it names. Notes are numbered as the card numbers
// them (notes.ts `liveNotes`, the pin numbers); a removed note has no number left, so its rows say
// "a note" and link nowhere. An allow or stop of the card's app (api.md 150) shows on the card. A
// retired card is gone for good (api.md 126): there is no restore of a card. One matcher
// (`cardsAbout`) and one set of words (`saidOf`, `historyRow`), which the page's per-card times
// (card-times.ts, card-polish FE_03) read too. Pure: lines in, rows out.
import type { ActEvent, LedgerEvent, NodeSize } from '#format';
import { isPrivateAct, LATER_REGION } from '#format';
import type { Ask } from './notes.ts';
import { askOf, cardsOf, foldNoteAct, liveNotes } from './notes.ts';
import * as actionsHistoryWords from './words/actions-history.ts';

/** What a history row says happened. `context` is More context with no words: an ask, not a note. */
export const HISTORY_KINDS = [
  'drawn', 'note-sent', 'note-edited', 'note-removed', 'context', 'replied', 'check', 'cross', 'reopened',
  'later', 'parked', 'size', 'moved', 'pinned', 'reset', 'proposed', 'proposal-answered', 'app-allowed',
  'app-stopped', 'removed',
] as const;
export type HistoryKind = (typeof HISTORY_KINDS)[number];

/** One line of a card's history. `at` is the line's ISO time; `agent` the agent's label (its id when
 * no label is known) on an agent's line. `note`: the `seq` of the note the row names, while that note
 * is still on the card; `reply`: the reply's own `seq` on a `replied` row. The page links both. */
export interface HistoryRow {
  seq: number; at: string; who: 'person' | 'agent'; agent?: string; kind: HistoryKind; words: string;
  note?: number; reply?: number;
}

/** What a row says, as data, before its words: its kind, the `seq` of the note it names (its own, the
 * edited or removed one, or the one replied to), the version drawn, how many cards a group note is on,
 * the ✓ or ✗ of a proposal (none: turned down), the size picked, and whether a move was to Later. */
export interface Said {
  kind: HistoryKind; note?: number; ver?: number; cards?: number; mark?: '✓' | '✗'; size?: NodeSize | 'auto'; later?: boolean;
}

/** Where a line's notes and app cards are looked up: the asks by `seq`, the cards that show an app. */
export interface Lookup { ask(seq: number): Ask | undefined; appCards(app: string): readonly number[] }

/** A line as a row reads it: when, by whom. */
export interface RowLine { seq: number; at: string; by: 'person' | 'agent'; agent?: string }

const MARK = { ack: '✓', drop: '✗' } as const;
const SIZE_WORD = { s: 'S', m: 'M', l: 'L' } as const;

/** Each kind's words after "You" or "Agent", given the named note's number while it is on the card. */
const SAY: Record<HistoryKind, (d: Said, n?: number) => string> = {
  drawn: (d) => actionsHistoryWords.drewV(d.ver),
  'note-sent': (d, n) => (n === undefined ? 'sent a note' : actionsHistoryWords.sentNote(n, d.cards ? actionsHistoryWords.onCards(d.cards) : '')),
  'note-edited': (_, n) => (n === undefined ? 'edited a note' : actionsHistoryWords.editedNote(n)),
  'note-removed': () => 'removed a note',
  context: () => actionsHistoryWords.askedForMoreContext,
  replied: (d, n) => (d.note === undefined ? 'replied' : n === undefined ? actionsHistoryWords.repliedToANote : actionsHistoryWords.repliedToNote(n)),
  check: () => actionsHistoryWords.markedIt,
  cross: () => actionsHistoryWords.markedIt2,
  reopened: () => actionsHistoryWords.reopenedIt,
  later: () => actionsHistoryWords.savedItForLater,
  parked: () => actionsHistoryWords.parkedIt,
  size: (d) => (d.size === undefined || d.size === 'auto' ? actionsHistoryWords.setItsSizeBackTo : actionsHistoryWords.setItsSizeTo(SIZE_WORD[d.size])),
  moved: (d) => (d.later ? actionsHistoryWords.movedItToLater : actionsHistoryWords.movedItToAnotherContainer),
  pinned: () => actionsHistoryWords.placedIt,
  reset: () => actionsHistoryWords.resetItsPlace,
  proposed: (d) => actionsHistoryWords.proposed(d.mark),
  'proposal-answered': (d) => (d.mark ? actionsHistoryWords.acceptedTheProposal(d.mark) : actionsHistoryWords.turnedDownTheProposal),
  'app-allowed': () => actionsHistoryWords.allowedTheApp,
  'app-stopped': () => actionsHistoryWords.stoppedTheApp,
  removed: () => actionsHistoryWords.removedIt,
};

/** The cards a line is about, by identity: its own card, every card of a group note, the cards of the
 * note an edit or removal names, a retire's cards, the cards that show the app an allow or stop names.
 * A private mark, a `seen`, a note on a whole container and a board's own lines are about none. */
export function cardsAbout(e: LedgerEvent, look: Lookup): readonly number[] {
  switch (e.type) {
    case 'node': case 'reply': case 'propose': case 'park': return [e.id];
    case 'retire': return e.cards;
    case 'act': {
      if (isPrivateAct(e)) return [];
      if (e.action === 'note-edit' || e.action === 'note-remove') {
        const a = look.ask(e.note ?? 0);
        return a ? cardsOf(a) : [];
      }
      if (e.action === 'app-allow' || e.action === 'app-revoke') return look.appCards(e.app!);
      return e.nodes ?? (e.id === undefined ? [] : [e.id]);
    }
    default: return [];
  }
}

/** What one of the person's acts on a card says, or undefined when it shows in no history. */
function actSaid(e: ActEvent, look: Lookup): Said | undefined {
  switch (e.action) {
    case 'comment': case 'context':
      if (!e.text?.trim()) return { kind: 'context' };
      return { kind: 'note-sent', note: e.seq, ...(e.nodes && e.nodes.length > 1 && { cards: e.nodes.length }) };
    case 'note-edit': case 'note-remove': {
      const a = look.ask(e.note ?? 0);
      return a && { kind: e.action === 'note-remove' ? 'note-removed' : 'note-edited', note: a.seq };
    }
    case 'ack': case 'drop':
      return e.proposal === undefined ? { kind: e.action === 'ack' ? 'check' : 'cross' } : { kind: 'proposal-answered', mark: MARK[e.action] };
    case 'reject': return { kind: 'proposal-answered' };
    case 'reopen': return { kind: 'reopened' };
    case 'later': return { kind: 'later' };
    case 'size': return { kind: 'size', ...(e.size !== undefined && { size: e.size }) };
    case 'move': return { kind: 'moved', ...(e.region === LATER_REGION && { later: true }) };
    case 'pin': return { kind: 'pinned' };
    case 'unpin': return { kind: 'reset' };
    case 'app-allow': return { kind: 'app-allowed' };
    case 'app-revoke': return { kind: 'app-stopped' };
    default: return undefined;
  }
}

/** What a line says on a card it is about (`cardsAbout`); the same on every card it names. Undefined
 * for a line that shows in no history (a private mark, a `seen`, a Send). */
export function saidOf(e: LedgerEvent, look: Lookup): Said | undefined {
  switch (e.type) {
    case 'node': return { kind: 'drawn', ver: e.ver };
    case 'act': return isPrivateAct(e) ? undefined : actSaid(e, look);
    case 'reply': return look.ask(e.to ?? 0)?.text === undefined ? { kind: 'replied' } : { kind: 'replied', note: e.to! };
    case 'propose': return { kind: 'proposed', mark: MARK[e.action] };
    case 'park': return { kind: 'parked' };
    case 'retire': return { kind: 'removed' };
    default: return undefined;
  }
}

/** Each note still on a card, by `seq`, to its number there, from the card's asks (`liveNotes`). */
export const noteNumbers = (asks: readonly Ask[]): Map<number, number> =>
  new Map(liveNotes({ asks: [...asks], decisions: [] }).map((a, i) => [a.seq, i + 1]));

/** The row line `line` makes, saying `d`; `numbers` (`noteNumbers`) numbers the notes still on the
 * card, `labels` names agents by id (`LedgerState.agents`). */
export function historyRow(line: RowLine, d: Said, numbers: ReadonlyMap<number, number>, labels?: ReadonlyMap<string, string>): HistoryRow {
  const n = d.note === undefined ? undefined : numbers.get(d.note);
  const agent = line.by === 'agent' && line.agent !== undefined ? labels?.get(line.agent) ?? line.agent : undefined;
  return {
    seq: line.seq, at: line.at, who: line.by, ...(agent !== undefined && { agent }), kind: d.kind,
    words: `${line.by === 'person' ? actionsHistoryWords.you : actionsHistoryWords.agent} ${SAY[d.kind](d, n)}`,
    ...(n !== undefined && { note: d.note }), ...(d.kind === 'replied' && { reply: line.seq }),
  };
}

/** Card `id`'s history (its identity, never its board number), newest first, from `events`: any run
 * of ledger lines in order, the whole ledger or only the lines about the card. `labels` names agents
 * by id (`LedgerState.agents`). */
export function cardHistory(events: readonly LedgerEvent[], id: number, labels?: ReadonlyMap<string, string>): HistoryRow[] {
  const asks = new Map<number, Ask>();
  let app: string | undefined;
  const look: Lookup = { ask: (seq) => asks.get(seq), appCards: (a) => (a === app ? [id] : []) };
  const drafts: { e: LedgerEvent; d: Said }[] = [];
  for (const e of events) {
    // An allow or stop shows from the first line that draws the card with its app.
    if (e.type === 'node' && e.id === id) app = e.node.app?.id;
    if (!cardsAbout(e, look).includes(id)) continue;
    const d = saidOf(e, look);
    if (d) drafts.push({ e, d });
    // The card's asks, as edited and removed, number its notes once every line is read.
    if (e.type === 'act' && (e.action === 'comment' || e.action === 'context')) asks.set(e.seq, askOf(e, () => 0));
    else if (e.type === 'act' && (e.action === 'note-edit' || e.action === 'note-remove')) foldNoteAct(asks.get(e.note!)!, e);
  }
  const numbers = noteNumbers([...asks.values()]);
  return drafts.map(({ e, d }) => historyRow(e, d, numbers, labels)).sort((a, b) => b.seq - a.seq);
}
