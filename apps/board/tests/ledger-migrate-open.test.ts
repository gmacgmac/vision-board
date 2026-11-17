// When the migration runs, and what a ledger it has not run on reads as (D-103 2, 4; D-085). A ledger opened read-only
// is upgraded in memory only: its file keeps its bytes and its time, and it shows the boards the migrated file shows;
// lines another writer appends in an old format are read upgraded. A line from a newer build makes the ledger
// read-only with words that say so, at open or when it arrives. A host's engine migrates the `dir` it may write and
// leaves alone one it may not. Through the server: a read-only open writes nothing; Edit migrates under its lock; a
// newer build's ledger refuses Edit, saying why, and every write.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { LEDGER_FORMAT, ledgerFiles, readLedger, toLine, upgradeLines } from '#format';
import { FIXTURES_DIR } from '#format/files';
import { makeTempDir } from '#format/testing';
import { createEngine } from '../server/engine/index.ts';
import { ledgerPath, openLedger } from '../server/ledger.ts';
import { ProblemError } from '../server/problem.ts';
import * as serverFoldersWords from '../server/words/server-folders.ts';
import { startBoard } from './api-harness.ts';

const root = makeTempDir('vb-migrate-open-');
after(() => fs.rmSync(root, { recursive: true, force: true }));
let made = 0;

const MIXED = fs.readFileSync(`${FIXTURES_DIR}legacy/mixed.ledger.jsonl`, 'utf8');
const NEWER = `{"v":${LEDGER_FORMAT + 1},"seq":252,"at":"2026-11-16T10:00:00Z","by":"person","type":"act","action":"send","board":"roadmap"}\n`;

function folder(text = MIXED): string {
  const dir = path.join(root, `l${++made}`);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(ledgerFiles(dir).ledger, text);
  return dir;
}
const quiet = () => {};
/** The events the migrated file reads as. */
const migratedEvents = (text: string) => readLedger(upgradeLines(text.split('\n')).lines).events;

test('a read-only open upgrades in memory only: the file keeps its bytes and time, the boards are the migrated file\'s', () => {
  const dir = folder();
  const file = ledgerFiles(dir).ledger;
  const before = fs.statSync(file);
  const ledger = openLedger(file, quiet, { readOnly: () => true });
  assert.deepEqual(ledger.events(), migratedEvents(MIXED));
  assert.ok(ledger.events().every((e) => toLine(e).v === LEDGER_FORMAT));
  assert.equal(fs.readFileSync(file, 'utf8'), MIXED);
  const now = fs.statSync(file);
  assert.deepEqual([now.ino, now.mtimeMs, now.size], [before.ino, before.mtimeMs, before.size]);
  assert.deepEqual(fs.readdirSync(dir), [path.basename(file)], 'no backup, no temp file');
});

test('a line another writer appends in an old format is read upgraded', () => {
  const dir = folder('');
  const file = ledgerFiles(dir).ledger;
  const ledger = openLedger(file, quiet);
  fs.appendFileSync(file, '{"v":7,"seq":1,"at":"2026-10-06T09:00:00Z","by":"agent","agent":"a-abcdefgh","type":"join","label":"Old"}\n');
  fs.appendFileSync(file, '{"v":7,"seq":2,"at":"2026-10-06T09:00:01Z","by":"agent","agent":"a-abcdefgh","type":"board","board":"b","title":"B"}\n');
  fs.appendFileSync(file, '{"v":7,"seq":3,"at":"2026-10-06T09:00:02Z","by":"agent","agent":"a-abcdefgh","type":"region","board":"b","region":{"id":"q","title":"Q","mode":"list"}}\n');
  ledger.refresh();
  assert.deepEqual(ledger.events().map((e) => toLine(e).v), [LEDGER_FORMAT, LEDGER_FORMAT, LEDGER_FORMAT]);
  assert.equal(ledger.state().boards.get('b')?.regions[0]?.mode, 'column');
});

test('a newer build\'s line at open: the ledger is read-only, says why, and the rest of it is read', () => {
  const dir = folder(MIXED + NEWER);
  const warned: string[] = [];
  const ledger = openLedger(ledgerFiles(dir).ledger, (m) => warned.push(m));
  assert.deepEqual([ledger.readOnly(), ledger.newer()], [true, true]);
  assert.equal(ledger.events().length, 251);
  assert.ok(warned.some((m) => m.includes('newer Vision Board')));
  for (const [by, words] of [['person', serverFoldersWords.newerLedgerPerson], ['agent', serverFoldersWords.newerLedgerAgent]] as const) {
    const caller = by === 'person' ? { by } as const : { by, agent: 'a-mixkiro1' } as const;
    assert.throws(() => ledger.append({ type: 'act', action: 'send', board: 'roadmap' }, caller),
      (err) => err instanceof ProblemError && err.code === 'read-only' && err.message === words);
  }
  assert.equal(fs.readFileSync(ledgerFiles(dir).ledger, 'utf8'), MIXED + NEWER);
});

test('a newer build\'s line another writer appends makes a writable ledger read-only from then on', () => {
  const dir = folder(upgradeLines(MIXED.split('\n')).lines.join('\n'));
  const ledger = openLedger(ledgerFiles(dir).ledger, quiet);
  assert.equal(ledger.readOnly(), false);
  fs.appendFileSync(ledgerFiles(dir).ledger, NEWER);
  ledger.refresh();
  assert.deepEqual([ledger.readOnly(), ledger.newer()], [true, true]);
  assert.throws(() => ledger.append({ type: 'act', action: 'send', board: 'roadmap' }, { by: 'person' }), /newer Vision Board/);
});

test('a host\'s engine migrates a dir it may write, and never one it may not', async () => {
  const writable = folder();
  const engine = createEngine({ dir: writable, warn: quiet });
  assert.deepEqual(fs.readFileSync(ledgerFiles(writable).ledger, 'utf8'), upgradeLines(MIXED.split('\n')).lines.join('\n'));
  assert.equal(fs.readdirSync(ledgerFiles(writable).backups).length, 1);
  assert.deepEqual(engine.ledger.events(), migratedEvents(MIXED));
  const closed = folder();
  const ro = createEngine({ dir: closed, warn: quiet, readOnly: () => true });
  assert.equal(fs.readFileSync(ledgerFiles(closed).ledger, 'utf8'), MIXED);
  assert.equal(fs.existsSync(ledgerFiles(closed).backups), false);
  assert.deepEqual(ro.ledger.events(), migratedEvents(MIXED));
});

test('a host\'s engine on a newer build\'s ledger: its reads say read-only, and a write is refused saying why', async () => {
  const dir = folder(MIXED + NEWER);
  const engine = createEngine({ dir, warn: quiet });
  assert.equal(fs.readFileSync(ledgerFiles(dir).ledger, 'utf8'), MIXED + NEWER, 'not migrated');
  const list = await engine.route({ method: 'GET', path: 'boards' });
  assert.equal((list!.body as { readOnly?: boolean }).readOnly, true);
  const put = await engine.route({ method: 'PUT', path: 'boards/mine', body: { title: 'Mine' } }, { caller: { by: 'person' } });
  assert.equal(put!.status, 409);
  assert.equal((put!.body as { detail: string }).detail, serverFoldersWords.newerLedgerPerson);
});

test('through the server: a read-only open writes nothing; Edit migrates under its lock, with a backup', async () => {
  const h = await startBoard({ edit: false, flags: { ledgerFolders: false, readOnlyStart: true } });
  try {
    const file = ledgerPath(h.project);
    // The fixtures are current (BE_03): the ledger is replaced by the frozen roadmap, in format 2, and read again.
    fs.writeFileSync(file, fs.readFileSync(`${FIXTURES_DIR}legacy/roadmap.ledger.jsonl`, 'utf8'));
    h.ledger.refresh();
    const before = fs.readFileSync(file, 'utf8');
    assert.ok(before.split('\n').some((l) => l.startsWith('{"v":2,')), 'the frozen roadmap holds format-2 lines');
    const board = await h.ok<{ title: string }>('get_board', { board: 'roadmap' });
    assert.equal(fs.readFileSync(file, 'utf8'), before, 'a read-only open and read wrote nothing');
    await h.ok('edit_ledger');
    const after = fs.readFileSync(file, 'utf8');
    assert.deepEqual(after, upgradeLines(before.split('\n')).lines.join('\n'));
    assert.equal(fs.readdirSync(ledgerFiles(path.dirname(file)).backups).length, 1);
    assert.deepEqual((await h.ok<{ title: string }>('get_board', { board: 'roadmap' })).title, board.title);
    await h.ok('put_board', { board: 'after-edit', body: { title: 'After Edit' } });
  } finally { await h.close(); }
});

test('through the server: a newer build\'s ledger opens read-only, Edit is refused saying why, and nothing is written', async () => {
  const h = await startBoard({ edit: false, flags: { ledgerFolders: false, readOnlyStart: true } });
  try {
    const file = ledgerPath(h.project);
    const seq = readLedger(fs.readFileSync(file, 'utf8').split('\n')).index.seq;
    fs.appendFileSync(file, NEWER.replace('"seq":252', `"seq":${seq + 1}`));
    const text = fs.readFileSync(file, 'utf8');
    const refused = await h.fails('edit_ledger', {}, 409, 'conflict');
    assert.equal(refused.detail, serverFoldersWords.newerLedgerPerson);
    assert.equal((await h.ok<{ readOnly?: boolean; editing?: unknown }>('get_project')).readOnly, true);
    assert.equal(fs.readFileSync(file, 'utf8'), text);
    assert.equal(fs.existsSync(ledgerFiles(path.dirname(file)).lock), false, 'no lock kept');
  } finally { await h.close(); }
});
