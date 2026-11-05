// Written scenario 40: where the cards stand, with nothing in the message (an earlier chat, or a compaction). The bot
// finds what it owes with `list_open` (number, kind, title, status, `pending`), never by reading every card with
// `get_board`, and answers the one note it owes once.
import { answersTo, callsTo, check, doneOnly, noKeyConflict } from '../checks.ts';
import type { Scenario } from '../types.ts';
import { BOARD, drawOffsite } from './offsite.ts';

const NOTE = 'Is the cabin free on a weekday?';

export const whereCardsStand: Scenario = {
  id: 'where-cards-stand',
  title: 'No Send in the message: find what is owed with list_open, then answer it',
  setup: async (s) => {
    await drawOffsite(s);
    await s.person.mark(BOARD, 1, 'drop');
    s.facts.noteSeq = await s.person.note(BOARD, 2, NOTE);
    await s.person.send(BOARD);
  },
  turns: [{ say: 'Pick up where we left off on the offsite board: answer whatever you owe me there.' }],
  checks: [
    check('reads-list-open', 'list_open is read before the first write', (r) => {
      const first = r.calls.findIndex((c) => c.name === 'write_board');
      const read = r.calls.findIndex((c) => c.name === 'list_open');
      return [read >= 0 && (first < 0 || read < first), r.calls.map((c) => c.name).join(', ') || 'no calls'];
    }),
    check('no-get-board', 'no get_board: what is owed comes from list_open', (r) =>
      [callsTo(r, 'get_board').length === 0, `${callsTo(r, 'get_board').length} get_board call(s)`]),
    check('note-answered-once', 'the note on card 2 has exactly one answer', (r) => {
      const answers = answersTo(r, 2, Number(r.facts.noteSeq));
      return [answers.length === 1, `${answers.length} answer(s): ${answers.map(({ item }) => `${item.type} ${item.key}`).join(', ')}`];
    }),
    check('settled-left-alone', 'nothing answers card 1 (✗ settled it) or card 3 (open, with the person)', (r) => {
      const touched = callsTo(r, 'write_board').flatMap((c) => c.input.items ?? []).filter((i: any) => [1, 3].includes(i.n));
      return [touched.length === 0, touched.map((i: any) => `${i.type} on ${i.n}`).join(', ') || 'none'];
    }),
    noKeyConflict(), doneOnly(),
  ],
  fake: {
    good: [async (bot) => {
      await bot.call('list_open', { board: BOARD });
      const seq = (await bot.call('show_node', { board: BOARD, n: 2 })).notes.at(-1).seq;
      await bot.call('write_board', { board: BOARD, items: [{ type: 'reply', key: 'offsite-reply-n2-weekday', n: 2, to: seq, text: 'Weekdays are free next month. ✓ to pick the cabin.' }] });
      bot.say('Done.');
    }],
    bad: [async (bot) => {
      await bot.call('get_board', { board: BOARD });
      const seq = (await bot.call('show_node', { board: BOARD, n: 2 })).notes.at(-1).seq;
      await bot.call('write_board', { board: BOARD, items: [
        { type: 'reply', key: 'offsite-reply-n2-a', n: 2, to: seq, text: 'Weekdays are free.' },
        { type: 'reply', key: 'offsite-reply-n2-b', n: 2, to: seq, text: 'Weekdays are free next month.' },
      ] });
      bot.say('Done.');
    }],
    badFails: ['reads-list-open', 'no-get-board', 'note-answered-once'],
  },
};
