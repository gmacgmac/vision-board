// The open-folder page tests' own board server (open-folder task, U12): started in the test process
// with its own home folder, a temp folder holding `projects/start` (open at first, one board),
// `projects/other` (one board) and `projects/empty-app` (no Vision Board), and on demand a cloud
// storage place, `Library/CloudStorage/Cloud-Example/repo` (one board) with home's link to the place
// as macOS makes one (folder-links-cloud task), so the picker never lists, reads or writes the real
// home. The agent package's fake `claude` stands in for the CLI, so a test can read the folder a
// chat ran in. It serves the page the global setup built, on the worker's folder port (ports.ts);
// everything is removed on close.
import fs from 'node:fs';
import path from 'node:path';
import { makeTempDir } from '#format/testing';
import { fakeChat, personCookie, startTestBoard } from '#board/testing';
import type { Caller } from '../../apps/board/server/ledger.ts';
import { ledgerPath, openLedger } from '../../apps/board/server/ledger.ts';
import { PORTS } from './ports.ts';

const AGENT: Caller = { by: 'agent', agent: 'a-f01der00' };

export interface FolderServer {
  base: string;
  home: string;
  /** The three folders under `<home>/projects`. */
  start: string;
  other: string;
  empty: string;
  fake: ReturnType<typeof fakeChat>;
  /** Make the cloud storage place and home's link to it; returns `repo`'s path. */
  addCloud(): string;
  /** Remove them again (open another folder first). */
  removeCloud(): void;
  /** Open `dir` as the person, as the picker does (and with `create`, make its board). */
  open(dir: string, create?: boolean): Promise<void>;
  close(): Promise<void>;
}

/** A folder whose ledger holds board `board` with one card titled `title`, drawn by an agent. */
function seed(dir: string, board: string, title: string): void {
  const ledger = openLedger(ledgerPath(dir), () => {});
  ledger.append({ type: 'join', label: 'Folder test agent' }, AGENT);
  ledger.append({ type: 'board', board, title: `${title} board` }, AGENT);
  ledger.append({ type: 'region', board, region: { id: 'ideas', title: 'Ideas', mode: 'grid' } }, AGENT);
  ledger.append({ type: 'node', board, node: { region: 'ideas', kind: 'question', title } }, AGENT);
}

export async function startFolderServer(): Promise<FolderServer> {
  const home = fs.realpathSync(makeTempDir('vb-folder-pages-'));
  const [start, other, empty] = ['start', 'other', 'empty-app'].map((n) => path.join(home, 'projects', n)) as [string, string, string];
  seed(start, 'start-board', 'Start card');
  seed(other, 'other-board', 'Other card');
  fs.mkdirSync(empty, { recursive: true });
  const cli = makeTempDir('vb-folder-cli-');
  const fake = fakeChat(cli);
  const board = await startTestBoard({ project: start, home, port: PORTS.folder, chat: { adapters: fake.adapters } });
  const { base } = board;
  const cookie = await personCookie(base);
  return {
    base, home, start, other, empty, fake,
    addCloud() {
      const place = path.join(home, 'Library', 'CloudStorage', 'Cloud-Example');
      seed(path.join(place, 'repo'), 'cloud-board', 'Cloud card');
      fs.symlinkSync(place, path.join(home, 'Cloud-Example'));
      return path.join(place, 'repo');
    },
    removeCloud() {
      for (const p of ['Cloud-Example', 'Library']) fs.rmSync(path.join(home, p), { recursive: true, force: true });
    },
    async open(dir, create = false) {
      const r = await fetch(`${base}/api/project`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: cookie }, body: JSON.stringify({ path: dir, ...(create && { create }) }),
      });
      if (!r.ok) throw new Error(`open_project answered ${r.status}: ${await r.text()}`);
    },
    async close() {
      await board.close();
      for (const dir of [home, cli]) fs.rmSync(dir, { recursive: true, force: true });
    },
  };
}
