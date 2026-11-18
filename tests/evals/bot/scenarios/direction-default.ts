// Standalone, written scenario 49 (node-overhaul T_05, the layouts reference): the header's direction holds. The bot draws a
// flow; the person turns the board's flows to run down in its header (a `direction` act with no container) and asks for a
// second flow. The bot reads `references/layouts.md`, puts the second flow in a container of its own, and never sets
// `direction` on either: the board's choice holds, and nothing the bot sends steers it.
import path from 'node:path';
import { check, doneOnly, everyItemKeyed, noCoordinates } from '../checks.ts';
import type { FakeBot, Scenario } from '../types.ts';
import { accepted, cardsByContainer, directionLeftOut } from './layout-checks.ts';
import { fewCrossLinks, placesOf } from './linked-pipeline.ts';

const BOARD = 'deploy-steps';
const DEPLOY = [['build', 'Build'], ['test', 'Test'], ['deploy', 'Deploy']] as const;
const ROLLBACK = [['stop', 'Stop traffic'], ['restore', 'Restore the last release'], ['health', 'Check health'], ['reopen', 'Reopen traffic']] as const;
const flow = (region: string, steps: readonly (readonly [string, string])[], direction?: string) => [
  { type: 'region', key: `deploy-region-${region}`, region: { id: region, title: region === 'deploy' ? 'Deploy' : 'Rollback', mode: 'flow', ...(direction && { direction }) } },
  ...steps.map(([id, title]) => ({ type: 'node', key: `deploy-card-${id}`, node: { region, kind: 'topic', title } })),
  ...steps.slice(1).map(([id], i) => ({ type: 'link', key: `deploy-link-${steps[i]![0]}-${id}`, from: { key: `deploy-card-${steps[i]![0]}` }, to: { key: `deploy-card-${id}` } })),
];

const twoFlows = check('two-flows', 'the rollback steps are a second linked `flow` container, beside the first', (r) => {
  const flows = accepted(r, 'region').map(({ item }) => item.region).filter((g) => g?.mode === 'flow').map((g) => g.id as string);
  const linked = new Map<string, number>();
  for (const [a, b] of placesOf(r).links) if (a !== undefined && a === b) linked.set(a, (linked.get(a) ?? 0) + 1);
  const ok = [...new Set(flows)].filter((id) => (linked.get(id) ?? 0) >= 2 && (cardsByContainer(r).get(id)?.length ?? 0) >= 3);
  return [ok.length >= 2, `flows: ${[...new Set(flows)].map((id) => `${id} (${linked.get(id) ?? 0} links)`).join(', ') || 'none'}`];
});

/** The fake bot's secret, kept from its first turn to its second (one process per run). */
let secret = '';
async function first(bot: FakeBot, read = true) {
  ({ secret } = await bot.call('join', { label: path.basename(bot.dir) }));
  if (read) bot.read('layouts');
  await bot.call('write_board', { secret, board: BOARD, items: [{ type: 'board', key: 'deploy-board', title: 'Deploy steps', summary: 'How a release goes out, and how it comes back.' }, ...flow('deploy', DEPLOY)] });
  if (read) await bot.call('show_layout', { board: BOARD, region: 'deploy' });
  bot.say('Done. Deploy steps (`deploy-steps`).');
}
async function second(bot: FakeBot) {
  await bot.call('write_board', { secret, board: BOARD, items: flow('rollback', ROLLBACK) });
  bot.say('Done.');
}
/** Reads nothing, steers the first flow down itself, and puts the rollback steps into it. */
async function bad(bot: FakeBot) {
  const into = flow('deploy', ROLLBACK).slice(1).map((i) => ({ ...i, key: `${i.key}-x` }));
  await bot.call('write_board', { secret, board: BOARD, items: [{ type: 'region', key: 'deploy-region-deploy-down', region: { id: 'deploy', title: 'Deploy', mode: 'flow', direction: 'down' } }, ...into] });
  bot.say('Done.');
}

export const directionDefault: Scenario = {
  id: 'direction-default',
  title: 'Standalone: the board\'s direction, set in its header, holds: the bot never sets `direction`',
  turns: [
    { say: 'Put our deploy steps on a new board as a flow: build, test, then deploy.' },
    {
      act: async (s) => { await s.person.direction(s.botBoard()!, 'down'); },
      say: 'I turned the board\'s flows to run down in its header. Now add our rollback steps to that board as their own flow: stop traffic, restore the last release, check health, then reopen traffic.',
    },
  ],
  checks: [twoFlows, directionLeftOut(), fewCrossLinks(), everyItemKeyed(), noCoordinates(), doneOnly(1)],
  reads: { need: ['layouts'] },
  fake: { good: [first, second], bad: [(bot) => first(bot, false), bad], badFails: ['two-flows', 'direction-left-out', 'reads-references'] },
};
