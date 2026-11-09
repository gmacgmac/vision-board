// Written scenario 41: a new card named in a reply. The bot draws the card first and names it, in a later call, by the
// `n` the board gave it (PLAN decision 4, point 422): no text in a write names a card number the board had not given
// before that call, even a guess that happens to be right; and no card is drawn only to be retired (Haiku, 2026-11-09).
import { answersTo, callsTo, cardAdded, check, doneOnly, noKeyConflict, resultsOf } from '../checks.ts';
import type { RunRecord, Scenario } from '../types.ts';
import { BOARD, drawOffsite } from './offsite.ts';

const NOTE = 'Could we add a co-working space downtown as a fourth option? Tell me which card it is.';
const CARD = /\bcards?\s+(\d+)/gi;
const textsOf = (item: any): string[] => [item.text, item.title, item.node?.title, item.node?.body].filter((t) => typeof t === 'string');
const numbersIn = (text: string) => [...text.matchAll(CARD)].map((m) => Number(m[1]));

/** Card numbers each write named before the board gave them: [call's turn, the number, the text]. */
function guesses(r: RunRecord): string[] {
  const known = new Set(Array.from({ length: Number(r.facts.cards) }, (_, i) => i + 1));
  const out: string[] = [];
  for (const c of callsTo(r, 'write_board')) {
    for (const item of c.input.items ?? []) {
      for (const text of textsOf(item)) for (const n of numbersIn(text)) if (!known.has(n)) out.push(`card ${n} in "${text.slice(0, 80)}"`);
    }
    for (const x of resultsOf(c)) if (x.ok && typeof x.n === 'number') known.add(x.n);
  }
  return out;
}
const newCards = (r: RunRecord) => callsTo(r, 'write_board').flatMap(resultsOf).filter((x) => x.ok && x.ver === 1 && x.n > Number(r.facts.cards)).map((x) => x.n as number);

export const newCardNumber: Scenario = {
  id: 'new-card-number',
  title: 'A note asks for a new card and its number: draw it, then reply with the number given',
  setup: async (s) => { await drawOffsite(s); s.facts.cards = 3; },
  turns: [{ act: async (s) => { s.facts.noteSeq = await s.person.note(BOARD, 2, NOTE); }, send: BOARD }],
  checks: [
    cardAdded(),
    check('no-guessed-number', 'no write names a card number before the board gave it', (r) => {
      const bad = guesses(r);
      return [bad.length === 0, bad.join('; ') || 'every number named was given before'];
    }),
    check('reply-names-new-card', 'the answer to the note names the new card by its given number', (r) => {
      const given = newCards(r);
      const named = answersTo(r, 2, Number(r.facts.noteSeq)).filter(({ item }) => textsOf(item).some((t) => numbersIn(t).some((n) => given.includes(n))));
      return [named.length > 0, `new: ${given.join(', ') || 'none'}; answers: ${answersTo(r, 2, Number(r.facts.noteSeq)).map(({ item }) => item.text ?? item.type).join(' | ') || 'none'}`];
    }),
    check('note-answered-once', 'the note on card 2 has exactly one answer', (r) => {
      const answers = answersTo(r, 2, Number(r.facts.noteSeq));
      return [answers.length === 1, `${answers.length} answer(s)`];
    }),
    check('no-throwaway-card', 'no card is drawn and retired in the same run: its number would be used up for good', (r) => {
      const drawn = new Set(newCards(r));
      const gone = callsTo(r, 'write_board').flatMap(resultsOf).flatMap((x) => (x.ok && Array.isArray(x.retired) ? x.retired as number[] : []));
      const wasted = gone.filter((n) => drawn.has(n));
      return [wasted.length === 0, wasted.length ? `drawn and retired: ${wasted.join(', ')}` : 'none'];
    }),
    noKeyConflict(), doneOnly(),
  ],
  fake: {
    good: [async (bot) => {
      const seq = (await bot.call('show_node', { board: BOARD, n: 2 })).notes.at(-1).seq;
      const drawn = await bot.call('write_board', { board: BOARD, items: [{ type: 'node', key: 'offsite-card-coworking', node: { region: 'venues', kind: 'decision', title: 'Co-working space downtown', body: 'Flexible rooms in town.\n\n✓ pick it · ✗ rule it out' } }] });
      const n = drawn.results[0].n;
      await bot.call('write_board', { board: BOARD, items: [{ type: 'reply', key: 'offsite-reply-n2-coworking', n: 2, to: seq, text: `Added as card ${n}. ✓ to pick the cabin.` }] });
      bot.say('Done.');
    }],
    bad: [async (bot) => {
      const seq = (await bot.call('show_node', { board: BOARD, n: 2 })).notes.at(-1).seq;
      await bot.call('write_board', { board: BOARD, items: [
        { type: 'node', key: 'offsite-card-coworking', node: { region: 'venues', kind: 'decision', title: 'Co-working space downtown', body: '✓ pick it · ✗ rule it out' } },
        { type: 'reply', key: 'offsite-reply-n2-coworking', n: 2, to: seq, text: 'Added as card 4. ✓ to pick the cabin.' },
      ] });
      const extra = await bot.call('write_board', { board: BOARD, items: [{ type: 'node', key: 'offsite-card-placeholder', node: { region: 'venues', kind: 'note', title: 'Placeholder' } }] });
      await bot.call('write_board', { board: BOARD, items: [{ type: 'retire', key: 'offsite-retire-placeholder', n: extra.results[0].n }] });
      bot.say('Done.');
    }],
    badFails: ['no-guessed-number', 'no-throwaway-card'],
  },
};
