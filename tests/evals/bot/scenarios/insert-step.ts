// Written scenario 42: a step put into a flow. One `node` item with `insert: { after, before }` (PLAN decision 5, point
// 424) puts the card between two linked cards, in one write; never the three items it took before (an unlink and two
// links). Reading the board first, to find the numbers, is fine.
import { callsTo, check, doneOnly, everyItemKeyed, itemsOf, noKeyConflict, resultsOf } from '../checks.ts';
import type { Scenario, Stage } from '../types.ts';

const BOARD = 'release-steps';
const STEPS = [['merge', 'Merge the branch'], ['tag', 'Tag the release'], ['deploy', 'Deploy']] as const;
const SMOKE = { type: 'node', key: 'release-card-smoke-tests', node: { region: 'steps', kind: 'topic', title: 'Run the smoke tests' } };

/** The bot's earlier turn: a flow of three steps, linked "then": cards 1 to 3. */
async function drawSteps(s: Stage): Promise<void> {
  await s.tool('write_board', { board: BOARD, items: [
    { type: 'board', key: 'release-board', title: 'Release steps', summary: 'How a release goes out.' },
    { type: 'region', key: 'release-region-steps', region: { id: 'steps', title: 'Steps', mode: 'flow' } },
    ...STEPS.map(([id, title]) => ({ type: 'node', key: `release-card-${id}`, node: { region: 'steps', kind: 'topic', title } })),
    { type: 'link', key: 'release-link-merge-tag', from: { key: 'release-card-merge' }, to: { key: 'release-card-tag' }, label: 'then' },
    { type: 'link', key: 'release-link-tag-deploy', from: { key: 'release-card-tag' }, to: { key: 'release-card-deploy' }, label: 'then' },
  ] });
}

export const insertStep: Scenario = {
  id: 'insert-step',
  title: 'Put a step between two linked cards of a flow, in one item',
  setup: drawSteps,
  turns: [{ say: 'On the release steps board, add a step to run the smoke tests between tagging and deploying.' }],
  checks: [
    check('one-insert', 'one node item with `insert` went in between cards 2 and 3 (the answer\'s `inserted`)', (r) => {
      const done = callsTo(r, 'write_board').flatMap(resultsOf).filter((x) => x.ok && x.inserted);
      const ok = done.length === 1 && done[0].inserted.after === 2 && done[0].inserted.before === 3;
      const sent = itemsOf(r).filter(({ item }) => item.insert).map(({ item, index, call }) => `${JSON.stringify(item.insert)}: ${resultsOf(call)[index]?.problem?.detail ?? 'ok'}`);
      return [ok, `inserted: ${JSON.stringify(done.map((x) => x.inserted))}; sent: ${sent.join(' | ') || 'none'}`];
    }),
    check('no-link-items', 'no `link` or `unlink` item: the insert does both', (r) => {
      const links = itemsOf(r).filter(({ item }) => ['link', 'unlink'].includes(item.type));
      return [links.length === 0, links.map(({ item }) => `${item.type} ${item.key}`).join(', ') || 'none'];
    }),
    everyItemKeyed(), noKeyConflict(), doneOnly(),
  ],
  fake: {
    good: [async (bot) => {
      await bot.call('show_container', { board: BOARD, region: 'steps' });
      await bot.call('write_board', { board: BOARD, items: [{ ...SMOKE, insert: { after: 2, before: 3 } }] });
      bot.say('Done.');
    }],
    bad: [async (bot) => {
      await bot.call('write_board', { board: BOARD, items: [
        SMOKE,
        { type: 'unlink', key: 'release-unlink-tag-deploy', from: 2, to: 3 },
        { type: 'link', key: 'release-link-tag-smoke', from: 2, to: { key: SMOKE.key }, label: 'then' },
        { type: 'link', key: 'release-link-smoke-deploy', from: { key: SMOKE.key }, to: 3, label: 'then' },
      ] });
      bot.say('Done.');
    }],
    badFails: ['one-insert', 'no-link-items'],
  },
};
