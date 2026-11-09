// A host's engine whose data folder is deleted or replaced while it runs (nclite, 2026-11-08: the bot deletes
// `.visionboard` with a shell command, the person deletes it in Finder, or a folder is put back from a copy). With
// nclite's flags the engine recovers at its next call, with no restart and no host action: a folder or ledger gone is
// a new, empty folder, and a file replaced is read again from the start. The bot's write and the person's go, what
// they wrote is in the file, watch says `{ head: 0 }`, and get_board reads what is on disk now. Standalone keeps its
// refusal (api-ledger-gone.test.ts): there a gone file is usually one another server moved into a ledger folder.
import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { LEDGER_FILE } from '#format';
import { makeTempDir } from '#format/testing';
import type { PluginChange, PluginEngine } from '../plugin/engine.ts';
import { createEngine } from '../plugin/engine.ts';
import { openLedger } from '../server/ledger.ts';

type Caller = { by: 'person' } | { by: 'agent'; agent: string };
const BOT: Caller = { by: 'agent', agent: 'bot-0123456789abcdef' };
const PERSON: Caller = { by: 'person' };
const dirs: string[] = [];
after(() => { for (const d of dirs) fs.rmSync(d, { recursive: true, force: true }); });

/** A data folder that does not exist yet, as nclite's `plugins/vision-board/` before the first write. */
function folder(): string {
  const parent = makeTempDir('vb-gone-');
  dirs.push(parent);
  return path.join(parent, 'vision-board');
}

const board = (id: string, title: string) => [
  { type: 'board', title, key: `${id}-board` },
  { type: 'region', region: { id: 'now', title: 'Now', mode: 'grid' }, key: `${id}-now` },
  { type: 'node', node: { region: 'now', kind: 'question', title: `${title}: ship it?` }, key: `${id}-q` },
];

async function call(engine: PluginEngine, name: string, input: Record<string, unknown>): Promise<{ isError: boolean; body: any }> {
  const out = await engine.tools.call(name, input, { caller: BOT });
  return { isError: out.isError === true, body: out.structuredContent ?? { text: out.content[0]?.text } };
}

/** The bot draws board `id`; every item must go. */
async function draw(engine: PluginEngine, id: string, title: string): Promise<void> {
  const r = await call(engine, 'write_board', { board: id, items: board(id, title) });
  assert.equal(r.isError, false, JSON.stringify(r.body));
  assert.ok(r.body.results.every((x: { ok: boolean }) => x.ok), JSON.stringify(r.body));
}

/** The board titles the ledger file holds now, as on disk. */
function titlesOnDisk(dir: string): string[] {
  const file = path.join(dir, LEDGER_FILE);
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l) as Record<string, unknown>)
    .filter((e) => e.type === 'board' && typeof e.title === 'string').map((e) => e.title as string);
}

const HOST_FLAGS = (followOtherWriters: boolean) => ({ singleAgent: true, followOtherWriters, botToolRules: true });

/** What happens to the folder between two writes; `copy` was taken after the first board was drawn. */
const CASES: { name: string; change: (dir: string, copy: string) => void; kept: boolean }[] = [
  { name: 'the folder deleted', change: (dir) => fs.rmSync(dir, { recursive: true, force: true }), kept: false },
  { name: 'the ledger file deleted', change: (dir) => fs.rmSync(path.join(dir, LEDGER_FILE)), kept: false },
  {
    name: 'the folder replaced with an older copy', kept: true,
    change: (dir, copy) => { fs.rmSync(dir, { recursive: true, force: true }); fs.cpSync(copy, dir, { recursive: true }); },
  },
  { name: 'a new empty folder in its place', change: (dir) => { fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir); }, kept: false },
];

for (const follow of [false, true]) {
  for (const c of CASES) {
    test(`nclite's flags, followOtherWriters ${follow ? 'on' : 'off'}, ${c.name}: the next write goes, watch says head 0, get_board reads the disk`, async () => {
      const dir = folder();
      const copy = `${dir}-copy`;
      const engine = createEngine({ dir, name: () => 'Plans folder', warn: () => {}, flags: HOST_FLAGS(follow) });
      const heard: PluginChange[] = [];
      const stop = engine.watch((change) => heard.push(change));
      try {
        await draw(engine, 'first', 'First');
        fs.cpSync(dir, copy, { recursive: true });
        await draw(engine, 'second', 'Second');
        c.change(dir, copy);
        heard.length = 0;

        await draw(engine, 'after', 'After');
        assert.deepEqual(heard[0], { head: 0 }, 'the view is told to read again from the start, before the new lines');
        assert.ok(heard.some((h) => h.board === 'after' && h.head > 0), JSON.stringify(heard));
        assert.deepEqual(titlesOnDisk(dir), c.kept ? ['First', 'After'] : ['After']);

        const after = await call(engine, 'get_board', { board: 'after' });
        assert.equal(after.isError, false, JSON.stringify(after.body));
        assert.equal(after.body.view.title, 'After');
        assert.equal((await call(engine, 'get_board', { board: 'second' })).isError, true, 'a board no longer on disk is not read');
        assert.equal((await call(engine, 'get_board', { board: 'first' })).isError, !c.kept);

        const put = await engine.route({ method: 'PUT', path: 'boards/mine', body: { title: 'Mine' } }, { caller: PERSON });
        assert.equal(put?.status, 201, JSON.stringify(put?.body));
        assert.deepEqual(titlesOnDisk(dir), c.kept ? ['First', 'After', 'Mine'] : ['After', 'Mine']);
      } finally { stop(); }
    });
  }
}

test('nclite\'s flags: the person\'s first write after the folder is deleted goes too, and the bot\'s next one after it', async () => {
  const dir = folder();
  const engine = createEngine({ dir, name: () => 'Plans folder', warn: () => {}, flags: HOST_FLAGS(false) });
  await draw(engine, 'first', 'First');
  fs.rmSync(dir, { recursive: true, force: true });
  const put = await engine.route({ method: 'PUT', path: 'boards/mine', body: { title: 'Mine' } }, { caller: PERSON });
  assert.equal(put?.status, 201, JSON.stringify(put?.body));
  await draw(engine, 'after', 'After');
  assert.deepEqual(titlesOnDisk(dir), ['Mine', 'After']);
});

test('nclite\'s flags: a folder from elsewhere put in its place (another first agent) is read as it is, and the bot writes on', async () => {
  const dir = folder();
  const elsewhere = folder();
  const engine = createEngine({ dir, name: () => 'Plans folder', warn: () => {}, flags: HOST_FLAGS(false) });
  await draw(engine, 'first', 'First');
  await draw(createEngine({ dir: elsewhere, warn: () => {}, flags: HOST_FLAGS(false) }), 'theirs', 'Theirs');
  fs.rmSync(dir, { recursive: true, force: true });
  fs.cpSync(elsewhere, dir, { recursive: true });
  const read = await call(engine, 'get_board', { board: 'theirs' });
  assert.equal(read.isError, false, JSON.stringify(read.body));
  assert.equal(read.body.held, true, 'the folder\'s one agent holds every board');
  assert.equal((await call(engine, 'get_board', { board: 'first' })).isError, true);
  await draw(engine, 'after', 'After');
  assert.deepEqual(titlesOnDisk(dir), ['Theirs', 'After']);
});

test('startAgainWhenGone: an empty ledger file deleted is made again by the next line, which is never later taken for a file replaced', () => {
  const dir = folder();
  fs.mkdirSync(dir);
  const file = path.join(dir, LEDGER_FILE);
  fs.writeFileSync(file, '');
  const ledger = openLedger(file, () => {}, { startAgainWhenGone: true });
  let resets = 0;
  ledger.onReset(() => { resets++; });
  fs.rmSync(dir, { recursive: true, force: true });
  ledger.append({ type: 'board', board: 'plans', title: 'Plans' }, { by: 'person' });
  ledger.refresh();
  assert.equal(resets, 0);
  assert.equal(ledger.events().length, 1);
  assert.deepEqual(titlesOnDisk(dir), ['Plans']);
});
