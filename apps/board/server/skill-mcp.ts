// The board's MCP server in each client the skill is copied to (D-118): found by what it runs, never by its name
// (Claude's desktop app calls it `vb`), and added only when the person said yes (`--add-mcp`), only where missing,
// named `vision-board`. An existing entry is never changed or removed. A Kiro file gets the entry inserted as text,
// so the rest stays byte-for-byte, checked by parsing before it is written (atomically, its mode kept); Claude Code's
// goes through its own `claude mcp add`, which owns `~/.claude.json`.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { writeFileAtomic } from './atomic-file.ts';
import type { ClientId } from './skill-install.ts';
import * as binWords from './words/bin.ts';

/** What the board's MCP server runs: an entry whose args contain this is the board's, whatever its name. */
export const MCP_MARK = 'packages/mcp/bin/vb-mcp.ts';
/** The name an added entry takes. */
export const MCP_NAME = 'vision-board';
/** Where each client keeps its own MCP servers (Claude Code's user scope: the file's top-level `mcpServers`). */
export const MCP_FILES: Readonly<Record<ClientId, string>> = { claude: '.claude.json', kiro: '.kiro/settings/mcp.json', crew: '.kiro/crew/mcp.json' };

export type McpStatus = { state: 'present'; name: string } | { state: 'missing'; taken: boolean } | { state: 'unreadable'; why: string };
export type McpAdded = { state: 'added' } | { state: 'name-taken' } | { state: 'failed'; why: string };
/** Runs a command and says how it ended (`error` when it could not start). */
export type Runner = (command: string, args: string[]) => { status: number | null; error?: NodeJS.ErrnoException | undefined; output: string };
export interface McpEntry { command: string; args: string[] }

type Json = Record<string, unknown>;
const isObject = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v);
const isBoard = (entry: unknown): boolean => isObject(entry) && Array.isArray(entry.args)
  && entry.args.some((a) => typeof a === 'string' && a.replaceAll('\\', '/').includes(MCP_MARK));

/** The file's parsed JSON, `{}` when there is none; throws when it is not a JSON object or its `mcpServers` is not one. */
function readJson(file: string): Json {
  if (!fs.existsSync(file)) return {};
  const json: unknown = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!isObject(json)) throw new Error('not a JSON object');
  if ('mcpServers' in json && !isObject(json.mcpServers)) throw new Error('"mcpServers" is not an object');
  return json;
}

/** Whether the client under `home` has the board's MCP server, and by what name. */
export function mcpStatus(home: string, id: ClientId): McpStatus {
  let servers: Json;
  try { servers = (readJson(path.join(home, MCP_FILES[id])).mcpServers ?? {}) as Json; } catch (err) {
    return { state: 'unreadable', why: (err as Error).message };
  }
  const name = Object.keys(servers).find((n) => isBoard(servers[n]));
  return name ? { state: 'present', name } : { state: 'missing', taken: MCP_NAME in servers };
}

/** The `claude mcp add` arguments for the board's server (user scope: every project). */
export const claudeAddArgs = (entry: McpEntry): string[] =>
  ['mcp', 'add', '--transport', 'stdio', '--scope', 'user', MCP_NAME, '--', entry.command, ...entry.args];

const SAFE = /^[\w@%+=:,./-]+$/;
/** A command line a person can paste into a shell, each part quoted where it needs it. */
export const shellLine = (parts: string[]): string => parts.map((p) => (SAFE.test(p) ? p : `'${p.replaceAll('\'', '\'\\\'\'')}'`)).join(' ');

const spawnRunner: Runner = (command, args) => {
  const r = spawnSync(command, args, { encoding: 'utf8' });
  return { status: r.status, error: r.error as NodeJS.ErrnoException | undefined, output: `${r.stdout ?? ''}${r.stderr ?? ''}`.trim() };
};

/** Add the board's entry to the client's settings, named `vision-board`; only call it when `mcpStatus` says missing. */
export function addMcp(home: string, id: ClientId, entry: McpEntry, run: Runner = spawnRunner): McpAdded {
  const file = path.join(home, MCP_FILES[id]);
  try {
    const before = readJson(file);
    if (isObject(before.mcpServers) && MCP_NAME in before.mcpServers) return { state: 'name-taken' };
    if (id === 'claude') {
      const r = run('claude', claudeAddArgs(entry));
      if (r.error) return { state: 'failed', why: r.error.code === 'ENOENT' ? binWords.claudeNotFound : r.error.message };
      return r.status === 0 ? { state: 'added' } : { state: 'failed', why: binWords.claudeAddFailed(r.status, r.output) };
    }
    const text = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : undefined;
    const next = text === undefined ? `${JSON.stringify({ mcpServers: { [MCP_NAME]: entry } }, null, 2)}\n` : insertServer(text, MCP_NAME, entry);
    const after = JSON.parse(next) as Json;
    const { [MCP_NAME]: added, ...rest } = after.mcpServers as Json;
    if (!isDeepStrictEqual(added, entry) || !isDeepStrictEqual({ ...after, mcpServers: rest }, { ...before, mcpServers: before.mcpServers ?? {} })) {
      throw new Error('the merged file did not parse back to the old one plus the entry');
    }
    fs.mkdirSync(path.dirname(file), { recursive: true });
    writeFileAtomic(file, next, text === undefined ? undefined : fs.statSync(file).mode & 0o777);
    return { state: 'added' };
  } catch (err) {
    return { state: 'failed', why: (err as Error).message };
  }
}

/** Where the top-level object and its `mcpServers` object open and close in a JSON text (-1 when absent). */
function spans(text: string): { top: [number, number]; servers: [number, number] } {
  let depth = 0; let inString = false; let escaped = false; let start = 0; let key: string | undefined; let value = false;
  const top: [number, number] = [-1, -1]; const servers: [number, number] = [-1, -1];
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inString) {
      if (escaped) escaped = false; else if (c === '\\') escaped = true;
      else if (c === '"') { inString = false; if (depth === 1 && !value) key = JSON.parse(text.slice(start, i + 1)) as string; }
    } else if (c === '"') { inString = true; start = i; }
    else if (c === ':' && depth === 1) value = true;
    else if (c === ',' && depth === 1) { value = false; key = undefined; }
    else if (c === '{' || c === '[') {
      if (depth === 0) top[0] = i; else if (depth === 1 && c === '{' && value && key === 'mcpServers' && servers[0] < 0) servers[0] = i;
      depth++;
    } else if (c === '}' || c === ']') {
      depth--;
      if (depth === 0) top[1] = i; else if (depth === 1 && servers[0] >= 0 && servers[1] < 0) servers[1] = i;
    }
  }
  return { top, servers };
}

const indentAt = (text: string, i: number): string => /^[ \t]*/.exec(text.slice(text.lastIndexOf('\n', i) + 1))![0];

/** `key: value` added as the last member of the object spanning `open`..`close`, in the file's own indentation. */
function addMember(text: string, [open, close]: [number, number], key: string, value: unknown): string {
  const outer = indentAt(text, close);
  const inner = /\n([ \t]*)"/.exec(text.slice(open, close))?.[1] ?? `${outer}  `;
  const unit = inner.slice(outer.length) || '  ';
  const member = `${JSON.stringify(key)}: ${JSON.stringify(value, null, unit).replaceAll('\n', `\n${inner}`)}`;
  const body = text.slice(open + 1, close);
  if (!body.trim()) return `${text.slice(0, open + 1)}\n${inner}${member}\n${outer}${text.slice(close)}`;
  const last = open + 1 + body.trimEnd().length;
  return `${text.slice(0, last)},\n${inner}${member}${text.slice(last)}`;
}

/** The JSON text with `name: entry` added to its top-level `mcpServers` (made when absent), the rest byte-for-byte. */
export function insertServer(text: string, name: string, entry: McpEntry): string {
  const { top, servers } = spans(text);
  if (top[0] < 0 || top[1] < 0) throw new Error('not a JSON object');
  return servers[1] >= 0 ? addMember(text, servers, name, entry) : addMember(text, top, 'mcpServers', { [name]: entry });
}
