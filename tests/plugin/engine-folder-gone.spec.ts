// The built folder's engine, run with nclite's flags, on a data folder deleted or put back from a copy while it runs
// (docs/specification/plugin.md § The engine): the next write goes with no restart, and watch says `{ head: 0 }`. The
// unit tests (apps/board/tests/engine-folder-gone.test.ts) hold every case on the source; this holds the bundle a host vendors.
import { cpSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { loadEngine } from './fake-host/server.ts';
import { expect, test } from './harness.ts';

const BOT = { caller: { by: 'agent', agent: 'bot-0123456789abcdef' } } as const;
const FLAGS = { singleAgent: true, followOtherWriters: false, botToolRules: true };
const items = (title: string) => [{ type: 'board', title, key: `${title}-board` }];
const titles = (dir: string) => readFileSync(path.join(dir, 'ledger.jsonl'), 'utf8').split('\n').filter(Boolean)
  .map((l) => JSON.parse(l)).filter((e) => e.type === 'board').map((e) => e.title);

for (const [name, change] of [
  ['deleted', (dir: string) => rmSync(dir, { recursive: true, force: true })],
  ['put back from an older copy', (dir: string, copy: string) => { rmSync(dir, { recursive: true, force: true }); cpSync(copy, dir, { recursive: true }); }],
] as const) {
  test(`nclite's flags, the data folder ${name} while the engine runs: the next write_board goes, and watch says head 0`, async () => {
    const parent = mkdtempSync(path.join(os.tmpdir(), 'vb-gone-spec-'));
    const dir = path.join(parent, 'vision-board');
    try {
      const engine = (await loadEngine()).createEngine({ dir, warn: () => {}, flags: FLAGS });
      const heard: Record<string, unknown>[] = [];
      const stop = engine.watch((c: Record<string, unknown>) => { heard.push(c); });
      const write = async (board: string, title: string) => {
        const out = await engine.tools.call('write_board', { board, items: items(title) }, BOT);
        expect(out.isError, JSON.stringify(out)).not.toBe(true);
      };
      await write('first', 'First');
      cpSync(dir, `${dir}-copy`, { recursive: true });
      await write('second', 'Second');
      change(dir, `${dir}-copy`);
      heard.length = 0;
      await write('after', 'After');
      expect(heard[0]).toEqual({ head: 0 });
      expect(titles(dir)).toEqual(name === 'deleted' ? ['After'] : ['First', 'After']);
      const read = await engine.tools.call('get_board', { board: 'after' }, BOT);
      expect(read.structuredContent.view.title).toBe('After');
      stop();
    } finally { rmSync(parent, { recursive: true, force: true }); }
  });
}
