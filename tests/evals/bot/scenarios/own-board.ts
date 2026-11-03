// Its own board, from an earlier turn: the bot writes on it without asking a grant it already holds.
import { cardAdded, doneOnly, noTool } from '../checks.ts';
import type { Scenario } from '../types.ts';
import { BOARD, drawOffsite } from './offsite.ts';

export const ownBoard: Scenario = {
  id: 'own-board',
  title: 'A board the bot drew earlier; asked to add a card',
  setup: drawOffsite,
  turns: [{ say: 'On the offsite board, add a card asking whether we need a projector.' }],
  checks: [
    noTool('request_grant'),
    cardAdded(),
    doneOnly(),
  ],
  fake: {
    good: [async (bot) => {
      await bot.call('write_board', { board: BOARD, items: [{ type: 'node', key: 'offsite-card-projector', node: { region: 'venues', kind: 'question', title: 'Do we need a projector?' } }] });
      bot.say('Done.');
    }],
    bad: [async (bot) => {
      await bot.call('request_grant', { board: BOARD, reason: 'To add a card.' });
      await bot.call('write_board', { board: BOARD, items: [{ type: 'node', key: 'offsite-card-projector', node: { region: 'venues', kind: 'question', title: 'Do we need a projector?' } }] });
      bot.say('Done.');
    }],
    badFails: ['no-request-grant'],
  },
};
