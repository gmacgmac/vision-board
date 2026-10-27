// The server-start budget (docs/specification/performance.md: under 1 s on a 100,000-event ledger,
// approach 7). The ledger is the performance fixture (`#format/testing` perfLedger) followed by the
// person's acts and seen marks up to 100,000 lines. Start = open the ledger (read, check and fold
// every line), listen, and answer the first read. A timing test: it runs alone, in its own serial
// step (`npm run test:timing`, N12_FE_01 ruling 7). Under budget there is no checkpoint (step 5).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import type { AddressInfo } from 'node:net';
import { createBoardServer } from '../server/app.ts';
import { ledgerPath, openLedger } from '../server/ledger.ts';
import { makeTempDir, perfLedger } from '#format/testing';

const BUDGET_MS = 1000;
const LINES = 100_000;

/** The fixture, then the person answering its cards round and round until LINES lines. */
function bigLedger(): string[] {
  const out = perfLedger().map((l) => JSON.parse(l) as Record<string, unknown>);
  const ns = out.filter((e) => e.type === 'node' && e.board === 'big').map((e) => e.n as number);
  const acts = ['ack', 'drop', 'later', 'reopen', 'pin', 'seen'] as const;
  const at = '2026-10-03T09:00:00Z';
  for (let i = 0; out.length < LINES; i++) {
    const n = ns[i % ns.length]!;
    const a = acts[i % acts.length]!;
    const seq = out.length + 1;
    if (a === 'seen') out.push({ v: 2, seq, at, by: 'person', type: 'seen', n, ver: 1 });
    else if (a === 'pin') out.push({ v: 2, seq, at, by: 'person', type: 'act', action: 'pin', n, x: i % 300, y: i % 200 });
    else out.push({ v: 2, seq, at, by: 'person', type: 'act', action: a, n, ver: 1 });
  }
  return out.map((e) => JSON.stringify(e));
}

test(`the server starts on a ${LINES.toLocaleString('en')}-event ledger in under ${BUDGET_MS} ms`, async () => {
  const dir = makeTempDir('vb-start-');
  try {
    const file = ledgerPath(dir);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, `${bigLedger().join('\n')}\n`);
    const dist = path.join(dir, 'dist');
    fs.mkdirSync(dist);
    const t = performance.now();
    const problems: string[] = [];
    const ledger = openLedger(file, (m) => problems.push(m));
    const server = createBoardServer({ ledger, dist });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const res = await fetch(`http://127.0.0.1:${(server.address() as AddressInfo).port}/api/boards`);
    const ms = performance.now() - t;
    await res.json();
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    console.log(`[N12] server start, ${ledger.events().length} events: ${ms.toFixed(0)} ms`);
    assert.deepEqual(problems, []);
    assert.equal(ledger.events().length, LINES);
    assert.ok(ms < BUDGET_MS, `${ms.toFixed(0)} ms`);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
