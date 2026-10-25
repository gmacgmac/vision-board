// Parking and replies on the page (handover and cardReplies flags, proposals-seen-parking FE_03, D-020,
// api.md 36 and 73): which cards in Later still wait for the agent's handover (`item.awaiting`, from
// the conditions table: attention.ts), the handover once it is written (`park`), and the agent's
// replies under the notes they answer (`reply`, its `to` the note's `seq`), on a card and on a whole
// container. Facts only: the card and the frame draw them (packages/ui); the page sends nothing, since a
// handover and a reply are the agent's words, read-only here. Split out of controller.ts.
import type { ViewNode } from '../../../../packages/format/src/index.ts';
import type { LedgerState } from '../../../../packages/actions/src/index.ts';
import type { CardConditions, CardReply } from '../../../../packages/ui/src/index.ts';
import { idOf } from './card-numbers.ts';

export interface ParkingDeps {
  /** The handover flag: "Awaiting" and the handover tab. */
  handover: boolean;
  /** The cardReplies flag: replies under the notes. */
  replies: boolean;
  /** The groupNoteOnce flag: a card leaves its notes on a group of cards to the group's pin (group-pins.ts). */
  apart?: boolean;
  /** The state the board is drawn from: the held one, or a past version's (versions.ts). */
  state(): LedgerState | null;
  /** The open board: a card drawn is named by its number on it (card-numbers.ts). */
  board(): string;
  /** The conditions table's items in Later whose handover is owed, by board number. */
  awaiting(): ReadonlySet<number>;
  /** A past version shows: the owed handover is today's fact, not that version's. */
  readOnly(): boolean;
}

export interface Parking {
  /** Work the replies out again, before each draw. */
  refresh(): void;
  /** What the ledger says about card `n`: its owed or written handover and the replies on it. */
  card(n: ViewNode): CardConditions;
  /** The replies that answer a note on a whole container (they name a note with a `region`). */
  containers(): readonly CardReply[];
}

const NONE: CardConditions = {};
const bySeq = (a: CardReply, b: CardReply) => a.seq - b.seq;

export function createParking(d: ParkingDeps): Parking {
  /** Replies by the note they name, and by the card they are on (its identity). */
  let answers = new Map<number, CardReply[]>();
  let own = new Map<number, CardReply[]>();
  let container: CardReply[] = [];
  let seen: { state: LedgerState; seq: number } | undefined;

  const push = <K>(m: Map<K, CardReply[]>, k: K, r: CardReply) => m.set(k, [...(m.get(k) ?? []), r]);

  return {
    refresh() {
      const s = d.replies ? d.state() : null;
      // The held state moves in place, so the same state at the same line has the same replies.
      if (s && seen?.state === s && seen.seq === s.seq) return;
      seen = s ? { state: s, seq: s.seq } : undefined;
      answers = new Map();
      own = new Map();
      container = [];
      if (!s) return;
      for (const [id, list] of s.replies) {
        for (const r of list) {
          const agent = r.agent === undefined ? undefined : s.agents.get(r.agent);
          const reply: CardReply = { seq: r.seq, text: r.text, at: r.at, ...(r.to !== undefined && { to: r.to }), ...(agent && { agent }) };
          push(own, id, reply);
          if (r.to === undefined) continue;
          push(answers, r.to, reply);
          if (s.asks.get(r.to)?.region !== undefined) container.push(reply);
        }
      }
      container.sort(bySeq);
    },
    card(n) {
      const s = d.state();
      const id = s && n.n !== undefined ? idOf(s, d.board(), n.n) : undefined;
      if (!s || n.n === undefined || id === undefined) return NONE;
      const awaiting = d.handover && !d.readOnly() && d.awaiting().has(n.n);
      const bundle = d.handover ? s.parks.get(id) : undefined;
      const replies = d.replies ? repliesOn(s, id) : [];
      return {
        ...(awaiting && { awaiting }), ...(bundle && { handover: bundle }), ...(replies.length && { replies }),
        ...(d.apart && { groupNotesApart: true }),
      };
    },
    containers: () => container,
  };

  /** The replies to card `id`'s notes (a note on a group is answered on any of its cards), then its own that
   *  name no note, in the order they were written. A reply naming a note elsewhere shows there. */
  function repliesOn(s: LedgerState, id: number): CardReply[] {
    const out = (s.items.get(id)?.notes ?? []).flatMap((x) => answers.get(x.seq) ?? []);
    for (const r of own.get(id) ?? []) if (r.to === undefined || !s.asks.has(r.to)) out.push(r);
    return out.sort(bySeq);
  }
}
