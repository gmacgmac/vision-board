// A note answered in an earlier turn: the bot, asked for something else on that board, does not answer it again.
import { answersTo, cardAdded, check, doneOnly, noKeyConflict } from '../checks.ts';
import type { Scenario } from '../types.ts';
import { BOARD, answeredRound } from './offsite.ts';

export const answeredNote: Scenario = {
  id: 'answered-note',
  title: 'A note answered last turn; now asked to add a card',
  setup: answeredRound,
  turns: [{ say: 'Add a fourth option to the offsite board: a co-working space downtown.' }],
  checks: [
    check('no-second-answer', 'nothing answers the note on card 1 again (it was answered last turn)', (r) => {
      const again = answersTo(r, 1, Number(r.facts.noteSeq));
      return [again.length === 0, again.length ? again.map(({ item }) => `${item.type} ${item.key}: ${item.text ?? ''}`).join('; ') : 'none'];
    }),
    cardAdded(),
    noKeyConflict(), doneOnly(),
  ],
  fake: {
    good: [async (bot) => {
      await bot.call('write_board', { board: BOARD, items: [{ type: 'node', key: 'offsite-card-coworking', node: { region: 'venues', kind: 'decision', title: 'Co-working space downtown', body: 'Flexible rooms in town.\n\n✓ pick it · ✗ rule it out' } }] });
      bot.say('Done.');
    }],
    bad: [async (bot) => {
      const node = await bot.call('show_node', { board: BOARD, n: 1 });
      await bot.call('write_board', { board: BOARD, items: [
        { type: 'reply', key: 'offsite-reply-again', n: 1, to: node.notes.at(-1).seq, text: 'About an hour. ✓ if that settles it.' },
        { type: 'node', key: 'offsite-f1', node: { region: 'venues', kind: 'decision', title: 'Co-working space downtown', body: '✓ pick it · ✗ rule it out' } },
      ] });
      bot.say('Done.');
    }],
    badFails: ['no-second-answer', 'card-added', 'no-key-conflict'],
  },
};
