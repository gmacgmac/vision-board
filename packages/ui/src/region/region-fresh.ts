// Region pattern, layer 1 (core), a fresh container (new-and-updated Design 3 and 4, freshCards
// flag): one holding new or updated cards the person has not engaged with since they changed
// (`container.fresh`). Its border takes --vb-state-fresh and its title line a pill after the count,
// "3 new · 1 updated", counted from the one list (`freshCards`), so the pill, the cards' tabs and the
// toolbar's "N new" never disagree. No DOM; the element applies it (`VbRegion.update`), its words through
// `fillFreshPill`, which keeps each count in its own span so "updated" can take --vb-state-updated
// (updateSignals flag, region-fresh.css).

import * as regionWords from '../words/region.ts';

/** A fresh container's pill: its words to the eye ("3 new · 1 updated", a part left out at zero) and
 * in full for its tooltip and screen readers ("3 new cards and 1 updated card"). */
export interface RegionFresh { text: string; label: string; added?: string; updated?: string }

/** The pill for `added` new and `updated` updated cards; none when both are zero. */
export function regionFresh(added: number, updated: number): RegionFresh | undefined {
  if (added + updated === 0) return undefined;
  const short = [added && regionWords.newText(added), updated && regionWords.updated(updated)].filter(Boolean).join(' · ');
  const long = [added && regionWords.newCards(added), updated && regionWords.updatedCards(updated)].filter(Boolean).join(regionWords.and);
  return {
    text: short, label: regionWords.inThisContainer(long),
    ...(added && { added: regionWords.newText(added) }), ...(updated && { updated: regionWords.updated(updated) }),
  };
}

/** The pill's words to the eye in `el`: each count in its own span (`.vb-region-fresh-new`,
 * `.vb-region-fresh-updated`) with " · " between, so its text is `text`; empty with no pill. */
export function fillFreshPill(el: HTMLElement, f: RegionFresh | undefined): void {
  const doc = el.ownerDocument;
  const part = (cls: string, words: string) => Object.assign(doc.createElement('span'), { className: cls, textContent: words });
  const parts = [f?.added && part('vb-region-fresh-new', f.added), f?.updated && part('vb-region-fresh-updated', f.updated)].filter((x): x is HTMLSpanElement => !!x);
  el.replaceChildren(...parts.flatMap((x, i) => (i ? [' · ', x] : [x])));
}
