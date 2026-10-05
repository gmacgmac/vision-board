// A person's notes on an item, and the item's status worked out from them (2e_FE_01, api.md
// 58-61). A note is made by a `comment` or `context` act with words and is named, for ever, by
// that act's `seq`. Until a Send after it, `note-edit` changes its words (and, with `kind`, what
// it asks for) and `note-remove` takes it back; both are new acts, so the ledger stays
// append-only (D-017). After a Send it is history. Pure: the fold calls `foldNoteAct` and
// `itemOf`; the reads call `liveNotes` and `noteView`.
import type { ActEvent, NoteKind } from '../../format/src/index.ts';
import type { ItemStatus } from './registry.ts';
import { ACTIONS } from './registry.ts';

/** A note as every read shows it: its latest words and kind. `sent` once a Send came after it. */
export interface ItemNote { seq: number; kind: NoteKind; text: string; at: string; sent?: true }

/** One `comment` or `context` act on an item, as it stands after its edits. `pos` is the `seq`
 * where it counts for the item's status: its own, or the latest edit that set its kind (the
 * latest press of C or M). `changed` is the `seq` of its latest edit. A `context` with no words
 * is an ask but not a note: it cannot be edited or removed (Reopen undoes it). */
export interface Ask {
  seq: number; n: number; kind: NoteKind; ver: number; at: string; pos: number;
  text?: string; person?: string; changed?: number; removed?: number;
}

/** A decision act on an item (ack, drop, later, reopen): it sets the status outright. */
export interface Decision { seq: number; action: ActEvent['action'] }

/** What the fold keeps per item to work out its status and notes. */
export interface ItemLog { asks: Ask[]; decisions: Decision[] }

export interface ItemState { status: ItemStatus; notes: ItemNote[] }

export const isNote = (a: Ask | undefined): a is Ask & { text: string } => a?.text !== undefined;

/** The ask a `comment` or `context` act makes. */
export function askOf(e: ActEvent, ver: number): Ask {
  return {
    seq: e.seq, n: e.n!, kind: e.action as NoteKind, ver, at: e.at, pos: e.seq,
    ...(e.text?.trim() && { text: e.text.trim() }), ...(e.person !== undefined && { person: e.person }),
  };
}

/** Apply a `note-edit` or `note-remove` to the ask it names. Events are valid by now. */
export function foldNoteAct(a: Ask, e: ActEvent): void {
  if (e.action === 'note-remove') {
    a.removed = e.seq;
    return;
  }
  a.text = e.text!.trim();
  a.changed = e.seq;
  if (e.kind !== undefined) {
    a.kind = e.kind;
    a.pos = e.seq;
  }
}

/** The asks still standing, in the order they count. */
const standing = (log: ItemLog): Ask[] => log.asks.filter((a) => a.removed === undefined).sort((a, b) => a.pos - b.pos);

/** The item's status: its decisions and standing asks replayed in order (last action wins; a
 * comment marks an open item commented, a context sets context). A removed note counts as never
 * made; an edit that set the kind counts as a fresh press at the edit. */
export function itemOf(log: ItemLog): ItemState {
  const steps: { pos: number; action: ActEvent['action'] }[] = [
    ...log.decisions.map((d) => ({ pos: d.seq, action: d.action })),
    ...standing(log).map((a) => ({ pos: a.pos, action: a.kind })),
  ].sort((a, b) => a.pos - b.pos);
  let status: ItemStatus = 'open';
  for (const { action } of steps) {
    const def = ACTIONS[action];
    if (def.status) status = def.status;
    else if (action === 'comment' && status === 'open') status = 'commented';
  }
  return { status, notes: liveNotes(log).map(({ seq, kind, text, at }) => ({ seq, kind, text, at })) };
}

/** The item's notes not removed, in the order they were made (the pin numbers). */
export const liveNotes = (log: ItemLog): (Ask & { text: string })[] =>
  log.asks.filter((a): a is Ask & { text: string } => isNote(a) && a.removed === undefined).sort((a, b) => a.seq - b.seq);

/** The latest standing ask: what the agent owes an answer on (api.md 36). */
export const latestAsk = (log: ItemLog): Ask | undefined => standing(log).at(-1);
