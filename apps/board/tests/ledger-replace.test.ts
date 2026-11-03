// A followed ledger file replaced, not only grown (D-085 6; READONLY_01 step 6): a git pull, a sync or a copy dropped in
// gives another inode, a shorter file, or other first bytes, and `refresh` then reads the file again from the start and
// tells every reset listener; growth alone is read as before, line by line. A line still being written waits. The gate:
// while the read-only check says so, `append` refuses with `read-only` and writes nothing.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ledgerFiles } from '#format';
import { makeTempDir } from '#format/testing';
import { READ_ONLY } from '#actions';
import { openLedger } from '../server/ledger.ts';

const AGENT = { by: 'agent', agent: 'a-repl0000' } as const;

/** A ledger of `n` boards, written by a ledger of its own (another writer), in a new temp folder. */
function written(n: number, dir = makeTempDir('vb-replace-')): { file: string; text: string } {
  const file = ledgerFiles(dir).ledger;
  const w = openLedger(file, () => {});
  if (!w.state().index.agents.has(AGENT.agent)) w.append({ type: 'join', label: 'Writer' }, AGENT);
  for (let i = w.state().boards.size; i < n; i++) w.append({ type: 'board', board: `b-${i}`, title: `Board ${i}` }, AGENT);
  return { file, text: fs.readFileSync(file, 'utf8') };
}
/** Put `text` in place of `file` as git or a sync does: a new file renamed over it. */
function replace(file: string, text: string): void {
  fs.writeFileSync(`${file}.tmp`, text);
  fs.renameSync(`${file}.tmp`, file);
}
const boards = (l: ReturnType<typeof openLedger>) => [...l.state().boards.keys()];

test('growth is read line by line, with no reset', () => {
  const { file } = written(2);
  const l = openLedger(file, () => {});
  let resets = 0;
  l.onReset(() => { resets += 1; });
  written(4, path.dirname(file));
  l.refresh();
  assert.deepEqual([boards(l), resets], [['b-0', 'b-1', 'b-2', 'b-3'], 0]);
});

test('replaced with a longer, different history: read again from the start, and told', () => {
  const { file } = written(2);
  const l = openLedger(file, () => {});
  let resets = 0;
  l.onReset(() => { resets += 1; });
  const other = written(5);
  replace(file, other.text.replace(/b-/g, 'x-'));
  l.refresh();
  assert.deepEqual([boards(l), resets], [['x-0', 'x-1', 'x-2', 'x-3', 'x-4'], 1]);
  assert.equal(l.events().length, 6);
});

test('replaced with a shorter one: read again; the next line this ledger writes follows it', () => {
  const { file, text } = written(4);
  const l = openLedger(file, () => {});
  replace(file, `${text.split('\n').slice(0, 2).join('\n')}\n`);
  l.refresh();
  assert.deepEqual([boards(l), l.state().seq], [['b-0'], 2]);
  assert.equal(l.append({ type: 'board', board: 'next', title: 'Next' }, AGENT).seq, 3);
  assert.equal(fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).length, 3);
});

test('rewritten in place with other first bytes (same length or longer): read again', () => {
  const { file, text } = written(2);
  const l = openLedger(file, () => {});
  fs.writeFileSync(file, text.replace('Board 0', 'Board Z'));
  l.refresh();
  assert.equal(l.state().boards.get('b-0')?.title, 'Board Z');
});

test('replaced while its last line is half-written: the whole lines now, the rest when it lands', () => {
  const { file } = written(1);
  const l = openLedger(file, () => {});
  const other = written(3).text.replace(/b-/g, 'y-');
  const cut = other.lastIndexOf('\n', other.length - 2) + 20; // into the last line
  replace(file, other.slice(0, cut));
  l.refresh();
  assert.deepEqual(boards(l), ['y-0', 'y-1']);
  fs.appendFileSync(file, other.slice(cut));
  l.refresh();
  assert.deepEqual(boards(l), ['y-0', 'y-1', 'y-2']);
});

test('a file made after it was opened is growth, not a replacement', () => {
  const dir = makeTempDir('vb-replace-');
  const l = openLedger(ledgerFiles(dir).ledger, () => {});
  let resets = 0;
  l.onReset(() => { resets += 1; });
  written(2, dir);
  l.refresh();
  assert.deepEqual([boards(l), resets], [['b-0', 'b-1'], 0]);
});

test('the gate: while read-only, append refuses before anything is written', () => {
  const { file, text } = written(1);
  let readOnly = true;
  const l = openLedger(file, () => {}, { readOnly: () => readOnly });
  assert.throws(() => l.append({ type: 'board', board: 'no', title: 'No' }, AGENT), (err: any) => err.status === 409 && err.body.detail === READ_ONLY);
  assert.equal(fs.readFileSync(file, 'utf8'), text);
  readOnly = false;
  l.append({ type: 'board', board: 'yes', title: 'Yes' }, AGENT);
  l.gate(() => true);
  assert.equal(l.readOnly(), true);
});
