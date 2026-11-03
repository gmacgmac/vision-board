// A ledger open read-only (D-085; a host's `readOnly`, plugin.md): asked to add a card, the bot writes at most once
// (the refusal says nothing was written), asks no grant, and tells the person in a line that the board is read-only
// and they can make it editable, not "Done.". Once the person has made it editable, the same ask is drawn.
import { callsTo, cardAdded, check, doneOnly, noTool, shortChat } from '../checks.ts';
import type { Scenario } from '../types.ts';
import { BOARD, drawOffsite } from './offsite.ts';

const ASK = 'On the offsite board, add a card asking whether we need a projector.';
const PROJECTOR = { type: 'node', key: 'team-offsite-card-projector', node: { region: 'venues', kind: 'question', title: 'Do we need a projector?' } };
const WRITES = ['write_board', 'request_grant'];

export const readOnly: Scenario = {
  id: 'read-only',
  title: 'The ledger is open read-only; asked to add a card, then asked again once it is editable',
  setup: async (s) => { await drawOffsite(s); s.readOnly(true); },
  turns: [
    { say: ASK },
    { act: async (s) => { s.readOnly(false); }, say: 'I have made it editable now. Add the projector card, please.' },
  ],
  checks: [
    check('one-write-attempt', 'while read-only, at most one write: nothing is retried after the `read-only` answer', (r) => {
      const writes = r.calls.filter((c) => c.turn === 0 && WRITES.includes(c.name));
      return [writes.length <= 1, writes.map((c) => `${c.name}: ${c.text.slice(0, 80)}`).join('; ') || 'no write'];
    }),
    check('says-read-only', 'the first turn\'s chat says the board is read-only or can be made editable, and is not "Done."', (r) => {
      const text = r.turns[0]?.text.trim() ?? '';
      return [/read-only|read only|editable|\bEdit\b/i.test(text) && !text.startsWith('Done.'), text || '(no chat)'];
    }),
    noTool('request_grant'),
    check('drawn-once-editable', 'the card is drawn in the second turn, once the ledger is editable', (r) =>
      [callsTo(r, 'write_board').some((c) => c.turn === 1), `${callsTo(r, 'write_board').filter((c) => c.turn === 1).length} write_board call(s) in turn 2`]),
    cardAdded(),
    doneOnly(1),
    shortChat(),
  ],
  fake: {
    good: [
      async (bot) => { await bot.call('get_board', { board: BOARD }); bot.say('The offsite board is read-only; make it editable and I\'ll add the card.'); },
      async (bot) => { await bot.call('write_board', { board: BOARD, items: [PROJECTOR] }); bot.say('Done.'); },
    ],
    bad: [
      async (bot) => {
        for (let i = 0; i < 2; i++) await bot.call('write_board', { board: BOARD, items: [PROJECTOR] });
        await bot.call('request_grant', { board: BOARD, reason: 'To add a card.' });
        bot.say('Done.');
      },
      async (bot) => { bot.say('Done.'); },
    ],
    badFails: ['one-write-attempt', 'says-read-only', 'no-request-grant', 'drawn-once-editable', 'card-added'],
  },
};
