// Gallery entry for the Markdown renderer (D-023): one card per construct, then one with
// everything and one whose saved note is Markdown. Each is a real <vb-node> drawn from the
// fixture ledger, so its body goes through nodeTemplate and renderMarkdown exactly as on the board.
import { cardList, group } from './dom.ts';
import type { Fixture } from './fixture.ts';
import { REGION_MARKDOWN } from './fixture.ts';
import { card } from './node-section.ts';

export function markdownSamples(body: HTMLElement, fx: Fixture): void {
  const cards = fx.view.nodes.filter((n) => n.region === REGION_MARKDOWN).map((n) => card(n, fx));
  body.append(group('One card per construct, then everything at once',
    'Card bodies and saved notes are Markdown. Raw HTML, and a link to anything but http, https or mailto, stay plain text. A long code block scrolls inside its cap.',
    cardList('Markdown samples', ...cards)));
}
