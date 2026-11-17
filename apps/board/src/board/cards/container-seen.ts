// A container seen on the person's screen (nodeEdges flag; D-099 4, point 308, decision 16): on a board that isn't
// read-only, a click inside a container, on its background or its frame, clears its new-and-updated pill and teal
// border, and quiets the agent's replies under its note (tracker N47), on this page only. It is page-local state, as
// zoom is: the page keeps, per board and container, the newest change it cleared (`container.fresh`'s `seq`), so the
// pill comes back when a later change arrives, and a reload shows it again. Nothing is written: a `seen` never names a
// container (api.md 187) and D-054 stands. A reply to a container's note is bright (`unseen`) while it is newer than
// both what the page cleared there and the person's latest look at a card in it (`looked`), as a card's reply is.
import type { FreshCount, LedgerState } from '#actions';
import { placeOf } from '#actions';
import { nodesOf } from '#format';
import type { CardReply } from '#ui';

export interface ContainerSeen {
  /** `fresh` (the conditions' fresh containers of `board`) less those cleared on this page since their last change. */
  fresh(board: string, fresh: ReadonlyMap<string, FreshCount>): ReadonlyMap<string, FreshCount>;
  /** A click inside container `region` of `board`: clear its pill (`fresh` as the page shows it now) and quiet its
   *  replies (`replies`, the newest line among them). True when it changed what shows. */
  clear(board: string, region: string, fresh: ReadonlyMap<string, FreshCount>, replies: readonly CardReply[], regionOf: (to: number) => string | undefined): boolean;
  /** The replies under container notes, each marked `unseen` while it is new to the person on this page. */
  replies(s: LedgerState | null, board: string, replies: readonly CardReply[], regionOf: (to: number) => string | undefined): readonly CardReply[];
}

/** Each container of `board`: the `seq` of the person's latest look at a card in it now (card seen or act). */
function lookedIn(s: LedgerState, board: string): Map<string, number> {
  const out = new Map<string, number>();
  for (const x of nodesOf(s, board)) {
    const at = s.looked.get(x.id);
    const where = at === undefined ? undefined : placeOf(s, x.id)?.region;
    if (where !== undefined) out.set(where, Math.max(out.get(where) ?? 0, at!));
  }
  return out;
}

export function createContainerSeen(): ContainerSeen {
  /** board -> container -> the newest change cleared there. */
  const cleared = new Map<string, Map<string, number>>();
  const of = (board: string) => cleared.get(board) ?? cleared.set(board, new Map()).get(board)!;
  return {
    fresh(board, fresh) {
      const here = cleared.get(board);
      if (!here?.size) return fresh;
      return new Map([...fresh].filter(([region, c]) => c.seq > (here.get(region) ?? 0)));
    },
    clear(board, region, fresh, replies, regionOf) {
      const here = of(board);
      const was = here.get(region) ?? 0;
      const newest = Math.max(fresh.get(region)?.seq ?? 0, ...replies.filter((r) => r.to !== undefined && regionOf(r.to) === region).map((r) => r.seq));
      if (newest <= was) return false;
      here.set(region, newest);
      return true;
    },
    replies(s, board, replies, regionOf) {
      if (!s || !replies.length) return replies;
      const looked = lookedIn(s, board);
      const here = cleared.get(board);
      return replies.map((r) => {
        const region = r.to === undefined ? undefined : regionOf(r.to);
        const since = region === undefined ? Infinity : Math.max(looked.get(region) ?? 0, here?.get(region) ?? 0);
        return r.seq > since ? { ...r, unseen: true as const } : r;
      });
    },
  };
}
