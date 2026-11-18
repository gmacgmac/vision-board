// Standalone, written scenario 46 (node-overhaul T_05, the layouts reference): a flow that forks and rejoins. The bot reads
// `references/layouts.md` (it links cards) and nothing else, draws the flow in one container with a fork and a rejoin,
// leaves `direction` to the board, and checks the layout once.
import path from 'node:path';
import { doneOnly, everyItemKeyed, noCoordinates } from '../checks.ts';
import type { FakeBot, Scenario } from '../types.ts';
import { directionLeftOut, forksAndRejoins } from './layout-checks.ts';
import { fewCrossLinks, linkedInOneFlow } from './linked-pipeline.ts';

const BOARD = 'support-tickets';
const STEPS = [['in', 'Ticket comes in'], ['triage', 'Triage'], ['oncall', 'On-call engineer'], ['queue', 'Queue'], ['agent', 'Agent picks it up'], ['resolve', 'Resolve'], ['close', 'Close']] as const;
const LINKS = [['in', 'triage'], ['triage', 'oncall'], ['triage', 'queue'], ['queue', 'agent'], ['oncall', 'resolve'], ['agent', 'resolve'], ['resolve', 'close']] as const;
const key = (id: string) => `support-card-${id}`;
const items = (direction?: string) => [
  { type: 'board', key: 'support-board', title: 'Support tickets', summary: 'How a support ticket goes from in to closed.' },
  { type: 'region', key: 'support-region-flow', region: { id: 'flow', title: 'Ticket flow', mode: 'flow', ...(direction && { direction }) } },
  ...STEPS.map(([id, title]) => ({ type: 'node', key: key(id), node: { region: 'flow', kind: 'topic', title } })),
  ...LINKS.map(([a, b]) => ({ type: 'link', key: `support-link-${a}-${b}`, from: { key: key(a) }, to: { key: key(b) } })),
];

async function good(bot: FakeBot) {
  const { secret } = await bot.call('join', { label: path.basename(bot.dir) });
  bot.read('layouts');
  await bot.call('write_board', { secret, board: BOARD, items: items() });
  await bot.call('show_layout', { board: BOARD, region: 'flow' });
  bot.say('Done. Support tickets (`support-tickets`).');
}

/** Reads nothing, draws the two paths as straight chains with no rejoin, and steers the direction. */
async function bad(bot: FakeBot) {
  const { secret } = await bot.call('join', { label: path.basename(bot.dir) });
  const straight = items('down').filter((i) => !(i.type === 'link' && /oncall-resolve|triage-queue/.test(String(i.key))));
  await bot.call('write_board', { secret, board: BOARD, items: straight });
  bot.say('Done.');
}

export const flowBranches: Scenario = {
  id: 'flow-branches',
  title: 'Standalone: a flow that forks and rejoins, in one container, read from the layouts reference',
  turns: [{ say: 'Draw our support ticket flow on a new board as one flow: a ticket comes in and is triaged; urgent tickets go straight to the on-call engineer, the rest wait in the queue until an agent picks them up; both paths end at resolve, then close.' }],
  checks: [forksAndRejoins(), linkedInOneFlow(6), fewCrossLinks(), directionLeftOut(), everyItemKeyed(), noCoordinates(), doneOnly()],
  reads: { need: ['layouts'] },
  fake: { good: [good], bad: [bad], badFails: ['forks-and-rejoins', 'direction-left-out', 'reads-references'] },
};
