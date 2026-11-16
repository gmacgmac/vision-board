// The migration's runner (D-103; ledger review § 3 "How it writes", "Tests"): a frozen ledger migrated in a temp
// folder is the same ledger line for line, with a backup of the bytes it had; a second run and a current ledger write
// nothing and make no backup; a crash after the temp file, after the backup and before the rename leaves the original
// whole and a second run finishes; a live lock refuses; a newer line or a stop writes nothing; `--undo` puts the
// backup back only while nothing was appended since. Every test makes its own folder under the OS temp folder.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { LEDGER_FORMAT, ledgerFiles, readLedger, upgradeLines } from '#format';
import { FIXTURES_DIR } from '#format/files';
import { makeTempDir } from '#format/testing';
import { MIGRATING_SUFFIX, migrateHeld, migrateLedger, planMigration, undoMigration } from '../server/ledger-migrate.ts';
import type { MigrateHook } from '../server/ledger-migrate.ts';
import { takeLock } from '../server/lock.ts';
import { ProblemError } from '../server/problem.ts';

const root = makeTempDir('vb-migrate-');
after(() => fs.rmSync(root, { recursive: true, force: true }));
let made = 0;

const MIXED = fs.readFileSync(`${FIXTURES_DIR}legacy/mixed.ledger.jsonl`);
const GALLERY = fs.readFileSync(`${FIXTURES_DIR}legacy/gallery.ledger.jsonl`);

/** A ledger folder holding `bytes` as its ledger. */
function folder(bytes: Uint8Array | string = MIXED): string {
  const dir = path.join(root, `l${++made}`);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(ledgerFiles(dir).ledger, bytes);
  return dir;
}
const ledgerOf = (dir: string) => fs.readFileSync(ledgerFiles(dir).ledger);
const backupsOf = (dir: string) => (fs.existsSync(ledgerFiles(dir).backups) ? fs.readdirSync(ledgerFiles(dir).backups) : []);
const linesOf = (b: Uint8Array) => Buffer.from(b).toString('utf8').split('\n');

test('a frozen ledger migrates line for line: every line current, the backup the bytes it had, git told to ignore it', () => {
  for (const bytes of [MIXED, GALLERY]) {
    const dir = folder(bytes);
    const m = migrateHeld(dir, undefined, new Date('2026-11-16T10:20:30.456Z'));
    assert.equal(m.status, 'migrated');
    const after = ledgerOf(dir);
    assert.deepEqual(after.toString('utf8'), upgradeLines(linesOf(bytes)).lines.join('\n'));
    const head = Math.max(...linesOf(bytes).filter(Boolean).map((l) => (JSON.parse(l) as { seq: number }).seq));
    const formats = linesOf(bytes).filter(Boolean).map((l) => (JSON.parse(l) as { v: number }).v);
    assert.deepEqual(backupsOf(dir), [`ledger.f${Math.min(...formats)}-${Math.max(...formats)}.${head}.20261116T102030Z.jsonl`]);
    assert.deepEqual(fs.readFileSync(path.join(ledgerFiles(dir).backups, backupsOf(dir)[0]!)), bytes);
    assert.ok(fs.readFileSync(ledgerFiles(dir).gitignore, 'utf8').split('\n').includes('backups/'));
    const before = readLedger(linesOf(bytes));
    const now = readLedger(linesOf(after));
    assert.deepEqual(now.problems, []);
    assert.deepEqual(now.events.map((e) => [e.seq, e.at, e.by, e.type]), before.events.map((e) => [e.seq, e.at, e.by, e.type]));
    assert.ok(linesOf(after).filter(Boolean).every((l) => (JSON.parse(l) as { v: number }).v === LEDGER_FORMAT));
    assert.equal(fs.existsSync(`${ledgerFiles(dir).ledger}${MIGRATING_SUFFIX}`), false);
  }
});

test('a second run writes nothing and makes no second backup; a current ledger gets no write and no backup', () => {
  const dir = folder();
  migrateHeld(dir);
  const stat = fs.statSync(ledgerFiles(dir).ledger);
  const bytes = ledgerOf(dir);
  assert.deepEqual(migrateHeld(dir), { status: 'current' });
  assert.deepEqual(ledgerOf(dir), bytes);
  const again = fs.statSync(ledgerFiles(dir).ledger);
  assert.deepEqual([again.ino, again.mtimeMs], [stat.ino, stat.mtimeMs]);
  assert.equal(backupsOf(dir).length, 1);
  const fresh = folder(bytes);
  assert.deepEqual(migrateHeld(fresh), { status: 'current' });
  assert.deepEqual(backupsOf(fresh), []);
  assert.equal(fs.existsSync(ledgerFiles(fresh).gitignore), false);
  const empty = path.join(root, `l${++made}`);
  fs.mkdirSync(empty);
  assert.deepEqual(migrateHeld(empty), { status: 'current' }, 'no ledger file: nothing to do, nothing made');
});

for (const at of ['temp', 'backup', 'rename'] as const) {
  test(`a crash at "${at}": the original is whole, and a second run finishes`, () => {
    const dir = folder();
    const crash: MigrateHook = (where) => { if (where === at) throw new Error(`crash at ${where}`); };
    assert.throws(() => migrateHeld(dir, crash), /crash at/);
    assert.deepEqual(ledgerOf(dir), MIXED);
    const m = migrateHeld(dir);
    assert.equal(m.status, 'migrated');
    assert.equal(fs.existsSync(`${ledgerFiles(dir).ledger}${MIGRATING_SUFFIX}`), false, 'the stale temp file deleted');
    assert.deepEqual(ledgerOf(dir).toString('utf8'), upgradeLines(linesOf(MIXED)).lines.join('\n'));
  });
}

test('a line appended while it migrates: nothing replaced, no backup left, the appended line kept', () => {
  const dir = folder();
  const line = `{"v":${LEDGER_FORMAT},"seq":252,"at":"2026-11-16T10:00:00Z","by":"person","type":"act","action":"send","board":"roadmap"}\n`;
  const append: MigrateHook = (where) => { if (where === 'backup') fs.appendFileSync(ledgerFiles(dir).ledger, line); };
  assert.throws(() => migrateHeld(dir, append), /changed while/);
  assert.deepEqual(ledgerOf(dir), Buffer.concat([MIXED, Buffer.from(line)]));
  assert.deepEqual(backupsOf(dir), []);
});

test('a live lock refuses, in the holder\'s words, and nothing is written', () => {
  const dir = folder();
  const taken = takeLock(dir, 4999);
  assert.ok(taken.ok);
  try {
    assert.throws(() => migrateLedger(dir, { port: 0 }), (err) => err instanceof ProblemError && err.code === 'conflict' && /Another board server holds this ledger/.test(err.message));
    assert.deepEqual(ledgerOf(dir), MIXED);
  } finally { taken.lock.release(); }
  assert.equal(migrateLedger(dir, { port: 0 }).status, 'migrated');
  assert.equal(fs.existsSync(ledgerFiles(dir).lock), false, 'its own lock let go');
});

test('a line from a newer build, or a line the chain stops on: nothing written, and --check says the same', () => {
  const newer = `${MIXED.toString('utf8')}{"v":${LEDGER_FORMAT + 1},"seq":252,"at":"2026-11-16T10:00:00Z","by":"person","type":"act","action":"send","board":"roadmap"}\n`;
  const a = folder(newer);
  assert.deepEqual(migrateHeld(a), { status: 'newer', lines: [252] });
  assert.deepEqual(planMigration(a), { status: 'newer', lines: [252] });
  assert.equal(ledgerOf(a).toString('utf8'), newer);
  const later = '{"v":5,"seq":1,"at":"2026-10-02T09:00:00Z","by":"agent","agent":"a-abcdefgh","type":"region","board":"b","region":{"id":"later","title":"Later","mode":"grid"}}\n';
  const b = folder(later);
  const m = migrateHeld(b);
  assert.ok(m.status === 'stopped' && m.stops[0]!.line === 1 && m.stops[0]!.stop.includes('later'));
  assert.equal(ledgerOf(b).toString('utf8'), later);
  assert.deepEqual([backupsOf(a), backupsOf(b)], [[], []]);
});

test('--check counts what would change and writes nothing', () => {
  const dir = folder();
  const m = planMigration(dir);
  assert.ok(m.status === 'migrated' && m.changed === 204 && m.byFormat['7'] === 49 && m.byFormat['19'] === undefined);
  assert.deepEqual(ledgerOf(dir), MIXED);
  assert.deepEqual(backupsOf(dir), []);
});

test('--undo puts the newest backup back while nothing was appended since, and refuses once something was', () => {
  const dir = folder();
  assert.throws(() => undoMigration(dir, { port: 0 }), /no backup/);
  migrateLedger(dir, { port: 0 });
  assert.match(undoMigration(dir, { port: 0 }), /ledger\.f7-19\.251\./);
  assert.deepEqual(ledgerOf(dir), MIXED);
  migrateLedger(dir, { port: 0 });
  fs.appendFileSync(ledgerFiles(dir).ledger, `{"v":${LEDGER_FORMAT},"seq":252,"at":"2026-11-16T10:00:00Z","by":"person","type":"act","action":"send","board":"roadmap"}\n`);
  const kept = ledgerOf(dir);
  assert.throws(() => undoMigration(dir, { port: 0 }), (err) => err instanceof ProblemError && /line 251/.test(err.message) && /line 252/.test(err.message));
  assert.deepEqual(ledgerOf(dir), kept);
});
