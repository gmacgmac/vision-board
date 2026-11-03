// For the agent: print the person's responses on one board as a numbered reply, or with --json
// the board's state. Reads one ledger of the project through the ledger store, and writes nothing.
// Stays until U4's `vb check`. The ledger (D-084): the old layout's `.visionboard/` when the project is
// in it; else `--ledger <name>`, else the one the board had open there last (recent.json), else main.
// Usage: node apps/board/bin/reply.ts <board> [--ledger <name>] [--json]   (VB_PROJECT = project folder, default repo root)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ENV, boardView, ledgerFiles, ledgerFolder, ledgerNameProblem } from '#format';
import { boardState, replyText } from '#actions';
import { openLedger } from '../server/ledger.ts';
import { chooseLedger, isOldLayout } from '../server/ledgers.ts';
import { lastLedger } from '../server/recent.ts';
import * as binWords from '../server/words/bin.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const args = process.argv.slice(2);
const at = args.indexOf('--ledger');
const asked = at < 0 ? undefined : args[at + 1];
const id = args.find((a, i) => !a.startsWith('-') && (at < 0 || i !== at + 1));
const stop = (text: string): never => { console.error(text); process.exit(2); };
if (!id || (at >= 0 && asked === undefined)) stop(binWords.replyUsage);
if (asked !== undefined) { const why = ledgerNameProblem(asked); if (why) stop(why); }

const project = path.resolve(process.env[ENV.project] ?? ROOT);
const real = (() => { try { return fs.realpathSync(project); } catch { return project; } })();
const folder = isOldLayout(project) && asked === undefined
  ? ledgerFolder(project)
  : ledgerFolder(project, chooseLedger(project, asked, isOldLayout(project) ? undefined : lastLedger(os.homedir(), real)));
const file = ledgerFiles(folder).ledger;
const s = openLedger(file).state();
if (!s.boards.has(id!)) stop(binWords.noBoardInLedger(id!, file));
const board = id!;
const view = boardView(s, board);
const state = boardState(s, board);
if (args.includes('--json')) {
  console.log(JSON.stringify({
    board,
    seq: s.seq,
    items: Object.fromEntries(state.items),
    pins: Object.fromEntries(state.pins),
    modes: Object.fromEntries(state.modes),
  }, null, 2));
} else {
  console.log(replyText(view, state));
}
