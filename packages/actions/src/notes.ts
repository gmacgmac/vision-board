// A person's notes on an item, and the item's status worked out from them (2e_FE_01, api.md
// 58-61). A note is made by a `comment` or `context` act with words and is named, for ever, by
// that act's `seq`. Until a Send after it, `note-edit` changes its words (and, with `kind`, what
// it asks for) and `note-remove` takes it back; both are new acts, so the ledger stays
// append-only (D-017). After a Send, or once the agent answers it, it is history (note-lock.ts). A note on a group of cards (3_FE_02, api.md
// 62-65) is one ask shared by the log of every card it names. Pure: the fold calls `foldNoteAct`
// and `itemOf`; the reads call `liveNotes` and `noteView`.
import type { ActEvent, NoteKind } from '../../format/src/index.ts';
import { isContainerAct } from '../../format/src/index.ts';
import type { ItemStatus } from './registry.ts';
import { ACTIONS } from './registry.ts';

/** A note as every read shows it: its latest words and kind. `sent` once a Send came after it;
 * `locked` once it is history, after a Send or the agent's answer (note-lock.ts `lockOf`);
 * `nodes` when it is a note on a group of cards (api.md 62): every item it is on (identities in the
 * fold, board numbers once a read gives it: numbers.ts `noteOut`). `region` when it is a note on a
 * whole container (api.md 73), in place of a card. */
export interface ItemNote { seq: number; kind: NoteKind; text: string; at: string; sent?: true; locked?: true; nodes?: number[]; region?: string }

/** One `comment` or `context` act on an item, as it stands after its edits. `pos` is the `seq`
 * where it counts for the item's status: its own, or the latest edit that set its kind (the
 * latest press of C or M). `changed` is the `seq` of its latest edit. A `context` with no words
 * is an ask but not a note: it cannot be edited or removed (Reopen undoes it). A note on a group
 * is ONE ask in the log of every card it names: `id` is its first card, `nodes` all of them, and
 * `vers` the version each card was at when it was made (what a newer version answers, api.md 36).
 * Cards are identities. A note on a whole container (api.md 73) is on no card: `region` names the
 * container, `id` and `ver` are 0, and `cardsOf` is empty. */
export interface Ask {
  seq: number; id: number; kind: NoteKind; ver: number; at: string; pos: number;
  text?: string; person?: string; changed?: number; removed?: number;
  nodes?: number[]; vers?: Record<number, number>; region?: string;
}

/** A decision act on an item (ack, drop, later, reopen): it sets the status outright. */
export interface Decision { seq: number; action: ActEvent['action'] }

/** What the fold keeps per item to work out its status and notes. */
export interface ItemLog { asks: Ask[]; decisions: Decision[] }

export interface ItemState { status: ItemStatus; notes: ItemNote[] }

export const isNote = (a: Ask | undefined): a is Ask & { text: string } => a?.text !== undefined;

/** The cards an ask is on: every card of a group note, none for a container note, else its one card. */
export const cardsOf = (a: Ask): number[] => (a.region !== undefined ? [] : a.nodes ?? [a.id]);

/** The version card `id` was at when the ask was made. */
export const askVer = (a: Ask, id: number): number => a.vers?.[id] ?? a.ver;

/** The ask a `comment` or `context` act makes; `verOf` gives a card's latest version, used where
 * the act names none (a note on a group names no version: each card's is the one it was at). */
export function askOf(e: ActEvent, verOf: (id: number) => number): Ask {
  if (isContainerAct(e)) {
    const { region, ...rest } = e;
    return { ...askOf({ ...rest, id: 0, ver: 0 }, verOf), region: region! };
  }
  const cards = e.nodes ?? [e.id!];
  const ver = e.ver ?? verOf(cards[0]!);
  return {
    seq: e.seq, id: cards[0]!, kind: e.action as NoteKind, ver, at: e.at, pos: e.seq,
    ...(e.text?.trim() && { text: e.text.trim() }), ...(e.person !== undefined && { person: e.person }),
    ...(e.nodes && { nodes: [...e.nodes], vers: Object.fromEntries(e.nodes.map((id) => [id, verOf(id)])) }),
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
  return {
    status,
    notes: liveNotes(log).map(({ seq, kind, text, at, nodes }) => ({ seq, kind, text, at, ...(nodes && { nodes: [...nodes] }) })),
  };
}

/** The item's notes not removed, in the order they were made (the pin numbers). */
export const liveNotes = (log: ItemLog): (Ask & { text: string })[] =>
  log.asks.filter((a): a is Ask & { text: string } => isNote(a) && a.removed === undefined).sort((a, b) => a.seq - b.seq);

/** The latest standing ask: what the agent owes an answer on (api.md 36). */
export const latestAsk = (log: ItemLog): Ask | undefined => standing(log).at(-1);
