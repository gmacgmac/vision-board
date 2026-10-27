// The app cards' page tests' own board server (app-cards FE_02): started in the test process on a
// temp project of its own, with the example calculator copied in from the skill folder (its one
// source) and the test apps from apps/board/tests/fixtures/apps/ (`addApp`). It serves the page the
// global setup built, on the worker's app port (ports.ts); `flags` are the server's own, as
// VB_FLAGS gives them (`-appCards` turns app cards off), on the worker's apps-off port. Agents write through
// the API and the person acts with the page's cookie (one per server, so the page's too).
// Everything is removed on close; the app processes stop with the server.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AppInfo } from '#format';
import { parseFlags } from '#format';
import { makeTempDir } from '#format/testing';
import { addApp, joinAgent, personAct, personCookie, startTestBoard } from '#board/testing';
import { PORTS } from './ports.ts';

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
  const project = fs.realpathSync(makeTempDir('vb-app-pages-'));
  const apps = path.join(project, '.visionboard', 'apps');
  fs.cpSync(EXAMPLE, path.join(apps, 'calculator'), { recursive: true });
  for (const id of fixtures) addApp(project, id);
  const board = await startTestBoard({ project, flags: parseFlags(flags).overrides, port: flags ? PORTS.appsOff : PORTS.app });
  const { base } = board;
  const cookie = await personCookie(base);
  const { write } = await joinAgent(base, 'App cards build');
  const get = async (url: string) => {
    const r = await fetch(`${base}${url}`, { headers: { Cookie: cookie } });
    if (!r.ok) throw new Error(`${url} answered ${r.status}: ${await r.text()}`);
    return r.json() as Promise<unknown>;
  };
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
    act: (board, body) => personAct(base, cookie, board, body),
    async apps() {
      const { apps: list } = await get('/api/apps') as { apps: AppInfo[] };
      return new Map(list.map((a) => [a.id, a]));
    },
    async call(app, tool, args = {}) {
      const r = await fetch(`${base}/api/apps/${app}/calls`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: cookie }, body: JSON.stringify({ tool, arguments: args }),
      });
      await r.text();
      return r.status;
    },
    async close() {
      await board.close();
      fs.rmSync(project, { recursive: true, force: true });
    },
  };
}
