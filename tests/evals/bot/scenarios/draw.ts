// Draw: three options the person named as a row. Keys on every item, cards that ask, no places, and "Done.".
import { check, doneOnly, everyItemKeyed, itemsOf, noCoordinates, resultsOf, callsTo } from '../checks.ts';
import type { Scenario } from '../types.ts';
import { BOARD, DRAW, fakeDraw, offsiteItems } from './offsite.ts';

const ASKS = new Set(['question', 'decision', 'action']);

export const draw: Scenario = {
  id: 'draw',
  title: 'Draw three options the person named as a row',
  turns: [{ say: DRAW }],
  checks: [
    check('cards-drawn', 'write_board drew at least three cards (failed items and refused calls are in the evidence)', (r) => {
      const calls = callsTo(r, 'write_board');
      const results = calls.flatMap(resultsOf);
      const cards = results.filter((x) => x.ok && typeof x.n === 'number').length;
      const refused = calls.filter((c) => c.isError).map((c) => c.text);
      return [cards >= 3, `${cards} cards, ${results.filter((x) => !x.ok).length} items failed${refused.length ? `; refused: ${refused[0]}` : ''}`];
    }),
    check('cards-ask', 'each option is a card that asks (question, decision or action)', (r) => {
      const kinds = itemsOf(r).filter(({ item }) => item.type === 'node').map(({ item }) => item.node?.kind);
      return [kinds.length >= 3 && kinds.every((k) => ASKS.has(k)), `kinds: ${kinds.join(', ')}`];
    }),
    check('says-what-marks-mean', 'every decision or action card says what ✓ and ✗ mean', (r) => {
      const asks = itemsOf(r).filter(({ item }) => item.type === 'node' && ['decision', 'action'].includes(item.node?.kind));
      const silent = asks.filter(({ item }) => !(/✓/.test(item.node.body ?? '') && /✗/.test(item.node.body ?? '')));
      return [silent.length === 0, `${asks.length - silent.length} of ${asks.length} say it`];
    }),
    everyItemKeyed(), noCoordinates(), doneOnly(),
  ],
  fake: {
    good: [fakeDraw],
    bad: [async (bot) => {
      const items = offsiteItems('offsite').map((item, i) => (i === 2 ? { ...item, key: undefined } : item));
      (items[3] as any).node.size = 'L';
      await bot.call('write_board', { board: BOARD, items });
      bot.say('Done. Here is what I drew:\n- the office\n- the cabin\n- the hotel');
    }],
    badFails: ['every-item-keyed', 'no-coordinates', 'done-only'],
  },
};
