// Gallery entry for the timeline (D-105; the timeline set's FE_01), shown with the `timeline` flag as its pattern.json
// says: dated nodes in both skins (the four header forms; three kinds; a tone; an icon node; a node that asks, waiting
// and answered; entries of each form; a long title), drawn from the edges board's cards with a date added, as the page
// will draw them; then the line itself from hand-made geometry in the layout's shape, across and down, its dots
// coloured in place (applyTimelineLook). The page wires the line to the layout in FE_02.
import type { Skin, TimelineDrawing, ViewNode } from '#format';
import type { SkinDef, TimelineLook } from '#ui';
import { applyTimelineLook, SKIN_DEFS, timelineMarkup } from '#ui';
import { cardList, el, group } from './dom.ts';
import { byTitle, edgeCard } from './edges-section.ts';
import type { Fixture } from './fixture.ts';

const SKIN: Skin = 'command-lens';

/** Made-up launch-plan text (no real names), one body per entry form. */
const BODY = {
  heads: '### Invites go out\n200 teams from the waitlist, in two waves.\n\n### First feedback review\nProduct and support read every reply together.',
  lead: '**Pricing page live**: the new plans and the yearly discount.\n\nThe old page redirects for a month.',
  list: '- Store listing and blog post\n- **Launch webinar** — forty minutes, then questions.\n- Support macros switched on',
};

/** A card of the edges board (its marks and state as the fixture holds them) with a date and what else `patch` gives. */
function dated(fx: Fixture, title: string, patch: Partial<ViewNode>, def: SkinDef): HTMLElement {
  return edgeCard(fx, { ...byTitle(fx, title), ...patch }, false, def).node;
}

/** Every dated sample in one skin's row: the four headers, kinds and states, entries. */
function nodes(fx: Fixture, def: SkinDef, skin: string): HTMLElement[] {
  const forms = [
    dated(fx, 'Keep the backup encoder warm', { title: 'Freeze the feature list', body: 'Offline drafts move to 2.1.', timeline: '2026-09-15' }, def),
    dated(fx, 'Order of work', { title: 'Help centre rewrite', body: 'Forty articles, every screenshot redone.', timeline: '2026-10' }, def),
    dated(fx, 'Order of work', { title: '2.1: offline drafts', body: 'Drafts sync when the network is back.', timeline: '2027' }, def),
    dated(fx, 'Go-ahead to install', { title: 'Public launch', body: BODY.list, timeline: '2026-12-01T17:00' }, def),
  ];
  const states = [
    dated(fx, 'Install window agreed', { title: 'Beta sign-off', timeline: '2026-11-03' }, def),
    dated(fx, 'Book the second uplink truck?', { title: 'Which region goes first?', timeline: '2026-11-03' }, def),
    dated(fx, 'Cup final', { title: 'Price change emails', body: 'To every paying team, a month ahead.', timeline: '2026-11-10' }, def),
    dated(fx, 'A spare fibre runs to the truck', { title: 'Load test passed', body: 'Ten times launch traffic for an hour.', timeline: '2026-11-12T09:30' }, def),
    dated(fx, 'Order of work', { title: 'A long title that wraps over more than one line on a narrow dated node', timeline: '2026-11' }, def),
  ];
  const entries = [
    dated(fx, 'Go-ahead to install', { title: 'Private beta', body: BODY.heads, timeline: '2026-10-13' }, def),
    dated(fx, 'Order of work', { title: 'Pricing page', body: BODY.lead, timeline: '2026-11-03' }, def),
  ];
  return [
    group('The four headers', 'A day, a month, a year and a time, as the agent wrote them; month first, no year on a day or a time (the year is on the line).', cardList(`${skin}: the four headers`, ...forms)),
    group('Kinds, a tone, an icon, answered and waiting', 'Ticked; a question with a proposal; a toned topic with an icon (the date in the tone\'s ink); a finding with an icon (its tile kept, no kick); a long title.', cardList(`${skin}: kinds and states`, ...states)),
    group('Entries', '### headings, a bold lead, and a list item opening with a bold name (the other items keep their bullets).', cardList(`${skin}: entries`, ...entries)),
  ];
}

/** Hand-made geometry in the layout's shape (#format TimelineDrawing): five dots across, the year turning, two equal. */
const ACROSS: TimelineDrawing = {
  direction: 'across',
  line: { from: { x: 16, y: 70 }, to: { x: 904, y: 70 } },
  dots: ['decision', 'topic', 'action', 'question', 'finding'].map((id, i) => {
    const x = 120 + i * 170;
    const above = i % 2 === 0;
    return { id, at: { x, y: 70 }, side: above ? 'above' : 'below', stem: { from: { x, y: 70 }, to: { x, y: above ? 40 : 100 } } };
  }),
  years: [{ year: '2026', at: { x: 16, y: 70 } }, { year: '2027', at: { x: 545, y: 70 } }],
  bands: [{ from: { x: 290, y: 70 }, to: { x: 460, y: 70 } }],
};
const DOWN: TimelineDrawing = {
  direction: 'down',
  line: { from: { x: 160, y: 16 }, to: { x: 160, y: 344 } },
  dots: ['decision', 'tone', 'risk', 'note'].map((id, i) => {
    const y = 60 + i * 74;
    const left = i % 2 === 0;
    return { id, at: { x: 160, y }, side: left ? 'left' : 'right', stem: { from: { x: 160, y }, to: { x: left ? 130 : 190, y } } };
  }),
  years: [{ year: '2026', at: { x: 160, y: 16 } }, { year: '2027', at: { x: 160, y: 171 } }],
  bands: [{ from: { x: 160, y: 208 }, to: { x: 160, y: 282 } }],
};
/** Each dot's node: its kind, and the two with a tone (a name and a hue). */
const LOOK = (id: string): TimelineLook | undefined => (id === 'tone' ? { kind: 'topic', tone: 'teal' }
  : id === 'question' ? { kind: 'question', tone: 300 } : { kind: id as TimelineLook['kind'] });

/** One drawing in an svg of its own size; the board's wires layer holds it there. */
function line(drawing: TimelineDrawing, w: number, h: number): HTMLElement {
  const box = el('div', 'g-timeline');
  // Markup from timelineMarkup, which escapes every value.
  box.innerHTML = `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true">${timelineMarkup(drawing, LOOK)}</svg>`;
  applyTimelineLook(box);
  return box;
}

export function timelineSamples(body: HTMLElement, fx: Fixture): void {
  const skin = el('div', 'vb-board g-skin');
  skin.dataset.vbSkin = SKIN;
  skin.append(...nodes(fx, SKIN_DEFS[SKIN], 'Command Lens'));
  body.append(
    group('Dated nodes, default skin', 'The date heads the node in the kind\'s colour (the tone\'s ink on a toned node): no kind tab, no grip, the kind a small word at the end of the date line.'),
    ...nodes(fx, SKIN_DEFS.default, 'Default skin'),
    group('Dated nodes, Command Lens', 'The plate stays (number, kind, marks) but is not a handle; the date heads the body above the title.'), skin,
    group('The line, across', 'Dots alternate above and below, the first above; the year at the start and where it turns; a band behind two equal dates; a dot in its node\'s colour (a tone\'s line on the two toned ones); the arrow is time\'s direction.', line(ACROSS, 920, 140)),
    group('The line, down', 'Run down, the dots alternate left and right, the first on the left; the stem meets the middle of the node\'s facing side.', line(DOWN, 320, 360)),
  );
}
