// For the agent and for people: check ledger files before trusting them (rule 7). Each line is
// checked against the JSON Schema (the one source, rule 6) and by the hand validator, then the
// whole file in order (numbers, versions, references). Every problem is printed with its line.
// Usage: node apps/board/bin/validate.ts <ledger.jsonl> [...more]   (npm run validate -- <file>)
// Exit 0 when every file is valid; 1 with every problem listed otherwise; 2 on bad usage.
import fs from 'node:fs';
import { readLedger } from '#format';
import { ledgerLineProblems } from '../server/schema.ts';
import * as binWords from '../server/words/bin.ts';

/** Every problem in one ledger file, as "line N: ...". */
function fileProblems(file: string): string[] {
  if (!file.endsWith('.jsonl')) return ['not a ledger: expected a .jsonl file'];
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  const out: string[] = [];
  lines.forEach((line, i) => {
    if (!line.trim()) return;
    for (const p of ledgerLineProblems(line)) out.push(binWords.lineSchema(i + 1, p.pointer || '/', p.detail));
  });
  // readLedger runs eventProblems on each line, then the context rules on the lines that pass.
  out.push(...readLedger(lines).problems);
  return out;
}

const files = process.argv.slice(2);
if (!files.length) {
  console.error('Usage: node apps/board/bin/validate.ts <ledger.jsonl> [...more]');
  process.exit(2);
}
let failed = 0;
for (const file of files) {
  let problems: string[];
  try {
    problems = fileProblems(file);
  } catch (err) {
    problems = [binWords.cannotRead((err as Error).message)];
  }
  if (problems.length) {
    failed++;
    console.log(`✗ ${file}\n  - ${problems.join('\n  - ')}`);
  } else console.log(`✓ ${file}`);
}
process.exit(failed ? 1 : 0);
