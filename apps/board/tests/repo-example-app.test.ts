// This repo's own board holds a copy of the example app (app-cards FE_02, PLAN.md ruling 16), so the
// maintainer can use the calculator there. The skill folder is its one source: the copy must equal
// it byte for byte, file for file, so the two can't drift. The repo's folder is read in either layout
// (D-084): in the old one `apps/` sits in `.visionboard/`, and once the maintainer's board opens it with
// ledger folders it has moved into `.visionboard/main/` (ledger-move.ts). Read only.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { MAIN_LEDGER, ledgerFiles, ledgerFolder } from '#format';

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const SOURCE = path.join(ROOT, 'skills/vision-board/examples/apps/calculator');
const COPY = [ledgerFolder(ROOT), ledgerFolder(ROOT, MAIN_LEDGER)]
  .map((dir) => path.join(ledgerFiles(dir).apps, 'calculator'))
  .find((dir) => fs.existsSync(dir)) ?? assert.fail('no apps/calculator/ in this repo\'s .visionboard/, in either layout');

test('this repo\'s .visionboard/apps/calculator/ (or main/apps/calculator/) is the skill\'s example, byte for byte', () => {
  const files = fs.readdirSync(SOURCE).sort();
  assert.deepEqual(fs.readdirSync(COPY).sort(), files);
  for (const name of files) assert.ok(fs.readFileSync(path.join(COPY, name)).equals(fs.readFileSync(path.join(SOURCE, name))), `${name} differs from the example`);
});
