// A board the person made (on the board page: no agent made it), under a host's one bot per folder (`singleAgent`, which
// this scenario holds on): asked to add a card, the bot writes on it at once, asking no grant and the person nothing.
import { callsTo, cardAdded, check, doneOnly, noTool, resultsOf } from '../checks.ts';
import type { Scenario } from '../types.ts';

const BOARD = 'vegetable-garden';
const ITEMS = [
  { type: 'region', key: 'vegetable-garden-r-plants', region: { id: 'plants', title: 'What to plant' } },
  { type: 'node', key: 'vegetable-garden-card-tomatoes', node: { region: 'plants', kind: 'question', title: 'Plant tomatoes this year?' } },
];

export const personBoard: Scenario = {
  id: 'person-board',
  title: 'A board the person made; asked to add a card, under one bot per folder',
  flags: { singleAgent: true },
  setup: async (s) => { await s.person.board(BOARD, 'Vegetable garden'); },
  turns: [{ say: 'On the vegetable garden board, add a card asking whether we should plant tomatoes this year.' }],
  checks: [
    noTool('request_grant'),
    check('on-their-board', 'the card is drawn on the person\'s board, not a new one', (r) => {
      const ok = callsTo(r, 'write_board').filter((c) => c.input.board === BOARD && resultsOf(c).some((x) => x.ok && typeof x.n === 'number'));
      return [ok.length > 0, callsTo(r, 'write_board').map((c) => `${c.input.board}: ${c.text.slice(0, 80)}`).join('; ') || 'no write'];
    }),
    cardAdded(),
    doneOnly(),
  ],
  fake: {
    good: [async (bot) => {
      await bot.call('list_boards', {});
      await bot.call('write_board', { board: BOARD, items: ITEMS });
      bot.say('Done.');
    }],
    bad: [async (bot) => {
      await bot.call('request_grant', { board: BOARD, reason: 'To add a card.' });
      await bot.call('write_board', { board: BOARD, items: ITEMS });
      bot.say('Done.');
    }],
    badFails: ['no-request-grant'],
  },
};
