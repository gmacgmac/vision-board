// The standalone bot's host (M53, PLAN decision 5): the bot as a person runs it from their own chat, with this repo's
// SKILL.md as its instructions and the real `vb-mcp` (`#mcp` MCP_BIN) as its `vision-board` server, against a real
// board server (`#board/testing` `startTestBoard`) in a temp home: ledger folders and read-only opening on, opened for
// editing (as `--edit`), the project `<home>/projects/trip-plans` with ledger `main` open. The eval's loop sees it as
// any `BotHost`. Setup's tools are an earlier chat's (`#mcp` `httpTools`, the code `vb-mcp` runs), joined once per
// ledger, as a secret belongs to the ledger it joined; the person acts with the page's cookie. There is no door: the
// bot's board calls are read from its stream (`callsFrom`), so no `wait` is clamped (the run's kill bounds it).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { ENV, ledgerFiles, ledgerFolder } from '#format';
import { INSTRUCTIONS, MCP_BIN, httpTools } from '#mcp';
import { personAct, personCookie, startTestBoard } from '#board/testing';
import { openLedger } from '../../../apps/board/server/ledger.ts';
import { CALL_MS } from './limits.ts';
import type { BotHost, Call, Person, RunRecord, TurnRecord } from './types.ts';

/** The real skill, as the person's client loads it (D-057: `~/.claude/skills/vision-board` links to it). */
export const STANDALONE_SKILL = path.resolve(import.meta.dirname, '../../../skills/vision-board/SKILL.md');
/** The person's project folder's name, which the skill has the bot join with. */
export const PROJECT = 'trip-plans';
export const MAIN = 'main';
const SERVER = 'vision-board';
const PREFIX = `mcp__${SERVER}__`;

/** The bot's board tool calls, from its stream: each `mcp__vision-board__*` use and its answer (no time, no clamp). */
export const callsFrom = (turns: TurnRecord[]): Call[] => turns.flatMap((t, turn) => t.uses
  .filter((u) => u.name.startsWith(PREFIX))
  .map((u) => ({ turn, name: u.name.slice(PREFIX.length), input: u.input ?? {}, ms: 0, isError: u.isError ?? true, text: u.result ?? '' })));

export async function startStandaloneHost(o: { base: string; port: number; flags?: Record<string, boolean> }): Promise<BotHost> {
  const home = path.join(o.base, 'home');
  const project = path.join(home, 'projects', PROJECT);
  const dist = path.join(o.base, 'dist');
  mkdirSync(dist);
  writeFileSync(path.join(dist, 'index.html'), '<!doctype html><title>Board</title>\n');
  const fileOf = (name: string) => ledgerFiles(ledgerFolder(project, name)).ledger;
  const dir = ledgerFolder(project, MAIN);
  mkdirSync(dir, { recursive: true });
  writeFileSync(fileOf(MAIN), '');
  const board = await startTestBoard({
    project, home, dist, port: o.port, ledger: openLedger(fileOf(MAIN), () => {}), edit: true, chat: { kiroAgent: false },
    flags: { ledgerFolders: true, readOnlyStart: true, ...o.flags },
  });
  const cookie = await personCookie(board.base);
  const calls: Call[] = [];
  const secrets = new Map<string, string>();
  let open = MAIN;

  const call = async (name: string, input: Record<string, unknown>, secret?: string) => {
    const r = await httpTools({ base: board.base, project, ...(secret && { secret }) }).call(name, input, { signal: AbortSignal.timeout(CALL_MS) });
    const text = r.content[0]?.text ?? 'null';
    if (r.isError) throw new Error(`setup ${name} failed: ${text}`);
    return JSON.parse(text);
  };
  /** An earlier chat's agent on the open ledger. */
  const earlier = async () => {
    if (!secrets.has(open)) secrets.set(open, (await call('join', { label: 'earlier-chat' })).secret);
    return secrets.get(open)!;
  };
  const api = async (method: string, url: string, body?: unknown) => {
    const r = await fetch(`${board.base}/api/${url}`, {
      method, headers: { 'Content-Type': 'application/json', Cookie: cookie }, signal: AbortSignal.timeout(CALL_MS),
      ...(body !== undefined && { body: JSON.stringify(body) }),
    });
    if (!r.ok) throw new Error(`${method} ${url}: ${r.status} ${await r.text()}`);
    return r.json() as Promise<any>;
  };
  const events = (): RunRecord['ledger'] => readFileSync(fileOf(open), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
  const act = async (b: string, n: number, body: Record<string, unknown>) => {
    const ver = (await api('GET', `boards/${b}/nodes/${n}`)).versions.at(-1).ver as number;
    await personAct(board.base, cookie, b, { board: b, n, ver, ...body });
  };
  const person: Person = {
    async mark(b, n, mark) { await act(b, n, { action: mark }); },
    async note(b, n, text) { await act(b, n, { action: 'comment', text }); return events().filter((e) => e.action === 'comment').at(-1)!.seq; },
    async send() { throw new Error('standalone: no Send; the person writes in their own chat'); },
  };

  return {
    dir, cwd: project, calls, person,
    seen: { instructions: INSTRUCTIONS }, // what vb-mcp sends with no VB_AGENT_SECRET (protocol.ts)
    mcp: { command: process.execPath, args: [MCP_BIN], env: { [ENV.server]: board.base, [ENV.project]: project, [ENV.agentSecret]: '' } },
    bot: { skill: STANDALONE_SKILL, prompt: `Your working folder is ${project}`, tools: 'Write,Read,Glob,Grep', addDir: project },
    tool: async (name, input) => call(name, input, await earlier()),
    setReadOnly: () => { throw new Error('standalone: the ledger opens for editing; no read-only scenario here'); },
    async openLedger(name) {
      await api('POST', 'project', { path: project, ledger: name, ...(!existsSync(fileOf(name)) && { create: true }) });
      open = name;
    },
    setTurn: () => {},
    record(turns) { calls.push(...callsFrom(turns)); },
    ledger: async () => events(),
    image: async (p) => (await fetch(`${board.base}/board-images/${p.split('/').map(encodeURIComponent).join('/')}`)).status,
    close: () => board.close(),
  };
}
