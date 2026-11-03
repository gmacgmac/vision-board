// One "is this a board" rule (LEDGERS_02 step 2, D-084 1): the agent's tools find their project with
// `#client` `ledgersIn`, the server lists a folder's ledgers with `ledgers.ts` (`isOldLayout`,
// `listLedgers`, `hasLedger`). The client package cannot import the server, so this test holds the two
// equal on every shape a folder can take, in a temp folder.
// verify: data-folder-literal the folder shapes on disk, built from outside
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ledgersIn } from '#client';
import { makeTempDir } from '#format/testing';
import { hasBoard } from '../server/folders.ts';
import { hasLedger, isOldLayout, listLedgers } from '../server/ledgers.ts';

const root = fs.realpathSync(makeTempDir('vb-layout-rule-'));
after(() => fs.rmSync(root, { recursive: true, force: true }));

/** A folder named `name` holding `files` (paths under it; a trailing `/` makes a folder). */
function folder(name: string, files: string[]): string {
  const dir = path.join(root, name);
  fs.mkdirSync(dir, { recursive: true });
  for (const f of files) {
    const at = path.join(dir, f);
    if (f.endsWith('/')) { fs.mkdirSync(at, { recursive: true }); continue; }
    fs.mkdirSync(path.dirname(at), { recursive: true });
    fs.writeFileSync(at, '');
  }
  return dir;
}

const SHAPES: Record<string, string[]> = {
  empty: [],
  old: ['.visionboard/ledger.jsonl'],
  ledgers: ['.visionboard/main/ledger.jsonl', '.visionboard/ui/ledger.jsonl', '.visionboard/attachments/'],
  partWay: ['.visionboard/ledger.jsonl', '.visionboard/main/agents.json'],
  both: ['.visionboard/ledger.jsonl', '.visionboard/scratch/ledger.jsonl'],
  homeLike: ['.visionboard/recent.json', '.visionboard/x/'],
  notLedgers: ['.visionboard/images/ledger.jsonl', '.visionboard/Bad Name/ledger.jsonl', '.visionboard/main/ledger.jsonl/', '.visionboard/a.jsonl'],
  fileNotFolder: ['.visionboard'],
};

test('the client\'s rule and the server\'s answer the same for every folder shape', () => {
  for (const [name, files] of Object.entries(SHAPES)) {
    const dir = folder(name, files);
    const server = { old: isOldLayout(dir), ledgers: listLedgers(dir) };
    assert.deepEqual(ledgersIn(dir, { fs }), server, name);
    assert.equal(server.old || server.ledgers.length > 0, hasLedger(dir), name);
    assert.equal(hasLedger(dir), hasBoard(dir), name);
  }
});

test('the shapes mean what they say', () => {
  const found = (name: string) => ledgersIn(path.join(root, name), { fs });
  assert.deepEqual(found('ledgers'), { old: false, ledgers: ['main', 'ui'] });
  assert.deepEqual(found('both'), { old: true, ledgers: ['scratch'] });
  for (const none of ['empty', 'homeLike', 'notLedgers', 'fileNotFolder']) assert.deepEqual(found(none), { old: false, ledgers: [] }, none);
});
