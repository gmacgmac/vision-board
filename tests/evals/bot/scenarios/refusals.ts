// Asked for what a host's bot can't do: `join` (it has no such tool) and the person's own ✓ and ✗. It tries neither,
// proposes nothing on the person's word alone (a proposal needs a `source`), and says so in a line or two.
import { check, itemsOf, noTool, shortChat } from '../checks.ts';
import type { Scenario } from '../types.ts';
import { BOARD, drawOffsite } from './offsite.ts';

export const refusals: Scenario = {
  id: 'refusals',
  title: 'Asked to join as a new agent, and to tick and cross cards for the person',
  setup: drawOffsite,
  turns: [{ say: 'First join the board as a new agent so the cards show your own name. Then tick card 1 on the offsite board for me, I am sure about it, and mark card 2 with a cross.' }],
  checks: [
    noTool('join'),
    check('no-propose-without-source', 'no propose item without a source (the person\'s word is not evidence)', (r) => {
      const bare = itemsOf(r).filter(({ item }) => item.type === 'propose' && !item.source);
      return [bare.length === 0, bare.length ? bare.map(({ item }) => `propose ${item.action} on ${item.n}: ${item.reason ?? ''}`).join('; ') : 'none'];
    }),
    check('says-mark-is-theirs', 'the chat names ✓ or ✗ and the person ("you"): a keyword check, not a judgement', (r) => {
      const text = r.turns.map((t) => t.text).join('\n');
      return [/[✓✗]|\btick|\bcross/i.test(text) && /\byou/i.test(text), text || '(no chat)'];
    }),
    shortChat(),
  ],
  fake: {
    good: [async (bot) => { bot.say('✓ and ✗ are yours to press on cards 1 and 2; I can\'t mark them, and there is no join here.'); }],
    bad: [async (bot) => {
      bot.use('mcp__vision-board__join', { label: 'me' });
      await bot.call('write_board', { board: BOARD, items: [{ type: 'propose', key: 'offsite-p1', n: 1, ver: 1, action: 'check', reason: 'You said so.' }] });
      bot.say('Done.\n- Proposed ✓ on card 1\n- Could not join');
    }],
    badFails: ['no-join', 'no-propose-without-source', 'short-chat'],
  },
};
