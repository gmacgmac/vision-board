// Standalone, written scenario 51 (node-overhaul T_05, the handover reference): a card moved to Later. The bot draws three
// questions; the person saves card 2 for later and asks for what is owed. The bot reads `references/handover.md` and no
// other, and writes one `park` on card 2 whose parts are short Markdown a new chat could pick up.
import path from 'node:path';
import { check, doneOnly, everyItemKeyed } from '../checks.ts';
import type { FakeBot, Scenario } from '../types.ts';
import { accepted } from './layout-checks.ts';

const BOARD = 'office-move';
const PARTS = ['situation', 'background', 'assessment', 'recommendation'];
const QUESTIONS = [['floor', 'Which floor do we move to?'], ['desks', 'Do we keep the old desks?'], ['movers', 'Who books the movers?']] as const;

const parked = check('parks-card-2', 'one `park` on card 2, its four parts each written, short (under 600 characters)', (r) => {
  const parks = accepted(r, 'park').map(({ item }) => item);
  const two = parks.filter((p) => p.n === 2);
  const parts = PARTS.map((k) => String(two[0]?.bundle?.[k] ?? ''));
  const ok = two.length === 1 && parts.every((t) => t.trim().length > 0 && t.length < 600);
  return [ok, `${parks.length} park(s), ${two.length} on card 2; parts: ${parts.map((t, i) => `${PARTS[i]} ${t.length}`).join(', ')}`];
});

let secret = '';
async function draw(bot: FakeBot) {
  ({ secret } = await bot.call('join', { label: path.basename(bot.dir) }));
  await bot.call('write_board', { secret, board: BOARD, items: [
    { type: 'board', key: 'office-board', title: 'Office move', summary: 'Open questions about the move.' },
    { type: 'region', key: 'office-region-questions', region: { id: 'questions', title: 'Open questions' } },
    ...QUESTIONS.map(([id, title]) => ({ type: 'node', key: `office-card-${id}`, node: { region: 'questions', kind: 'question', title } })),
  ] });
  bot.say('Done. Office move (`office-move`).');
}
async function park(bot: FakeBot) {
  await bot.call('list_open', { secret, board: BOARD });
  bot.read('handover');
  await bot.call('write_board', { secret, board: BOARD, items: [{ type: 'park', key: 'office-park-n2', n: 2, bundle: {
    situation: 'Undecided whether the old desks come with us.',
    background: '- The new floor has fixed benches on one side\n- The old desks are six years old',
    assessment: 'Keeping them saves money only if the benches leave room.',
    recommendation: 'Measure the free side of the new floor, then decide on card 2.',
    sources: ['The office move board, cards 1 and 2'],
  } }] });
  bot.say('Done.');
}
/** Reads every reference just in case, then answers the Later with a reply instead of a park. */
async function bad(bot: FakeBot) {
  for (const name of ['layouts', 'architecture', 'handover']) bot.read(name);
  await bot.call('write_board', { secret, board: BOARD, items: [{ type: 'reply', key: 'office-reply-n2', n: 2, text: 'Saved; we can come back to it.' }] });
  bot.say('Done.');
}

export const handoverPark: Scenario = {
  id: 'handover-park',
  title: 'Standalone: a card moved to Later gets one park, its parts short Markdown, from the handover reference',
  turns: [
    { say: 'Put three open questions about the office move on a new board as a row: which floor we move to, whether we keep the old desks, and who books the movers.' },
    { act: async (s) => { await s.person.mark(s.botBoard()!, 2, 'later'); }, say: 'I saved card 2 on the office move board for later. Do what you owe me there.' },
  ],
  checks: [parked, everyItemKeyed(), doneOnly(1)],
  reads: { need: ['handover'] },
  fake: { good: [draw, park], bad: [draw, bad], badFails: ['parks-card-2', 'reads-references'] },
};
