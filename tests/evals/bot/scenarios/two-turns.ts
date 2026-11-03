// Two turns of writes in one conversation, as a host keeps one: the draw, then the person's Send with a ✗ and a note.
// Keys never repeat across the turns (no `conflict`), and the note is answered once.
import { answersTo, check, doneOnly, everyItemKeyed, noKeyConflict } from '../checks.ts';
import type { Scenario } from '../types.ts';
import { BOARD, DRAW, NOTE, fakeDraw, fakeReply } from './offsite.ts';

export const twoTurns: Scenario = {
  id: 'two-turns',
  title: 'One conversation: draw, then the person\'s Send with a note',
  turns: [
    { say: DRAW },
    {
      // The person answers on the board the bot drew, whatever it named it.
      act: async (s) => {
        const board = s.botBoard() ?? BOARD;
        await s.person.mark(board, 1, 'drop');
        s.facts.noteSeq = await s.person.note(board, 1, NOTE);
        await s.person.mark(board, 3, 'ack');
      },
      send: (s) => s.botBoard() ?? BOARD,
    },
  ],
  checks: [
    noKeyConflict(), everyItemKeyed(),
    check('note-answered-once', 'the note on card 1 has exactly one answer', (r) => {
      const answers = answersTo(r, 1, Number(r.facts.noteSeq));
      return [answers.length === 1, `${answers.length} answer(s)`];
    }),
    doneOnly(0), doneOnly(1),
  ],
  fake: {
    good: [fakeDraw, (bot) => fakeReply(bot, 'offsite-venue-reply-n1')],
    bad: [fakeDraw, (bot) => fakeReply(bot, 'offsite-venue-f1')],
    badFails: ['no-key-conflict', 'note-answered-once'],
  },
};
