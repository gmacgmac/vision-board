// Standalone, access-clarity PLAN decision 4: an earlier chat (another agent) drew the offsite board and its venue
// container; the bot, joined as itself, is asked to add a card there. Its reads mark nothing `held` for it, so it asks
// for the container (`request_grant` with `board` and `region`) before any write on the board, and no item it sends
// answers `needs-grant`. The person grants each request as it arrives (point 715), so the bot draws the card the same turn.
import path from 'node:path';
import { callsTo, cardAdded, check, doneOnly, resultsOf } from '../checks.ts';
import type { Scenario } from '../types.ts';
import { BOARD, drawOffsite } from './offsite.ts';

const REGION = 'venues';
const CARD = { type: 'node', key: 'offsite-card-parking', node: { region: REGION, kind: 'question', title: 'Does the cabin have parking?' } };

export const otherContainer: Scenario = {
  id: 'other-container',
  title: 'Standalone: asked to add a card in a container another agent made; asks for it first',
  setup: async (s) => { await drawOffsite(s); s.person.grants(); },
  turns: [{ say: 'On the team offsite board, add a card to the venue options asking whether the cabin has parking.' }],
  checks: [
    check('grant-first', 'request_grant for the venue container (board and region) before any write on the board', (r) => {
      const asked = r.calls.findIndex((c) => c.name === 'request_grant' && c.input.board === BOARD && c.input.region === REGION && !c.isError);
      const wrote = r.calls.findIndex((c) => c.name === 'write_board' && c.input.board === BOARD);
      return [asked >= 0 && (wrote < 0 || asked < wrote), r.calls.map((c) => `${c.name}${c.input.region ? `(${c.input.region})` : ''}`).join(', ') || 'no call'];
    }),
    check('no-needs-grant', 'no write_board item answered needs-grant', (r) => {
      const refused = callsTo(r, 'write_board').flatMap(resultsOf).filter((x) => !x.ok && /needs-grant$/.test(x.problem?.type ?? ''));
      return [refused.length === 0, refused.map((x) => x.problem.detail).join('; ') || 'none'];
    }),
    cardAdded(),
    doneOnly(),
  ],
  fake: {
    good: [async (bot) => {
      const { secret } = await bot.call('join', { label: path.basename(bot.dir) });
      await bot.call('get_board', { board: BOARD });
      const asked = await bot.call('request_grant', { board: BOARD, region: REGION, reason: 'To add a card asking whether the cabin has parking.', secret });
      await bot.call('check_responses', { board: BOARD, after: asked.request, wait: 30, secret });
      await bot.call('write_board', { board: BOARD, items: [CARD], secret });
      bot.say('Done.');
    }],
    bad: [async (bot) => {
      const { secret } = await bot.call('join', { label: path.basename(bot.dir) });
      await bot.call('write_board', { board: BOARD, items: [CARD], secret });
      await bot.call('request_grant', { board: BOARD, reason: 'To add a card.', secret });
      bot.say('Done.');
    }],
    badFails: ['grant-first', 'no-needs-grant'],
  },
};
