// The open-folder page tests' own board server (open-folder task, U12): started in the test process
// with its own home folder, a temp folder holding `projects/start` (open at first, one board),
// `projects/other` (one board) and `projects/empty-app` (no Vision Board), and on demand a cloud
// storage place, `Library/CloudStorage/Cloud-Example/repo` (one board) with home's link to the place
// as macOS makes one (folder-links-cloud task), so the picker never lists, reads or writes the real
// home. The agent package's fake `claude` stands in for the CLI, so a test can read the folder a
// chat ran in. It serves the page the main test server built, on its own port (four above it);
// everything is removed on close.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { AddressInfo } from 'node:net';
import { fileURLToPath } from 'node:url';
import { createBoardServer } from '../../apps/board/server/app.ts';
import type { Caller } from '../../apps/board/server/ledger.ts';
import { ledgerPath, openLedger } from '../../apps/board/server/ledger.ts';
import { fakeChat } from '../../apps/board/tests/chat-support.ts';
import { CHAT_PORT } from './chat-server.ts';

export const FOLDER_PORT = CHAT_PORT + 1;
const DIST = fileURLToPath(new URL('../../apps/board/dist', import.meta.url));
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
  const home = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'vb-folder-pages-')));
  const [start, other, empty] = ['start', 'other', 'empty-app'].map((n) => path.join(home, 'projects', n)) as [string, string, string];
  seed(start, 'start-board', 'Start card');
  seed(other, 'other-board', 'Other card');
  fs.mkdirSync(empty, { recursive: true });
  const cli = fs.mkdtempSync(path.join(os.tmpdir(), 'vb-folder-cli-'));
  const fake = fakeChat(cli);
  const server = createBoardServer({ ledger: openLedger(ledgerPath(start), () => {}), home, dist: DIST, chat: { adapters: fake.adapters } });
  await new Promise<void>((resolve) => server.listen(FOLDER_PORT, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const cookie = /^(vb_person=[^;]+)/.exec((await fetch(`${base}/`)).headers.get('set-cookie') ?? '')?.[1] ?? '';
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
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
      for (const dir of [home, cli]) fs.rmSync(dir, { recursive: true, force: true });
    },
  };
}
