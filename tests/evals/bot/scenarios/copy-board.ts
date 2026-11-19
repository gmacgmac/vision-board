// Export-import-print T_03, scenario 56 (D-107, D-108; PLAN.md decision 7): "copy this board into a new one". The person
// has answered the board (a ✓, a ✗, a note). The bot reads `references/files.md`, exports the board (`get_board` with
// `export: true`) and imports that file, unchanged, `into: "new"` under a new id; it draws nothing by hand and proposes
// no mark. Its import leaves the person's ✓ and ✗ behind, and the chat says so in one plain line.
import { doneOnly, noTool } from '../checks.ts';
import type { FakeBot, Scenario } from '../types.ts';
import { MARKS, dropsRelayed, exported, exportsOf, fileAsGiven, importedInto, noHandDrawn, noMarksSent } from './files-checks.ts';
import { secretArg } from './timeline-checks.ts';

const BOARD = 'hiring-plan';
const card = (key: string, region: string, kind: string, title: string, body?: string) =>
  ({ type: 'node', key: `hiring-${key}`, node: { region, kind, title, ...(body && { body }) } });
const DRAWN = [
  { type: 'board', key: 'hiring-board', title: 'Hiring plan', summary: 'Who we hire next, and how.' },
  { type: 'region', key: 'hiring-region-roles', region: { id: 'roles', title: 'Roles' } },
  card('designer', 'roles', 'decision', 'Hire a designer first', '✓ designer first · ✗ engineer first'),
  card('spring', 'roles', 'question', 'Open a second team in spring?'),
  card('waiting', 'roles', 'finding', 'Two strong candidates are waiting'),
  { type: 'region', key: 'hiring-region-steps', region: { id: 'steps', title: 'Hiring steps', mode: 'flow' } },
  card('screen', 'steps', 'topic', 'Screen'),
  card('interview', 'steps', 'topic', 'Interview'),
  card('offer', 'steps', 'topic', 'Offer'),
  { type: 'link', key: 'hiring-link-screen', from: { key: 'hiring-screen' }, to: { key: 'hiring-interview' } },
  { type: 'link', key: 'hiring-link-interview', from: { key: 'hiring-interview' }, to: { key: 'hiring-offer' } },
];

async function good(bot: FakeBot) {
  const secret = await secretArg(bot);
  bot.read('files');
  const file = await bot.call('get_board', { board: BOARD, export: true });
  await bot.call('write_board', { ...secret, board: 'hiring-plan-2', import: { into: 'new', file } });
  bot.say('Done. Your ✓ and ✗ stayed behind: they\'re yours to press again.');
}

/** Reads the board and draws a copy by hand, proposing the person's marks; says nothing of what stayed behind. */
async function bad(bot: FakeBot) {
  const secret = await secretArg(bot);
  await bot.call('get_board', { board: BOARD });
  await bot.call('write_board', { ...secret, board: 'hiring-plan-2', items: [
    ...DRAWN.map((i) => ({ ...i, key: `${i.key}-copy` })).filter((i) => i.type !== 'link'),
    { type: 'propose', key: 'hiring-propose-1', n: 1, answer: 'check' },
  ] });
  bot.say('Done. Copied.');
}

export const copyBoard: Scenario = {
  id: 'copy-board',
  title: 'Copy an answered board into a new one: export, then import the file as it is; the person\'s marks stay theirs',
  async setup(s) {
    await s.tool('write_board', { board: BOARD, items: DRAWN });
    await s.person.mark(BOARD, 1, 'ack');
    await s.person.mark(BOARD, 2, 'drop');
    await s.person.note(BOARD, 3, 'Both could start next month.');
  },
  turns: [{ say: 'Copy the Hiring plan board into a new board, so we can try a second version without touching this one.' }],
  checks: [
    exported(BOARD),
    importedInto('new', (b) => b !== BOARD, 'on a board other than the one copied'),
    fileAsGiven('file-as-exported', (r) => exportsOf(r, BOARD)[0]?.file.items, 'the import carries the exported items unchanged'),
    noHandDrawn(), noMarksSent(), noTool('request_grant'),
    dropsRelayed(0, [MARKS]), doneOnly(),
  ],
  reads: { need: ['files'] },
  fake: { good: [good], bad: [bad], badFails: ['exported', 'imported-new', 'file-as-exported', 'no-hand-drawn', 'no-marks-sent', 'drops-relayed', 'reads-references'] },
};
