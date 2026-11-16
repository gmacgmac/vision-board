// Migrate a project's ledgers to the current ledger format (D-103; server/ledger-migrate.ts), the way a board opened
// for writing does: under each ledger's lock (refused while a board server holds it), with a backup, the file replaced
// in one step. `--check` says what would change and writes nothing (exit 1 when anything would); `--undo` puts each
// ledger's newest backup back, only when no line was appended since. A project folder means each of its ledgers; a
// ledger's own folder means that one.
// Usage: npm run ledger:migrate -- <folder> [--check | --undo]
import fs from 'node:fs';
import path from 'node:path';
import { ledgerFiles } from '#format';
import type { Migration } from '../server/ledger-migrate.ts';
import { migrateLedger, planMigration, undoMigration } from '../server/ledger-migrate.ts';
import { ledgerFoldersIn } from '../server/ledgers.ts';
import { ProblemError } from '../server/problem.ts';
import * as binWords from '../server/words/bin.ts';
import * as serverFoldersWords from '../server/words/server-folders.ts';

const args = process.argv.slice(2);
const mode = args.find((a) => a.startsWith('-'));
const folders = args.filter((a) => !a.startsWith('-'));
if (folders.length !== 1 || (mode !== undefined && mode !== '--check' && mode !== '--undo') || args.length > 2) {
  console.error(binWords.ledgerMigrateUsage);
  process.exit(2);
}

/** The ledger folders `arg` names: itself when it holds a ledger, else each of the project's. */
function ledgersOf(arg: string): string[] {
  const folder = fs.realpathSync(path.resolve(arg));
  if (fs.existsSync(ledgerFiles(folder).ledger)) return [folder];
  return ledgerFoldersIn(folder).filter((dir) => fs.existsSync(ledgerFiles(dir).ledger));
}

const formats = (byFormat: Record<string, number>): string => Object.entries(byFormat).map(([v, n]) => `${v}: ${n}`).join(', ');

/** What a migration (or `--check`) did to `file`, said; true when the ledger is (or would be) left as it is. */
function report(file: string, m: Migration, check: boolean): boolean {
  if (m.status === 'current') console.log(binWords.ledgerCurrent(file));
  else if (m.status === 'newer') console.error(binWords.ledgerNewer(file, m.lines.join(', ')));
  else if (m.status === 'stopped') console.error(binWords.ledgerStopped(file, m.stops.map((s) => serverFoldersWords.stoppedLine(s.line, s.stop)).join('; ')));
  else if (check) console.log(binWords.ledgerWouldChange(file, m.changed, formats(m.byFormat)));
  else console.log(binWords.ledgerMigrated(file, m.changed, formats(m.byFormat), m.backup));
  return m.status === 'current' || (!check && m.status === 'migrated');
}

let failed = 0;
try {
  const dirs = ledgersOf(folders[0]!);
  if (!dirs.length) {
    console.error(binWords.noLedgerHere(folders[0]!));
    process.exit(1);
  }
  for (const dir of dirs) {
    const file = ledgerFiles(dir).ledger;
    try {
      if (mode === '--undo') console.log(binWords.ledgerUndone(file, undoMigration(dir, { port: 0 })));
      else if (!report(file, mode === '--check' ? planMigration(dir) : migrateLedger(dir, { port: 0 }), mode === '--check')) failed++;
    } catch (err) {
      console.error(err instanceof ProblemError ? err.message : `${file}: ${err instanceof Error ? err.message : String(err)}`);
      failed++;
    }
  }
} catch (err) {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
}
process.exit(failed ? 1 : 0);
