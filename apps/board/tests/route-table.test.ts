// The route table (api.md 4, 53, 55): packages/format/src/operations.generated.ts has one entry per
// operation of openapi.json, with the method, path, path parameters, x-agent and auth, and is current.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { OPERATIONS } from '../../../packages/format/src/index.ts';

type Rec = Record<string, any>;
const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const doc: Rec = JSON.parse(fs.readFileSync(path.join(ROOT, 'packages/format/schema/openapi.json'), 'utf8'));
const METHODS = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace', 'query'];
const ops = Object.entries<Rec>(doc.paths).flatMap(([route, item]) =>
  METHODS.filter((m) => item[m]).map((m) => ({ id: item[m].operationId as string, method: m.toUpperCase(), path: route, op: item[m] as Rec })));

test('the route table has one entry per operation, with the right auth', () => {
  assert.deepEqual(Object.keys(OPERATIONS).sort(), ops.map((o) => o.id).sort());
  for (const { id, method, path: route, op } of ops) {
    const row = (OPERATIONS as Rec)[id];
    assert.deepEqual([row.method, row.path, row.xAgent], [method, route, op['x-agent']], id);
    assert.deepEqual(row.pathParams, [...route.matchAll(/\{([^}]+)\}/g)].map((m) => m[1]), id);
  }
  const auth = Object.fromEntries(Object.values(OPERATIONS).map((o) => [o.operationId, o.auth]));
  assert.deepEqual(auth, {
    list_boards: 'none', get_board: 'none', show_node: 'none', show_container: 'none', list_open: 'none', check_responses: 'none',
    read_ledger: 'none', join: 'none', request_grant: 'agent', write_board: 'agent', act: 'person', mark_seen: 'person', watch_board: 'none', watch_project: 'none',
  });
});

test('operations.generated.ts is current (gen-api.mjs --check)', () => {
  const r = spawnSync(process.execPath, [path.join(ROOT, 'scripts/gen-api.mjs'), '--check'], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
});
