// Region pattern, layer 1 (core), a fresh container (new-and-updated Design 3 and 4, freshCards
// flag): one holding new or updated cards the person has not engaged with since they changed
// (`container.fresh`). Its border takes --vb-state-fresh and its title line a pill after the count,
// "3 new · 1 updated", counted from the one list (`freshCards`), so the pill, the cards' tabs and the
// toolbar's "N new" never disagree. No DOM; the element applies it (`VbRegion.update`).

import * as regionWords from '../words/region.ts';

/** A fresh container's pill: its words to the eye ("3 new · 1 updated", a part left out at zero) and
 * in full for its tooltip and screen readers ("3 new cards and 1 updated card"). */
export interface RegionFresh { text: string; label: string }

/** The pill for `added` new and `updated` updated cards; none when both are zero. */
export function regionFresh(added: number, updated: number): RegionFresh | undefined {
  if (added + updated === 0) return undefined;
  const short = [added && regionWords.newText(added), updated && regionWords.updated(updated)].filter(Boolean).join(' · ');
  const long = [added && regionWords.newCards(added), updated && regionWords.updatedCards(updated)].filter(Boolean).join(regionWords.and);
  return { text: short, label: regionWords.inThisContainer(long) };
}
