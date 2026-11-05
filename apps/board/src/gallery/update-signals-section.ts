// Gallery entry for updated in amber and the agent's reply edge (updateSignals flag, on by default;
// insert-markdown-signals FE_01, D-088): a card the agent's answer to a note cleared, as the page reads
// it (fixture.ts `cleared`), once while it is unseen (its "1 update" tab, the reply's edge the bright
// amber) and once seen (no tab, the muted amber). The amber tab and the two-colour pill are the
// New and updated cards section's (fresh-section.ts). Last of all, so no section moves.
import { el, cardList, group } from './dom.ts';
import type { Fixture } from './fixture.ts';
import { card } from './node-section.ts';

/** The cleared card twice: unseen as the page reads it, and seen (its replies no longer `unseen`, no tab). */
function replyEdges(fx: Fixture): HTMLElement {
  const [k, c] = [...fx.cleared][0]!;
  const n = fx.view.nodes.find((x) => x.n === k)!;
  const seen = card(n, fx, fx.state, { replies: (c.replies ?? []).map(({ unseen: _, ...r }) => r) });
  return cardList('The agent\'s reply, unseen and seen', card(n, fx, fx.state, c), seen);
}

export function updateSignalsSection(fx: Fixture): HTMLElement {
  const box = el('section', 'g-section');
  box.dataset.feature = 'updateSignals';
  box.setAttribute('aria-labelledby', 'feature-updateSignals');
  const heading = el('h2', 'g-title', 'Updated, and the agent\'s reply');
  heading.id = 'feature-updateSignals';
  const meta = el('p', 'g-meta');
  meta.append(el('code', undefined, '--vb-state-updated'), ' · feature flag updateSignals (D-088), on by default · off with ?flags=-updateSignals');
  box.append(heading,
    el('p', 'g-desc', 'One colour per meaning: new is teal, updated is a bright amber, on the "N updates" tab and the pill\'s "updated" count (New and updated cards, above).'),
    meta,
    group('The agent\'s reply, unseen and seen', 'A reply carries the updated amber on its left edge, so it never reads as one of your notes (pink while you can edit it, grey once sent): '
      + 'bright while its card is unseen (NEW or "N updates"), a muted amber once you have looked. The same in the note bubble. Off, replies are grey.', replyEdges(fx)));
  return box;
}
