// "Allow for this folder" kept (D-066 6; agent-access WIRE_01): the store keeps a cover relative to the
// board's folder, never one outside it, says whether a cover is kept, forgets by id, is written by the
// server only (atomically, readable by this user only, git-ignored), and a damaged file keeps nothing
// (the agent asks) until the person's next "for this folder" replaces it. Every entry fits its schema.
import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { accessFixture } from '#agent/testing';
import { makeTempDir } from '#format/testing';
import { openPermissions } from '../server/chat-permissions.ts';
import { ProblemError } from '../server/problem.ts';
import { SCHEMA_BASE, schemaProblems } from '../server/schema.ts';
import { GITIGNORE_FILE, PERMISSIONS_FILE } from '#format';

const fx = accessFixture();
after(() => fx.remove());
const at = (rel: string) => path.join(fx.folder, rel);
const LIST_ID = `${SCHEMA_BASE}schema/api/permission-list-response.schema.json`;

test('kept relative to the folder, listed oldest first, covers only what it names; outside the folder nothing is kept', () => {
  const dir = makeTempDir('vb-perm-');
  const kept = openPermissions(dir, fx.folder, () => {});
  kept.add({ kind: 'write', path: at('src') });
  kept.add({ kind: 'command', head: 'npm test' });
  kept.add({ kind: 'write', path: at('src') });
  kept.add({ kind: 'read', path: fx.outside });
  kept.add({ kind: 'search', path: fx.folder });
  const list = kept.list();
  assert.deepEqual(list.map(({ kind, path: at, command }) => ({ kind, path: at, command })), [
    { kind: 'write', path: 'src', command: undefined },
    { kind: 'command', path: undefined, command: 'npm test' },
    { kind: 'search', path: '', command: undefined },
  ], 'once each, nothing outside');
  assert.deepEqual(schemaProblems(LIST_ID, { permissions: list }), []);
  assert.ok(kept.covers({ kind: 'write', path: at('src') }));
  assert.ok(!kept.covers({ kind: 'read', path: at('src') }), 'a write yes is not a read yes');
  assert.ok(!kept.covers({ kind: 'write', path: at('src/sub') }));
  assert.ok(!kept.covers({ kind: 'command', head: 'npm run build' }));
  const file = path.join(dir, PERMISSIONS_FILE);
  assert.equal(fs.statSync(file).mode & 0o777, 0o600);
  assert.ok(fs.readFileSync(path.join(dir, GITIGNORE_FILE), 'utf8').split('\n').includes(PERMISSIONS_FILE));
  assert.deepEqual(openPermissions(dir, fx.folder).list(), list, 'read back after a restart');
});

test('forget: by id, the rest kept; an unknown id is not-found', () => {
  const dir = makeTempDir('vb-perm-');
  const kept = openPermissions(dir, fx.folder);
  kept.add({ kind: 'write', path: at('src') });
  kept.add({ kind: 'command', head: 'npm test' });
  const [first, second] = kept.list();
  assert.deepEqual(kept.forget(first!.id), [second]);
  assert.ok(!openPermissions(dir, fx.folder).covers({ kind: 'write', path: at('src') }), 'forgotten on disk too');
  assert.throws(() => kept.forget('pm-000000000000'), (e: unknown) => e instanceof ProblemError && e.code === 'not-found');
});

test('a damaged file keeps nothing and says so; the next yes for the folder replaces it', () => {
  for (const text of ['not json', '{"permissions": [{"id": "x"}]}', '{"permissions": [{"id": "pm-000000000000", "kind": "write", "path": "../out", "created": "2026-10-28T09:00:00Z"}]}']) {
    const dir = makeTempDir('vb-perm-');
    fs.writeFileSync(path.join(dir, PERMISSIONS_FILE), text);
    const warned: string[] = [];
    const kept = openPermissions(dir, fx.folder, (m) => warned.push(m));
    assert.deepEqual(kept.list(), [], text);
    assert.equal(warned.length, 1);
    assert.ok(!kept.covers({ kind: 'write', path: path.join(fx.folder, '..', 'out') }));
    kept.add({ kind: 'write', path: at('src') });
    assert.equal(openPermissions(dir, fx.folder).list().length, 1);
  }
});
