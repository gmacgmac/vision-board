// Move a project's `.visionboard/main/` back to `.visionboard/` (D-084 6, PLAN decision 7): the revert of
// the move into ledger folders, run with the `ledgerFolders` flag off. Refused while another ledger is
// there or a board server holds either folder (server/ledger-move.ts `undoMove`).
// Usage: npm run ledgers:undo -- <folder>
import fs from 'node:fs';
import path from 'node:path';
import { ledgerFiles, ledgerFolder } from '#format';
import { undoMove } from '../server/ledger-move.ts';
import { ProblemError } from '../server/problem.ts';
import * as binWords from '../server/words/bin.ts';

const arg = process.argv[2];
if (!arg || arg.startsWith('-') || process.argv.length > 3) {
  console.error(binWords.ledgersUndoUsage);
  process.exit(2);
}
try {
  const folder = fs.realpathSync(path.resolve(arg));
  const left = undoMove(folder, { port: 0 });
  console.log(binWords.ledgersUndone(folder, ledgerFiles(ledgerFolder(folder)).ledger));
  if (left) console.error(left);
} catch (err) {
  console.error(err instanceof ProblemError ? err.message : String(err));
  process.exit(1);
}
