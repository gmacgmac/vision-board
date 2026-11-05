// Written scenario 43: a summary card with headings and a table (PLAN decisions 7-9). Asked to sum up three answered
// venue cards, the bot writes one card whose body has a `#` or `##` heading and a table of at most 4 columns (5 or more
// stays text), and retires the cards it replaces in the same call. Since D-090 the title is the card's big headline, so
// the body's first heading never repeats it (point 443).
import { callsTo, check, doneOnly, itemsOf, noKeyConflict, resultsOf } from '../checks.ts';
import type { RunRecord, Scenario } from '../types.ts';
import { BOARD, drawOffsite } from './offsite.ts';

const MAX_COLUMNS = 4;
/** A GFM delimiter row (`|---|:--:|`): its cell count is the table's columns. */
const DELIMITER = /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?\s*$/gm;
const columnsOf = (row: string) => row.trim().replace(/^\||\|$/g, '').split('|').length;

/** The new cards the bot drew (answered ok at version 1). */
const drawn = (r: RunRecord) => itemsOf(r)
  .filter(({ item, index, call }) => item.type === 'node' && item.n === undefined && resultsOf(call)[index]?.ok)
  .map(({ item }) => ({ title: String(item.node?.title ?? ''), body: String(item.node?.body ?? '') }));
const summaries = (r: RunRecord): string[] => drawn(r).map((c) => c.body);
/** A heading or title as words: case, Markdown marks and punctuation set aside. */
const words = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const firstHeading = (body: string) => body.match(/^#{1,6} +(.+?)\s*#*\s*$/m)?.[1] ?? null;
const tablesIn = (body: string) => [...body.matchAll(DELIMITER)].map((m) => columnsOf(m[0]));

export const summaryCard: Scenario = {
  id: 'summary-card',
  title: 'Sum up three answered cards in one card: headings, a table, the cards retired',
  setup: async (s) => {
    await drawOffsite(s);
    await s.person.mark(BOARD, 1, 'drop');
    await s.person.mark(BOARD, 2, 'ack');
    await s.person.mark(BOARD, 3, 'drop');
    await s.person.send(BOARD);
  },
  turns: [{ say: 'Sum up the venue cards in one card.' }],
  checks: [
    check('summary-headings', 'the summary card\'s body has a `#` or `##` heading', (r) => {
      const bodies = summaries(r);
      return [bodies.some((b) => /^#{1,2} \S/m.test(b)), bodies.map((b) => b.slice(0, 120)).join(' | ') || 'no new card'];
    }),
    check('summary-table', `the summary has a table, and no table has more than ${MAX_COLUMNS} columns`, (r) => {
      const columns = summaries(r).flatMap(tablesIn);
      return [columns.length > 0 && columns.every((c) => c <= MAX_COLUMNS), `tables' columns: ${columns.join(', ') || 'no table'}`];
    }),
    check('title-not-repeated', 'no new card\'s first body heading repeats its title (the title is the headline)', (r) => {
      const cards = drawn(r).map((c) => ({ ...c, first: firstHeading(c.body) }));
      const repeats = cards.filter((c) => c.first !== null && words(c.first) === words(c.title));
      return [cards.length > 0 && repeats.length === 0, cards.map((c) => `"${c.title}" / ${c.first === null ? 'no heading' : `"${c.first}"`}`).join(' | ') || 'no new card'];
    }),
    check('cards-retired', 'cards 1, 2 and 3 are retired', (r) => {
      const retired = callsTo(r, 'write_board').flatMap(resultsOf).flatMap((x) => (x.ok && Array.isArray(x.retired) ? x.retired : []));
      return [[1, 2, 3].every((n) => retired.includes(n)), `retired: ${retired.join(', ') || 'none'}`];
    }),
    noKeyConflict(), doneOnly(),
  ],
  fake: {
    good: [async (bot) => {
      const body = '## Picked\nThe rented cabin, an hour away.\n\n## Compared\n| Venue | Mark | Why |\n|---|---|---|\n| Office | ✗ | Too close to daily work |\n| Cabin | ✓ | Room to focus |\n| Hotel | ✗ | Costs more |';
      await bot.call('write_board', { board: BOARD, items: [
        { type: 'node', key: 'offsite-card-summary', node: { region: 'venues', kind: 'finding', title: 'Venue: the cabin', body } },
        ...[1, 2, 3].map((n) => ({ type: 'retire', key: `offsite-retire-${n}`, n })),
      ] });
      bot.say('Done.');
    }],
    bad: [async (bot) => {
      const body = '### Venue: the cabin\nPicked: the cabin.\n\n| Venue | Mark | Why | Cost | Travel |\n|---|---|---|---|---|\n| Office | ✗ | Daily work | Low | None |';
      await bot.call('write_board', { board: BOARD, items: [{ type: 'node', key: 'offsite-card-summary', node: { region: 'venues', kind: 'finding', title: 'Venue: the cabin', body } }] });
      bot.say('Done.');
    }],
    badFails: ['summary-headings', 'summary-table', 'title-not-repeated', 'cards-retired'],
  },
};
