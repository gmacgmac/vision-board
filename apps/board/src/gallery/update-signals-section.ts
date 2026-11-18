// Gallery entry for updated in amber and the agent's reply edge (updateSignals flag, on by default;
// insert-markdown-signals FE_01, D-088): a card the agent's answer to a note cleared, as the page reads
// it (fixture.ts `cleared`), its conversation box open beside it: once while the reply is unread (the badge "1 update"
// in the updated amber, the notes mark filled) and once read (the notes mark back to its count); in the box the
// reply's edge is the muted amber. The two-colour pill is the New and updated cards section's
// (fresh-section.ts). Last of all, so no section moves.
import { loadConversation } from '#ui';
import { loadNoteBox } from '../board/notes/index.ts';
import { el, group } from './dom.ts';
import type { Fixture } from './fixture.ts';
import { boxSample } from './conversation-box-samples.ts';

/** The cleared card's conversation twice: unseen as the page reads it, and seen (its replies no longer `unseen`). */
function replyEdges(fx: Fixture): HTMLElement {
  const [k, c] = [...fx.cleared][0]!;
  const n = fx.view.nodes.find((x) => x.n === k)!;
  const seen = { ...c, replies: (c.replies ?? []).map(({ unseen: _, ...r }) => r) };
  const row = el('div', 'g-bubbles');
  row.setAttribute('role', 'group');
  row.setAttribute('aria-label', 'The agent\'s reply, unseen and seen');
  void Promise.all([loadNoteBox(), loadConversation()]).then(([m]) => row.append(
    boxSample({ caption: 'Unread: the badge in the updated amber, the notes mark filled', board: 'other', title: n.title, n: k }, { view: fx.view, state: fx.state, cards: new Map([[k, c]]) }, fx, m.boxView),
    boxSample({ caption: 'Read: the notes mark back to its count; in the box, the muted amber edge', board: 'other', title: n.title, n: k }, { view: fx.view, state: fx.state, cards: new Map([[k, seen]]) }, fx, m.boxView)));
  return row;
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
    el('p', 'g-desc', 'One colour per meaning: new is teal, updated is a bright amber, on a node\'s "N updates" badge and the pill\'s "updated" count (New and updated cards, above).'),
    meta,
    group('The agent\'s reply, unseen and seen', 'While a reply is unread the node says so: "1 update" on its badge in the updated amber and its notes mark filled. In the conversation box a reply carries a muted amber left edge, '
      + 'so it never reads as one of your notes (pink while you can edit it, grey once sent). Off, replies are grey.', replyEdges(fx)));
  return box;
}
