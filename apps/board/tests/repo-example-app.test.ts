// This repo's own board holds a copy of the example app (app-cards FE_02, PLAN.md ruling 16), so the
// maintainer can use the calculator there. The skill folder is its one source: the copy must equal
// it byte for byte, file for file, so the two can't drift.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const SOURCE = path.join(ROOT, 'skills/vision-board/examples/apps/calculator');
const COPY = path.join(ROOT, '.visionboard/apps/calculator');

test('this repo\'s .visionboard/apps/calculator/ is the skill\'s example, byte for byte', () => {
  const files = fs.readdirSync(SOURCE).sort();
  assert.deepEqual(fs.readdirSync(COPY).sort(), files);
  for (const name of files) assert.ok(fs.readFileSync(path.join(COPY, name)).equals(fs.readFileSync(path.join(SOURCE, name))), `${name} differs from the example`);
});
