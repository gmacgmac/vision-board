// Export-import-print T_03, scenario 57 (D-107, D-108; PLAN.md decisions 7, 7a): "bring this exported file into the
// board". The bot draws a small board, then the person names an export file a colleague made, its cards answered (a ✓,
// a ✗), one moved, one noted with the agent's reply, and one carrying a field this board doesn't know. The bot reads `references/files.md`,
// reads the file and imports it unchanged `into: "current"` on the board it drew; it draws nothing by hand and proposes
// no mark. The notes and replies come across with it; the chat names what stayed behind (the ✓ and ✗) in one plain line,
// not the notes and not the `dropped` paths.
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { callsTo, doneOnly } from '../checks.ts';
import type { FakeBot, RunRecord, Scenario } from '../types.ts';
import { MARKS, dropsRelayed, fileAsGiven, importedInto, noHandDrawn, noMarksSent, notesKept } from './files-checks.ts';
import { secretArg } from './timeline-checks.ts';

const BOARD = 'team-offsite';
const FILE = 'design-workshop.vboard.json';
/** An export file as another board wrote it (export-file.schema.json, `v` 1); `glow` is a field no board knows. */
export const WORKSHOP = {
  v: 1,
  title: 'Design workshop',
  items: [
    { type: 'region', key: 'ideas', region: { id: 'ideas', title: 'Ideas', mode: 'grid' } },
    { type: 'node', key: 'card:1', node: { region: 'ideas', kind: 'question', title: 'Run the workshop remotely?', body: '✓ remote · ✗ in person' } },
    { type: 'node', key: 'card:2', node: { region: 'ideas', kind: 'decision', title: 'Invite the support team', body: '✓ invite them · ✗ not this time' } },
    { type: 'node', key: 'card:3', node: { region: 'ideas', kind: 'finding', title: 'Two rooms are free on the day', glow: true } },
  ],
  answers: [{ key: 'card:1', answer: 'check' }, { key: 'card:2', answer: 'cross' }],
  pins: [{ key: 'card:3', x: 40, y: 20 }],
  notes: [{ key: 'card:1', text: 'Most of the team is remote anyway.', thread: [{ text: 'Noted: remote it is.', from: { by: 'agent', agent: 'planner', label: 'Planner' } }] }],
};
const DRAW = 'Start a board for our team offsite: one row of three topics, venue, agenda and travel.';
/** The board the bot drew in turn 1. */
const drewOn = (r: RunRecord) => callsTo(r, 'write_board').find((c) => c.turn === 0)?.input.board as string | undefined;

let secret: { secret?: string } = {};
async function draw(bot: FakeBot) {
  secret = await secretArg(bot);
  await bot.call('write_board', { ...secret, board: BOARD, items: [
    { type: 'board', key: 'offsite-board', title: 'Team offsite', summary: 'Planning the offsite.' },
    { type: 'region', key: 'offsite-region-plan', region: { id: 'plan', title: 'Plan' } },
    ...['venue', 'agenda', 'travel'].map((t) => ({ type: 'node', key: `offsite-card-${t}`, node: { region: 'plan', kind: 'topic', title: t[0]!.toUpperCase() + t.slice(1) } })),
  ] });
  bot.say('Done.');
}
/** The file the message names. */
const named = (bot: FakeBot) => JSON.parse(readFileSync(/(\/\S+\.vboard\.json)/.exec(bot.message)![1]!, 'utf8'));

async function bring(bot: FakeBot) {
  const file = named(bot);
  bot.read('files');
  await bot.call('write_board', { ...secret, board: BOARD, import: { into: 'current', file } });
  bot.say('Done. Their ✓ and ✗ and the moved card stayed behind, with a glow setting this board doesn\'t have.');
}
/** Tidies the file first (the unknown field out), imports it into a new board, and lists the `dropped` paths. */
async function bringBadly(bot: FakeBot) {
  const file = named(bot);
  file.items[3].node = { region: 'ideas', kind: 'finding', title: 'Two rooms are free on the day' };
  await bot.call('write_board', { ...secret, board: 'design-workshop', import: { into: 'new', file } });
  bot.say('Done. Dropped:\n- answers[0]\n- answers[1]\n- pins[0]\n- notes[0]');
}

export const importFile: Scenario = {
  id: 'import-file',
  title: 'Bring an exported file into the board: import it as it is beside what is there, and say in a line what stayed behind',
  async setup(s) {
    s.facts.file = path.join(s.cwd, FILE);
    writeFileSync(s.facts.file, `${JSON.stringify(WORKSHOP, null, 2)}\n`);
  },
  turns: [
    { say: DRAW },
    { say: (s) => `A colleague exported their Design workshop board to \`${s.facts.file}\`. Bring it into this board, beside what's there.` },
  ],
  checks: [
    importedInto('current', (b, r) => b === drewOn(r), 'on the board it drew in turn 1', 1),
    fileAsGiven('file-as-given', () => WORKSHOP.items, 'the import carries the file\'s items unchanged'),
    noHandDrawn(1), noMarksSent(),
    notesKept(() => WORKSHOP.notes, 1), dropsRelayed(1, [MARKS]), doneOnly(0), doneOnly(1),
  ],
  reads: { need: ['files'] },
  fake: {
    good: [draw, bring], bad: [draw, bringBadly],
    badFails: ['imported-current', 'file-as-given', 'done-only-t2', 'notes-kept', 'reads-references'],
  },
};
