// Standalone, written scenario 47 (node-overhaul T_05, the layouts reference): work moving between three owners, as lanes.
// The bot reads `references/layouts.md`, draws one `lanes` container with a lane per owner and every card in one of them,
// each lane its own sequence with a few handoffs, and checks the layout once.
import path from 'node:path';
import { check, doneOnly, everyItemKeyed, noCoordinates } from '../checks.ts';
import type { FakeBot, Scenario } from '../types.ts';
import { accepted, layoutCheckedOnce } from './layout-checks.ts';
import { fewCrossLinks, linkedInOneFlow } from './linked-pipeline.ts';

const BOARD = 'feature-requests';
const LANES = ['Product', 'Design', 'Engineering'];
const STEPS = [
  ['brief', 'Write the brief', 'Product'], ['priority', 'Set its priority', 'Product'], ['sketch', 'Sketch it', 'Design'],
  ['test', 'Test the sketch with users', 'Design'], ['build', 'Build it', 'Engineering'], ['ship', 'Ship it', 'Engineering'],
  ['review', 'Review the shipped feature', 'Product'],
] as const;
const LINKS = [['brief', 'priority'], ['priority', 'sketch'], ['sketch', 'test'], ['test', 'build'], ['build', 'ship'], ['ship', 'review']] as const;
const key = (id: string) => `features-card-${id}`;

const lanesUsed = check('lanes-used', 'one `lanes` container names the three owners, and every card in it sits in one of them', (r) => {
  const regions = accepted(r, 'region').map(({ item }) => item.region).filter((g) => g?.mode === 'lanes');
  const lanes = (regions.at(-1)?.lanes ?? []) as string[];
  const cards = accepted(r, 'node').map(({ item }) => item.node).filter((n) => n?.region === regions.at(-1)?.id);
  const astray = cards.filter((n) => !lanes.includes(n.lane));
  const named = LANES.every((l) => lanes.some((x) => x.toLowerCase().includes(l.toLowerCase())));
  return [regions.length > 0 && named && cards.length >= 6 && astray.length === 0, `lanes: ${lanes.join(', ') || 'none'}; ${cards.length} cards, ${astray.length} outside a lane`];
});

async function good(bot: FakeBot) {
  const { secret } = await bot.call('join', { label: path.basename(bot.dir) });
  bot.read('layouts');
  await bot.call('write_board', { secret, board: BOARD, items: [
    { type: 'board', key: 'features-board', title: 'Feature requests', summary: 'How a feature request moves from Product to Design to Engineering and back.' },
    { type: 'region', key: 'features-region-lanes', region: { id: 'work', title: 'Who does what', mode: 'lanes', lanes: LANES } },
    ...STEPS.map(([id, title, lane]) => ({ type: 'node', key: key(id), node: { region: 'work', kind: 'topic', title, lane } })),
    ...LINKS.map(([a, b]) => ({ type: 'link', key: `features-link-${a}-${b}`, from: { key: key(a) }, to: { key: key(b) } })),
  ] });
  await bot.call('show_layout', { board: BOARD, region: 'work' });
  bot.say('Done. Feature requests (`feature-requests`).');
}

/** Reads nothing, puts each owner in a container of its own and links across them, and never checks the layout. */
async function bad(bot: FakeBot) {
  const { secret } = await bot.call('join', { label: path.basename(bot.dir) });
  await bot.call('write_board', { secret, board: BOARD, items: [
    { type: 'board', key: 'features-board', title: 'Feature requests', summary: 'How a feature request moves.' },
    ...LANES.map((l) => ({ type: 'region', key: `features-region-${l}`, region: { id: l.toLowerCase(), title: l, mode: 'flow' } })),
    ...STEPS.map(([id, title, lane]) => ({ type: 'node', key: key(id), node: { region: lane.toLowerCase(), kind: 'topic', title } })),
    ...LINKS.map(([a, b]) => ({ type: 'link', key: `features-link-${a}-${b}`, from: { key: key(a) }, to: { key: key(b) } })),
  ] });
  bot.say('Done.');
}

export const lanesHandoffs: Scenario = {
  id: 'lanes-handoffs',
  title: 'Standalone: work moving between three owners as one lanes container, checked once',
  turns: [{ say: 'Lay out how a feature request moves between Product, Design and Engineering on a new board, as lanes: Product writes the brief, then sets its priority; Design sketches it, then tests the sketch with users; Engineering builds it, then ships it. The prioritised brief goes to Design, the tested design to Engineering, and Engineering hands the shipped feature back to Product for a review.' }],
  checks: [lanesUsed, linkedInOneFlow(5), fewCrossLinks(), layoutCheckedOnce(), everyItemKeyed(), noCoordinates(), doneOnly()],
  reads: { need: ['layouts'] },
  fake: { good: [good], bad: [bad], badFails: ['lanes-used', 'linked-in-one-flow', 'few-cross-links', 'layout-checked-once', 'reads-references'] },
};
