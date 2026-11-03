// Standalone, written scenario 38: the person names another ledger. `scratch` holds a sketch an earlier chat drew and
// the person answered (✓, ✗, a note); `main` is open. Asked to bring what was settled into main, the bot reads
// `scratch` with `ledger: "scratch"`, names no other ledger, writes nothing there (the folder is byte-for-byte as the
// setup left it) and asks no grant. What it then draws is the person's ask: here a summary board on main.
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { callsTo, cardAdded, check, doneOnly, noTool } from '../checks.ts';
import type { Scenario } from '../types.ts';

const SKETCH = 'release-sketch';
const READS = ['list_boards', 'get_board', 'show_node'];

/** A folder's files and their bytes, as one hash: any line, file or lock added, changed or removed changes it. */
export function folderDigest(dir: string): string {
  const hash = createHash('sha256');
  const files = readdirSync(dir, { recursive: true, withFileTypes: true }).filter((e) => e.isFile())
    .map((e) => path.relative(dir, path.join(e.parentPath, e.name))).sort();
  for (const f of files) hash.update(`${f}\0`).update(readFileSync(path.join(dir, f))).update('\0');
  return `${files.length} files, ${hash.digest('hex').slice(0, 12)}`;
}
/** `scratch` beside the open ledger's folder. */
const scratchOf = (ledgerDir: string) => path.join(ledgerDir, '..', 'scratch');

const sketch = [
  { type: 'board', key: 'sketch-board', title: 'Release sketch', summary: 'A first pass at the next release.' },
  { type: 'region', key: 'sketch-region', region: { id: 'sketch', title: 'Sketch', mode: 'row' } },
  { type: 'node', key: 'sketch-freeze', node: { region: 'sketch', kind: 'decision', title: 'Freeze features a week before', body: '✓ freeze a week before · ✗ no freeze' } },
  { type: 'node', key: 'sketch-beta', node: { region: 'sketch', kind: 'decision', title: 'Run a public beta', body: '✓ run one · ✗ skip it' } },
  { type: 'node', key: 'sketch-length', node: { region: 'sketch', kind: 'question', title: 'Is two weeks of testing enough?' } },
  { type: 'node', key: 'sketch-tests', node: { region: 'sketch', kind: 'finding', title: 'The upgrade tests take a day to run' } },
];

export const otherLedger: Scenario = {
  id: 'other-ledger',
  title: 'Standalone: the person names another ledger; the bot reads it and writes nothing there',
  async setup(s) {
    await s.ledger('scratch');
    await s.tool('write_board', { board: SKETCH, items: sketch });
    await s.person.mark(SKETCH, 1, 'ack');
    await s.person.mark(SKETCH, 2, 'drop');
    await s.person.note(SKETCH, 3, 'Two weeks is enough.');
    await s.ledger('main');
    s.facts.scratch = folderDigest(scratchOf(s.dir));
  },
  turns: [{ say: 'We sketched the release in the scratch ledger. Bring what we settled there into main: a summary board, one row of cards.' }],
  checks: [
    check('read-named-ledger', 'a read named `ledger: "scratch"` and was answered', (r) => {
      const read = r.calls.filter((c) => READS.includes(c.name) && c.input.ledger === 'scratch');
      return [read.some((c) => !c.isError), read.map((c) => `${c.name}${c.isError ? ' (error)' : ''}`).join(', ') || 'no read of scratch'];
    }),
    check('only-named-ledger', 'no call names a ledger but scratch, and no write names one at all', (r) => {
      const bad = r.calls.filter((c) => c.input.ledger !== undefined && (c.input.ledger !== 'scratch' || !READS.includes(c.name)));
      return [!bad.length, bad.map((c) => `${c.name} ledger ${c.input.ledger}`).join(', ') || `${r.calls.length} calls, none`];
    }),
    check('scratch-unchanged', 'nothing in `.visionboard/scratch/` changed: no line, file or lock', (r) => {
      const now = folderDigest(scratchOf(r.dir));
      return [now === r.facts.scratch, `setup ${r.facts.scratch}; after ${now}`];
    }),
    noTool('request_grant'),
    cardAdded(),
    check('drawn-on-main', 'the summary is on the open ledger (main\'s ledger has the bot\'s new board)', (r) => {
      const boards = r.ledger.filter((e) => e.type === 'board').map((e) => e.board);
      return [boards.length > 0 && callsTo(r, 'write_board').length > 0, boards.join(', ') || 'no board on main'];
    }),
    doneOnly(),
  ],
  fake: {
    good: [async (bot) => {
      const { secret } = await bot.call('join', { label: path.basename(bot.dir) });
      await bot.call('list_boards', { ledger: 'scratch' });
      await bot.call('get_board', { board: SKETCH, ledger: 'scratch' });
      await bot.call('write_board', { secret, board: 'release-summary', items: [
        { type: 'board', key: 'summary-board', title: 'Release summary', summary: 'What the scratch sketch settled.' },
        { type: 'region', key: 'summary-region', region: { id: 'settled', title: 'Settled and open', mode: 'row' } },
        { type: 'node', key: 'summary-freeze', node: { region: 'settled', kind: 'finding', title: 'Features freeze a week before' } },
        { type: 'node', key: 'summary-beta', node: { region: 'settled', kind: 'finding', title: 'No public beta' } },
        { type: 'node', key: 'summary-length', node: { region: 'settled', kind: 'question', title: 'Is two weeks of testing enough?' } },
      ] });
      bot.say('Done. Release summary (`release-summary`).');
    }],
    bad: [async (bot) => {
      const { secret } = await bot.call('join', { label: path.basename(bot.dir) });
      await bot.call('get_board', { board: SKETCH });
      await bot.call('write_board', { secret, board: SKETCH, ledger: 'scratch', items: [{ type: 'reply', key: 'sketch-reply', n: 3, text: 'Noted.' }] });
      await bot.call('request_grant', { secret, board: SKETCH, reason: 'To answer the note.' });
      bot.write(`${bot.dir}/.visionboard/scratch/summary.md`, 'Settled: freeze a week before.\n');
      bot.say('Done.');
    }],
    badFails: ['read-named-ledger', 'only-named-ledger', 'scratch-unchanged', 'no-request-grant', 'card-added', 'drawn-on-main'],
  },
};
