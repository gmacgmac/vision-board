// A Send round: the person's ✗ and a note on card 1, ✓ on card 3, then Send. The bot works from the message alone (no
// re-read), answers the note once, and asks for the mark again, since its answer cleared the ✗.
import { answersTo, callsTo, check, doneOnly, noKeyConflict } from '../checks.ts';
import type { Scenario } from '../types.ts';
import { BOARD, NOTE, drawOffsite, fakeReply } from './offsite.ts';

export const sendRound: Scenario = {
  id: 'send-round',
  title: 'The person\'s Send: ✗ and a note on card 1, ✓ on card 3',
  setup: drawOffsite,
  turns: [{
    act: async (s) => {
      await s.person.mark(BOARD, 1, 'drop');
      s.facts.noteSeq = await s.person.note(BOARD, 1, NOTE);
      await s.person.mark(BOARD, 3, 'ack');
    },
    send: BOARD,
  }],
  checks: [
    check('no-re-read', 'no check_responses or list_open: the message carried the answers', (r) => {
      const reads = [...callsTo(r, 'check_responses'), ...callsTo(r, 'list_open')];
      return [reads.length === 0, reads.length ? reads.map((c) => `${c.name} ${JSON.stringify(c.input)}`).join('; ') : 'none'];
    }),
    check('note-answered-once', 'the note on card 1 has exactly one answer (a reply to it, or an append on card 1)', (r) => {
      const answers = answersTo(r, 1, Number(r.facts.noteSeq));
      return [answers.length === 1, `${answers.length} answer(s): ${answers.map(({ item }) => `${item.type} ${item.key}`).join(', ')}`];
    }),
    check('asks-again', 'the answer on card 1 asks for ✓ or ✗ again (it cleared the ✗)', (r) => {
      const asked = answersTo(r, 1, Number(r.facts.noteSeq)).filter(({ item }) => /[✓✗]/.test(item.text ?? ''));
      return [asked.length > 0, asked[0]?.item.text ?? 'no answer names ✓ or ✗'];
    }),
    noKeyConflict(), doneOnly(),
  ],
  fake: {
    good: [(bot) => fakeReply(bot, 'offsite-reply-n1-first')],
    bad: [async (bot) => {
      await bot.call('check_responses', { board: BOARD, after: 0 });
      await fakeReply(bot, 'offsite-r1');
    }],
    badFails: ['no-re-read', 'no-key-conflict', 'note-answered-once'],
  },
};
