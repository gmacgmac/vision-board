// Standalone, written scenario 50 (node-overhaul T_05, the default board): nine findings with no layout named. The core is
// enough, so the bot reads no reference: it suggests the structure first and writes nothing; told "one container", it
// draws the nine as findings in one `grid` container (more than about 6 cards), with no links.
import path from 'node:path';
import { callsTo, check, doneOnly, everyItemKeyed, noCoordinates } from '../checks.ts';
import type { FakeBot, Scenario } from '../types.ts';
import { accepted, cardsByContainer, noLinks } from './layout-checks.ts';

const BOARD = 'accessibility-audit';
const FINDINGS = [
  'The search field has no label', 'Focus is invisible on the menu buttons', 'Error text is shown in red only',
  'The modal does not keep focus inside it', 'Gallery images have no alt text', 'The date picker needs a mouse',
  'Headings skip from h1 to h4', 'The video has no captions', 'The footer links are too low in contrast',
];

const askedFirst = check('structure-first', 'the first turn suggests the structure in a line or two and writes nothing', (r) => {
  const wrote = callsTo(r, 'write_board').filter((c) => c.turn === 0).length;
  const said = r.turns[0]?.text.trim() ?? '';
  return [wrote === 0 && said.length > 0 && said.split('\n').filter((l) => l.trim()).length <= 3, `turn 1: ${wrote} write(s); chat: ${said.slice(0, 160) || '(none)'}`];
});

const grid = check('grid-of-findings', 'the nine are `finding` cards in one container drawn as a `grid`', (r) => {
  const byRegion = cardsByContainer(r);
  const [id, cards] = [...byRegion].sort((a, b) => b[1].length - a[1].length)[0] ?? ['', []];
  const mode = accepted(r, 'region').map(({ item }) => item.region).filter((g) => g?.id === id).at(-1)?.mode;
  const kinds = new Set(accepted(r, 'node').filter(({ item }) => item.node?.region === id).map(({ item }) => item.node.kind));
  return [cards.length >= 9 && byRegion.size === 1 && mode === 'grid' && [...kinds].every((k) => k === 'finding' || k === 'risk'), `${byRegion.size} container(s); ${id}: ${cards.length} cards, mode ${mode ?? 'row'}, kinds ${[...kinds].join(', ')}`];
});

const items = (mode: string) => [
  { type: 'board', key: 'audit-board', title: 'Accessibility audit', summary: 'What the audit found.' },
  { type: 'region', key: 'audit-region-findings', region: { id: 'findings', title: 'Findings', mode } },
  ...FINDINGS.map((title, i) => ({ type: 'node', key: `audit-card-finding-${i + 1}`, node: { region: 'findings', kind: 'finding', title } })),
];

let secret = '';
async function ask(bot: FakeBot) {
  ({ secret } = await bot.call('join', { label: path.basename(bot.dir) }));
  bot.say('A grid of the 9 findings in one container, or rows by area (forms, media, navigation)?');
}
async function draw(bot: FakeBot) {
  await bot.call('write_board', { secret, board: BOARD, items: items('grid') });
  bot.say('Done. Accessibility audit (`accessibility-audit`).');
}
/** Draws at once, reads a reference it doesn't need, and lays the nine out as a linked flow. */
async function bad(bot: FakeBot) {
  ({ secret } = await bot.call('join', { label: path.basename(bot.dir) }));
  bot.read('layouts');
  await bot.call('write_board', { secret, board: BOARD, items: [...items('flow'), ...FINDINGS.slice(1).map((_, i) => ({ type: 'link', key: `audit-link-${i + 1}`, from: { key: `audit-card-finding-${i + 1}` }, to: { key: `audit-card-finding-${i + 2}` } }))] });
  bot.say('Done.');
}

export const findingsGrid: Scenario = {
  id: 'findings-grid',
  title: 'Standalone: nine findings, no layout named: the structure first, then one grid, from the core alone',
  turns: [
    { say: `Put the nine findings from our accessibility audit on a new board: ${FINDINGS.map((f) => f.charAt(0).toLowerCase() + f.slice(1)).join('; ')}.` },
    { say: 'One container for all nine, please.' },
  ],
  checks: [askedFirst, grid, noLinks(), everyItemKeyed(), noCoordinates(), doneOnly(1)],
  fake: { good: [ask, draw], bad: [bad, async (bot) => { bot.say('Done.'); }], badFails: ['structure-first', 'grid-of-findings', 'no-links', 'reads-references'] },
};
