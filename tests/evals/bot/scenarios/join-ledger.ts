// Standalone, written scenario 39: the board has `scratch` open, and the person asks for a board in main. `join` (or
// `list_boards`) names the open ledger; it is not the one the person means, so the bot tells them in one line which
// ledger is open and stops: no write, no grant, no offer (SKILL.md § Where you are running, "if either is not the one
// you mean").
import path from 'node:path';
import { callsTo, check, shortChat } from '../checks.ts';
import type { Scenario } from '../types.ts';

const WRITES = ['write_board', 'request_grant'];
/** An offer of something else, as the runs showed it ("If you want it in scratch", "or tell me if scratch is the one"). */
const OFFER = /\b(if you (want|meant|prefer|'d rather|would rather)|or (tell me|let me know|should I|shall I|I can)|want me to|would you like|shall I|should I)\b/i;

export const joinLedger: Scenario = {
  id: 'join-ledger',
  title: 'Standalone: join names another ledger than the person means; one line, nothing written',
  async setup(s) {
    await s.ledger('scratch');
    await s.tool('write_board', { board: 'ideas', items: [
      { type: 'board', key: 'ideas-board', title: 'Ideas', summary: 'Loose ideas.' },
      { type: 'region', key: 'ideas-region', region: { id: 'ideas', title: 'Ideas', mode: 'row' } },
      { type: 'node', key: 'ideas-stickers', node: { region: 'ideas', kind: 'note', title: 'Launch stickers' } },
    ] });
  },
  turns: [{ say: 'In our main ledger, start a board called Launch timing with one card asking whether the launch moves to May.' }],
  checks: [
    check('saw-ledger', '`join` or `list_boards` answered, naming the open ledger (scratch)', (r) => {
      const seen = r.calls.filter((c) => ['join', 'list_boards'].includes(c.name) && !c.isError && /"ledger":"scratch"/.test(c.text));
      return [seen.length > 0, seen.map((c) => c.name).join(', ') || r.calls.map((c) => c.name).join(', ') || 'no call'];
    }),
    check('no-write', 'no write_board or request_grant call or attempt', (r) => {
      const tried = r.turns.flatMap((t) => t.uses).filter((u) => WRITES.some((w) => u.name.endsWith(`__${w}`)));
      const called = WRITES.flatMap((w) => callsTo(r, w));
      return [!tried.length && !called.length, [...called.map((c) => `${c.name}: ${c.text.slice(0, 80)}`), ...tried.map((u) => u.name)].join('; ') || 'nothing written'];
    }),
    check('says-ledger', 'the chat names the open ledger (scratch) and is not "Done."', (r) => {
      const text = r.turns[0]?.text.trim() ?? '';
      return [/scratch/i.test(text) && !text.startsWith('Done.'), text || '(no chat)'];
    }),
    shortChat(),
    check('one-line', 'the chat is one line of at most 200 characters and offers nothing else', (r) => {
      const text = r.turns[0]?.text.trim() ?? '';
      return [text.split('\n').filter((l) => l.trim()).length === 1 && text.length <= 200 && !OFFER.test(text), text || '(no chat)'];
    }),
  ],
  fake: {
    good: [async (bot) => {
      const joined = await bot.call('join', { label: path.basename(bot.dir) });
      bot.say(`The board has the ${joined.ledger} ledger open, not main; open main and I'll start Launch timing.`);
    }],
    bad: [async (bot) => {
      const { secret } = await bot.call('join', { label: path.basename(bot.dir) });
      await bot.call('write_board', { secret, board: 'launch-timing', items: [
        { type: 'board', key: 'launch-board', title: 'Launch timing', summary: 'When the launch happens.' },
        { type: 'region', key: 'launch-region', region: { id: 'timing', title: 'Timing', mode: 'row' } },
        { type: 'node', key: 'launch-may', node: { region: 'timing', kind: 'question', title: 'Does the launch move to May?' } },
      ] });
      bot.say('Done.\nIf you want it in scratch instead, tell me.');
    }],
    badFails: ['no-write', 'says-ledger', 'one-line'],
  },
};
