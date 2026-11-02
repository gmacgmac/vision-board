// The id prefix of each mounted board. Ids inside cards and frames (a card's popovers and step
// section, a frame's menus, the connectors' arrowheads) are document-wide, so two boards on one page
// would repeat them and `aria-controls` would point at the first board's. Each mount takes the lowest
// prefix no live mount holds, `vb1-`, `vb2-`, ..., and gives it back on `unmount`, so no id is a bare word that
// could be a host's too (`board`, `send`, `title`). The board's own page is no exception: its first mount takes
// `vb1-` like any other. Plain TS: no DOM, no state outside the set.

const live = new Set<number>();

/** The prefix for ids a mount sets: `n` is 1 for the first live mount. */
export const prefixOf = (n: number): string => `vb${n}-`;

/** Take the lowest prefix not held by a live mount; `release` gives it back (once). */
export function takeIdPrefix(): { prefix: string; release(): void } {
  let n = 1;
  while (live.has(n)) n += 1;
  live.add(n);
  let held = true;
  return { prefix: prefixOf(n), release() { if (held) live.delete(n); held = false; } };
}
