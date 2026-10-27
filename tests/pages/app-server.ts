// The app cards' page tests' own board server (app-cards FE_02): started in the test process on a
// temp project of its own, with the example calculator copied in from the skill folder (its one
// source) and the test apps from apps/board/tests/fixtures/apps/ (`addApp`). It serves the page the
// main test server built, on its own port (five above it); `flags` are the server's own, as
// VB_FLAGS gives them (`-appCards` turns app cards off), on the port above. Agents write through
// the API and the person acts with the page's cookie (one per server, so the page's too).
// Everything is removed on close; the app processes stop with the server.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { AddressInfo } from 'node:net';
import { fileURLToPath } from 'node:url';
import type { AppInfo } from '#format';
import { parseFlags } from '#format';
import { createBoardServer } from '../../apps/board/server/app.ts';
import { ledgerPath, openLedger } from '../../apps/board/server/ledger.ts';
import { addApp } from '../../apps/board/tests/app-support.ts';
import { FOLDER_PORT } from './folder-server.ts';

export const APP_PORT = FOLDER_PORT + 1;
/** The server with app cards off (`VB_FLAGS=-appCards`). */
export const APPS_OFF_PORT = APP_PORT + 1;
const DIST = fileURLToPath(new URL('../../apps/board/dist', import.meta.url));
/** The example app, as the skill ships it. */
export const EXAMPLE = fileURLToPath(new URL('../../skills/vision-board/examples/apps/calculator', import.meta.url));

/** The calculator as the agent draws it (PLAN.md § Goal state line 3). */
export const CALCULATOR = { kind: 'app', title: 'Calculator', app: { id: 'calculator', w: 360, h: 440 } };

export interface AppServer {
  base: string;
  project: string;
  /** An app's folder in the project. */
  dir(app: string): string;
  /** An agent's write on `board`; the results, each `ok`. */
  write(board: string, items: unknown[]): Promise<{ n?: number }[]>;
  /** A board of its own, drawn by the agent: container "Tools" holding `cards`; their numbers. */
  draw(cards: object[]): Promise<{ board: string; n: number[] }>;
  /** A person's act on `board`, with the page's cookie. */
  act(board: string, body: Record<string, unknown>): Promise<void>;
  /** Every app as list_apps gives it, by id. */
  apps(): Promise<Map<string, AppInfo>>;
  /** A tool call as the page makes it; the response's status. */
  call(app: string, tool: string, args?: Record<string, unknown>): Promise<number>;
  close(): Promise<void>;
}

export interface AppServerOptions {
  /** The server's flags, as VB_FLAGS writes them (`-appCards`). */
  flags?: string;
  /** The test apps to copy in beside the calculator. */
  fixtures?: string[];
}

export async function startAppServer({ flags, fixtures = [] }: AppServerOptions = {}): Promise<AppServer> {
  const project = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'vb-app-pages-')));
  const apps = path.join(project, '.visionboard', 'apps');
  fs.cpSync(EXAMPLE, path.join(apps, 'calculator'), { recursive: true });
  for (const id of fixtures) addApp(project, id);
  const file = ledgerPath(project);
  const server = createBoardServer({ ledger: openLedger(file, () => {}), dist: DIST, flags: parseFlags(flags).overrides });
  await new Promise<void>((resolve) => server.listen(flags ? APPS_OFF_PORT : APP_PORT, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const cookie = /^(vb_person=[^;]+)/.exec((await fetch(`${base}/`)).headers.get('set-cookie') ?? '')?.[1] ?? '';
  const post = (url: string, body: unknown, headers: Record<string, string>) =>
    fetch(`${base}${url}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });
  const ok = async (r: Response) => {
    if (!r.ok) throw new Error(`${r.url} answered ${r.status}: ${await r.text()}`);
    return r.json() as Promise<unknown>;
  };
  const { secret } = await ok(await post('/api/agents', { label: 'App cards build' }, {})) as { secret: string };
  async function write(board: string, items: unknown[]) {
    const out = await ok(await post(`/api/boards/${board}/write`, { items }, { Authorization: `Bearer ${secret}` })) as { results: { ok: boolean; n?: number }[] };
    if (!out.results.every((x) => x.ok)) throw new Error(`the write failed: ${JSON.stringify(out.results)}`);
    return out.results;
  }
  let boards = 0;
  return {
    base, project, write,
    dir: (app) => path.join(apps, app),
    async draw(cards) {
      const board = `apps-${(boards += 1)}`;
      const results = await write(board, [
        { type: 'board', title: 'Apps' }, { type: 'region', region: { id: 'tools', title: 'Tools', mode: 'grid' } },
        ...cards.map((node) => ({ type: 'node', node: { region: 'tools', ...node } })),
      ]);
      return { board, n: results.slice(2).map((r) => r.n!) };
    },
    async act(board, body) { await ok(await post(`/api/boards/${board}/act`, { type: 'act', ...body }, { Cookie: cookie })); },
    async apps() {
      const { apps: list } = await ok(await fetch(`${base}/api/apps`, { headers: { Cookie: cookie } })) as { apps: AppInfo[] };
      return new Map(list.map((a) => [a.id, a]));
    },
    async call(app, tool, args = {}) {
      const r = await post(`/api/apps/${app}/calls`, { tool, arguments: args }, { Cookie: cookie });
      await r.text();
      return r.status;
    },
    async close() {
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
      fs.rmSync(project, { recursive: true, force: true });
    },
  };
}
