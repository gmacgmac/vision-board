// Gallery entry for the Markdown renderer (D-023): one card per construct, then one with
// everything and one whose saved note is Markdown. Each is a real <vb-node> drawn from the
// fixture ledger, so its body goes through nodeTemplate and renderMarkdown exactly as on the board.
// Then the markdownMore samples (insert-markdown-signals MD_01): heading sizes, tables and breaks,
// each card at the tier the board would give it, and one table at the narrowest tier (S).
import type { NodeSize, ViewNode } from '#format';
import { flagOn } from '#format';
import type { VbNodeElement } from '#ui';
import { nodeState } from '#ui';
import { tierOf } from '../board/cards/index.ts';
import { pageFlags, pageMarkdown } from '../flags.ts';
import { cardList, group, ownIds } from './dom.ts';
import type { Fixture } from './fixture.ts';
import { REGION_MARKDOWN } from './fixture.ts';
import { card } from './node-section.ts';

/** The markdownMore samples: title, kind, body, and a tier the person picked (else the board's own). */
const MORE: { title: string; kind: ViewNode['kind']; body: string; size?: NodeSize }[] = [
  { title: 'Heading sizes', kind: 'finding',
    body: '# Release plan\n\nThe large heading opens the card.\n\n## Before launch\n\nThe medium heading opens a part.\n\n### Checks\n\n- Page tests\n- Contrast' },
  { title: 'A table', kind: 'decision',
    body: 'Which plan fits?\n\n| Plan | Seats | Price | Notes |\n|:--|--:|--:|:-:|\n| **Starter** | 5 | 10 | Monthly only |\n'
      + '| Team | 25 | 40 | `annual` saves 15% |\n| Enterprise | Unlimited | Ask | *On request* |' },
  { title: 'A table at S, with long words', kind: 'risk', size: 's',
    body: '| Endpoint | Response | Retries | Owner |\n|---|---|---|---|\n'
      + '| /internationalisation/configuration | ExtraordinarilyLongIdentifierWithoutSpaces | 3 | platform-infrastructure-team |' },
  { title: 'Breaks', kind: 'action', body: 'Before the break.\n\n---\n\nAfter it.\n***\nAnd once more, straight under a line.' },
  { title: 'Five columns stay text', kind: 'question', body: '| a | b | c | d | e |\n|---|---|---|---|---|\n| 1 | 2 | 3 | 4 | 5 |' },
];

/** A <vb-node> for a markdownMore sample, at its tier, with the page's flags. */
function moreCard(s: (typeof MORE)[number], i: number, fx: Fixture): VbNodeElement {
  const n: ViewNode = { id: `md-more-${i + 1}`, region: REGION_MARKDOWN, kind: s.kind, title: s.title, body: s.body };
  const node = document.createElement('vb-node') as VbNodeElement;
  node.render(n, { ...ownIds(), markdown: pageMarkdown() });
  node.update(nodeState(n, fx.state, s.size ?? tierOf(n, fx.state)));
  return node;
}

export function markdownSamples(body: HTMLElement, fx: Fixture): void {
  const cards = fx.view.nodes.filter((n) => n.region === REGION_MARKDOWN).map((n) => card(n, fx));
  body.append(group('One card per construct, then everything at once',
    'Card bodies and saved notes are Markdown. Raw HTML, and a link to anything but http, https or mailto, stay plain text. A long code block scrolls inside its cap.',
    cardList('Markdown samples', ...cards)));
  if (!flagOn('markdownMore', pageFlags())) return;
  const more = MORE.map((s, i) => moreCard(s, i, fx));
  more.forEach((c) => { c.dataset.sample = 'markdown-more'; });
  body.append(group('Heading sizes, tables and breaks (markdownMore)',
    '# is large, ## medium, ### and smaller the label. A table of up to 4 columns makes the card L; its cells wrap and long words break, so it never scrolls, even at S. ---, *** or ___ draws a line. Off with ?flags=-markdownMore.',
    cardList('Markdown: heading sizes, tables and breaks', ...more)));
}
