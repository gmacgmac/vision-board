// Gallery entry for big titles (bigTitles flag, on by default; point 437): a card whose body has structure
// (a `##` heading and a table) beside a plain card, so the structured card's large title and its body's
// stepped-down headings read against the plain card's medium title. A Markdown sample (markdown-section.ts
// `moreCard`), shown in a section of its own, last of all, so no section moves.
import { cardList, el, group } from './dom.ts';
import type { Fixture } from './fixture.ts';
import { moreCard } from './markdown-section.ts';
import type { MoreSample } from './markdown-section.ts';

/** A structured card and a plain one. */
const BIG: MoreSample[] = [
  { title: 'Release status: what, where, next', kind: 'finding',
    body: '## Where we are\n\nThe board draws, the person answers card by card.\n\n| Area | State |\n|---|---|\n| Board | Shipped |\n| Plugin | In review |\n\n### Next\n\n- Host settings' },
  { title: 'Ship the plugin this week?', kind: 'question', body: 'The review is green and the host contract is settled.' },
];

export function bigTitlesSection(fx: Fixture): HTMLElement {
  const box = el('section', 'g-section');
  box.dataset.feature = 'bigTitles';
  box.setAttribute('aria-labelledby', 'feature-bigTitles');
  const heading = el('h2', 'g-title', 'Big titles');
  heading.id = 'feature-bigTitles';
  const meta = el('p', 'g-meta');
  meta.append(el('code', undefined, '--vb-text-xl'), ' · feature flag bigTitles (point 437), on by default · off with ?flags=-bigTitles');
  const cards = BIG.map((s, i) => moreCard(s, i, fx, 'md-big'));
  cards.forEach((c) => { c.dataset.sample = 'big-titles'; });
  box.append(heading,
    el('p', 'g-desc', 'The card\'s title is its one heading. A card whose body has structure (a # or ## heading, or a table) shows its title at the # size; in its body # and ## are both medium and ### the label.'),
    meta,
    group('A structured card and a plain card', 'Side by side: the structured card\'s title is large, the plain card keeps its medium title.',
      cardList('Big titles: a structured card and a plain card', ...cards)));
  return box;
}
