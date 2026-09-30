// For the agent: validate a view before writing it into a session (project rule 7).
// Usage: node packages/format/bin/validate.ts <view.json> [...more]
// Exit 0 when every file is valid; 1 with every problem listed otherwise.
import fs from 'node:fs';
import { validateView } from '../src/validate.ts';

const files = process.argv.slice(2);
if (!files.length) {
  console.error('Usage: node packages/format/bin/validate.ts <view.json> [...more]');
  process.exit(2);
}
let failed = 0;
for (const file of files) {
  let problems: string[];
  try {
    problems = validateView(JSON.parse(fs.readFileSync(file, 'utf8')));
  } catch (err) {
    problems = [`cannot read: ${(err as Error).message}`];
  }
  if (problems.length) {
    failed++;
    console.log(`✗ ${file}\n  - ${problems.join('\n  - ')}`);
  } else console.log(`✓ ${file}`);
}
process.exit(failed ? 1 : 0);
