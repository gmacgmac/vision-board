// Test support for the app host (app-cards BE_02): copy a test app (tests/fixtures/apps/) into a
// temp project, allow it as the person, call a tool as the board page does, read a raw path, and
// wait for a process to be gone. Only a temp project's apps folder (`ledgerFiles`) is ever written.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AppInfo } from '#format';
import { ApiProblem } from '#client';
import type { Harness } from './api-harness.ts';
import { PERSON } from './api-harness.ts';
import { ledgerFiles, ledgerFolder } from '#format';

export const FIXTURES = fileURLToPath(new URL('./fixtures/apps/', import.meta.url));

/** The words for a manifest file name the board can't use, the whole rule (findings 35, 36). */
export const FILE_NAME_WORDS = {
  panel: 'panel must be a file name ending in .html, directly in the app\'s folder: letters, digits, dots, hyphens and _, up to 100, not starting with a dot or hyphen, no two dots in a row',
  tools: 'tools must be a file name ending in .mjs, directly in the app\'s folder: letters, digits, dots, hyphens and _, up to 99, not starting with a dot or hyphen, no two dots in a row',
} as const;

/** Copy test app `id` into the project's apps folder; returns its folder there. */
export function addApp(project: string, id: string): string {
  const to = path.join(ledgerFiles(ledgerFolder(project)).apps, id);
  fs.cpSync(path.join(FIXTURES, id), to, { recursive: true });
  return to;
}

/** Every app as list_apps gives it to the person, by id. */
export async function apps(h: Harness): Promise<Map<string, AppInfo>> {
  const { apps: list } = await h.ok<{ apps: AppInfo[] }>('list_apps', {}, { as: h.person });
  return new Map(list.map((a) => [a.id, a]));
}

/** The person allows the app's code as it is now; returns the hash allowed. */
export async function allow(h: Harness, id: string): Promise<string> {
  const hash = (await apps(h)).get(id)?.hash ?? assert.fail(`list_apps has no hash for ${id}`);
  h.ledger.append({ type: 'act', action: 'app-allow', app: id, hash }, PERSON);
  return hash;
}

/** Call a tool as the board page does; the answer is checked against the spec. */
export const run = <T = Record<string, unknown>>(h: Harness, app: string, tool: string, args: Record<string, unknown> = {}) =>
  h.ok<{ content: { type: string; text: string }[]; structuredContent?: T; isError: boolean }>('call_app_tool', { app, body: { tool, arguments: args } });

/** Call a tool, expecting a problem with this status and code. */
export const refused = (h: Harness, app: string, tool: string, status: number, code: string, args: Record<string, unknown> = {}): Promise<ApiProblem> =>
  h.fails('call_app_tool', { app, body: { tool, arguments: args } }, status, code);

export interface Raw { status: number; headers: http.IncomingHttpHeaders; body: string }

/** A request for a raw path, cleaned up by nothing on the way (fetch would resolve `%2e%2e`). */
export function raw(base: string, rawPath: string, { method = 'GET', headers = {}, body }: { method?: string; headers?: Record<string, string>; body?: string } = {}): Promise<Raw> {
  const { hostname, port } = new URL(base);
  return new Promise((resolve, reject) => {
    const req = http.request({ hostname, port, path: rawPath, method, headers: { Host: `127.0.0.1:${port}`, ...headers } }, (res) => {
      let text = '';
      res.setEncoding('utf8');
      res.on('data', (c: string) => { text += c; });
      res.on('end', () => resolve({ status: res.statusCode ?? 0, headers: res.headers, body: text }));
    });
    req.on('error', reject);
    req.end(body);
  });
}

/** True while process `pid` runs (a reaped one is gone). */
export function alive(pid: number): boolean {
  try { process.kill(pid, 0); return true; } catch { return false; }
}

/** Wait until process `pid` is gone, or fail after `ms`. */
export async function gone(pid: number, ms = 3000): Promise<void> {
  const end = Date.now() + ms;
  while (alive(pid)) {
    if (Date.now() > end) assert.fail(`process ${pid} is still running`);
    await new Promise((r) => setTimeout(r, 20));
  }
}

/** Change a file's bytes without changing what it does: a new version of the app's code. */
export const touch = (file: string, note = 'changed'): void => fs.appendFileSync(file, `\n// ${note} ${Date.now()}\n`);
