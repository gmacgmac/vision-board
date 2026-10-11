// Notes on a whole container and the person's container places (3_FE_04 rulings 1-4, api.md
// 71-76), folded beside the card pins and notes of fold.ts and read back for `boardState`,
// `show_container` and `get_board`. A container note is an `Ask` like a card's (notes.ts) with
// `region` in place of a card, so `note-edit`, `note-remove` and Send work on it the card-note way.
// A container place is the top-left of its frame in board coordinates; the latest pin wins.
import type { ActEvent } from '../../format/src/index.ts';
import { containerKey } from '../../format/src/index.ts';
import type { LedgerState } from './fold.ts';
import { sentNotes } from './fold.ts';
import type { ItemLog, ItemNote } from './notes.ts';
import { askOf, foldNoteAct, liveNotes } from './notes.ts';

/** Where the person put a container: its frame's top-left, in board coordinates (api.md 74). */
export interface Place { x: number; y: number }

/** The inner map of `m` for `board`, made when missing. */
function inner<V>(m: Map<string, Map<string, V>>, board: string): Map<string, V> {
  const x = m.get(board) ?? new Map<string, V>();
  m.set(board, x);
  return x;
}

/** The container's note log, if it has one. A container takes no decisions, only notes. */
export const containerLog = (s: LedgerState, board: string, region: string): ItemLog | undefined =>
  s.regionLogs.get(board)?.get(region);

/** Apply one container act (`isContainerAct`). Events are valid by now. A pin is deleted before it
 * is set again, so each board's pins stay in the order they were last dropped (api.md 74). */
export function applyContainerAct(s: LedgerState, e: ActEvent): void {
  const board = e.board!;
  const region = e.region!;
  switch (e.action) {
    case 'pin': {
      const pins = inner(s.regionPins, board);
      pins.delete(region);
      pins.set(region, { x: e.x!, y: e.y! });
      break;
    }
    case 'unpin': s.regionPins.get(board)?.delete(region); break;
    case 'comment': case 'context': {
      const made = askOf(e, () => 0);
      const logs = inner(s.regionLogs, board);
      const log = logs.get(region) ?? { asks: [], decisions: [] };
      logs.set(region, log);
      log.asks.push(made);
      s.asks.set(e.seq, made);
      break;
    }
    default: {
      const a = e.note === undefined ? undefined : s.asks.get(e.note);
      if (a) foldNoteAct(a, e);
    }
  }
}

/** A container's notes as every read shows them (api.md 75): oldest first, a removed one left out,
 * `sent` once a Send on the board came after it, and `region` naming the container. */
export function containerNotes(s: LedgerState, board: string, region: string): ItemNote[] {
  const log = containerLog(s, board, region);
  if (!log) return [];
  return sentNotes(s, board, liveNotes(log).map(({ seq, kind, text, at }) => ({ seq, kind, text, at, region })));
}

/** Where the person put a container, or undefined when it is where layout puts it. */
export const containerPin = (s: LedgerState, board: string, region: string): Place | undefined => {
  const pin = s.regionPins.get(board)?.get(region);
  return pin && { ...pin };
};

/** One board's container places (in the order last dropped) and notes, for `boardState`. A
 * container with no live note, and a retired one (api.md 127), is left out. */
export function containerState(s: LedgerState, board: string): { regionPins: Map<string, Place>; regionNotes: Map<string, ItemNote[]> } {
  const here = (region: string) => !s.retiredRegions.has(containerKey(board, region));
  const regionPins = new Map([...(s.regionPins.get(board) ?? [])].filter(([r]) => here(r)).map(([r, p]) => [r, { ...p }]));
  const regionNotes = new Map<string, ItemNote[]>();
  for (const region of s.regionLogs.get(board)?.keys() ?? []) {
    if (!here(region)) continue;
    const notes = containerNotes(s, board, region);
    if (notes.length) regionNotes.set(region, notes);
  }
  return { regionPins, regionNotes };
}

/** A note as the API answers with it: the card-note shape (api.md 61); the container is already
 * named by the key or the read it is in. */
export const noteJson = ({ region: _region, ...note }: ItemNote): ItemNote => note;

/** `get_board`'s `state.containerNotes` and `state.containerPins`, each left out when empty, as
 * `state.moves` is (api.md 75). */
export function containerJson(st: { regionPins: Map<string, Place>; regionNotes: Map<string, ItemNote[]> }) {
  return {
    ...(st.regionNotes.size > 0 && {
      containerNotes: Object.fromEntries([...st.regionNotes].map(([r, notes]) => [r, notes.map(noteJson)])),
    }),
    ...(st.regionPins.size > 0 && { containerPins: Object.fromEntries(st.regionPins) }),
  };
}
