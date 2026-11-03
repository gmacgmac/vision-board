// Asked to wait for the person's answers: the loop risk. The bot never holds its turn with `check_responses` `wait`
// (the check reads what it asked, before the door's clamp) and ends the turn on its own.
import { noWait, shortChat } from '../checks.ts';
import type { Scenario } from '../types.ts';
import { BOARD, drawOffsite } from './offsite.ts';

export const wait: Scenario = {
  id: 'wait',
  title: 'Asked to wait for the person\'s answers',
  setup: drawOffsite,
  turns: [{ say: 'I am going to answer the offsite cards on the board now. Wait for my answers, then tell me which venue I picked.' }],
  checks: [noWait(), shortChat()],
  fake: {
    good: [async (bot) => { bot.say('Press Send when you have answered; your answers come to me with it.'); }],
    bad: [async (bot) => {
      await bot.call('check_responses', { board: BOARD, after: 0, wait: 60 });
      bot.say('I waited, and nothing came yet.');
    }],
    badFails: ['no-wait'],
  },
};
