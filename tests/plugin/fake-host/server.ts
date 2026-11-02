// The fake host's server, written from docs/specification/plugin.md alone: it reads the built folder's manifest,
// loads its engine by the manifest's path, and imports nothing else of the board. It answers the view's `api` with
// `engine.route` (the person's calls), the pictures with `engine.image`, says changes from `engine.watch`, resolves
// every chip as a message goes (`engine.resolve`), and gives its bot `engine.tools.call` with the bot as caller. Its
// page has a strict CSP, as the spec says a host's may.
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { hostSvelteBundle } from './host-svelte.ts';

export const FOLDER = path.resolve(import.meta.dirname, '../../../dist/plugin/board');
const HERE = import.meta.dirname;

/** The strict policy the spec names: no inline script or style, pictures only from the host's route and `data:`. */
export const CSP = "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; font-src 'self'; base-uri 'none'; form-action 'none'";

const TYPES: Record<string, string> = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
const API = '/api/board/';
const PICS = '/pics/';
/** Where a picture goes when a host gives no `imageRoute` (plugin.md). */
const DEFAULT_PICS = '/board-images/';

/** The seam this fake host was written for (plugin.md § The types and the seam version): a folder whose `seam` differs is not loaded. */
export const SEAM_WRITTEN_FOR = 1;
export const manifest = () => JSON.parse(readFileSync(path.join(FOLDER, 'manifest.json'), 'utf8'));

export interface Message { chips: { kind: string; ref: unknown }[]; blocks: { where: string; text: string }[] }
export interface ToolResultShape { content: { type: string; text: string }[]; structuredContent?: any; isError: boolean; _meta?: Record<string, any> }
export type HostCaller = { by: 'person' } | { by: 'agent'; agent: string };
export interface PluginEngine {
  route(req: { method: string; path: string; query?: URLSearchParams; body?: unknown }, ctx?: { caller?: HostCaller; signal?: AbortSignal }): Promise<{ status: number; body: unknown; headers?: Record<string, string> } | null>;
  image(req: { method: string; path: string; ifNoneMatch?: string }): { status: number; body: unknown; headers?: Record<string, string> };
  resolve(kind: string, ref: unknown): any;
  tools: { list(): { name: string; description: string; inputSchema: unknown }[]; call(name: string, input: Record<string, unknown>, ctx?: { caller?: HostCaller; signal?: AbortSignal }): Promise<ToolResultShape> };
  watch(onChange: (change: { board?: string; head: number }) => void): () => void;
}

interface EngineModule { createEngine(o: { dir: string; name?: () => string; warn?: (m: string) => void; flags?: Record<string, boolean> }): PluginEngine }
let engineModule: Promise<EngineModule> | undefined;
/** The folder's engine, by the manifest's path. */
export const loadEngine = (): Promise<EngineModule> => (engineModule ??= import(pathToFileURL(path.join(FOLDER, manifest().engine.module)).href) as Promise<EngineModule>);

/** The JSON a request carries, when the engine asks for it. */
const readJson = (req: IncomingMessage) => async () => {
  const parts: Buffer[] = [];
  for await (const part of req) parts.push(part as Buffer);
  const text = Buffer.concat(parts).toString('utf8');
  return text ? JSON.parse(text) : undefined;
};

function send(res: ServerResponse, status: number, body: unknown, headers: Record<string, string> = {}) {
  const bytes = Buffer.isBuffer(body) ? body : body === null || body === undefined ? null : JSON.stringify(body);
  res.writeHead(status, { 'content-type': 'application/json', ...headers });
  res.end(bytes);
}

/** One fake host: its data folder, engine, bot and web server, on `port`. */
export async function startHost(port: number, options: { flags?: Record<string, boolean> } = {}) {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'vb-fake-host-'));
  const { createEngine } = await loadEngine();
  const engine = createEngine({ dir, name: () => 'The host\'s folder', warn: () => {}, ...(options.flags && { flags: options.flags }) });
  // The host names its bot, once, through `route` (plugin.md § The bot).
  const joined = (await engine.route({ method: 'POST', path: 'agents', body: { label: 'The host\'s bot' } }))!.body as { agent: string };
  const bot: HostCaller = { by: 'agent', agent: joined.agent };
  const streams = new Set<ServerResponse>();
  const messages: Message[] = [];
  const tell = (event: object) => { for (const s of streams) s.write(`data: ${JSON.stringify(event)}\n\n`); };
  const stop = engine.watch(({ board, head }) => tell({ type: 'board', ref: { ...(board !== undefined && { board }), head } }));

  /** The bot calls a tool; a board write's change goes to the chat as a line (`_meta`, plugin.md § Tools). */
  const tool = async (name: string, input: Record<string, unknown>): Promise<ToolResultShape> => {
    const result = await engine.tools.call(name, input, { caller: bot });
    const change = result._meta?.['vb/change'];
    if (change) tell({ type: 'chat', line: change });
    return result;
  };

  async function answer(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const url = new URL(req.url ?? '/', `http://127.0.0.1:${port}`);
    const at = url.pathname;
    if (at === '/') return void send(res, 200, readFileSync(path.join(HERE, 'page.html')), { 'content-type': 'text/html', 'content-security-policy': CSP });
    if (at === '/host/host-svelte.js') return void send(res, 200, Buffer.from(await hostSvelteBundle()), { 'content-type': 'text/javascript' });
    if (at === '/stream') {
      res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache' });
      res.write(`data: ${JSON.stringify({ type: 'board', ref: {} })}\n\n`); // the spec's catch-up, each time the stream opens
      streams.add(res);
      req.on('close', () => streams.delete(res));
      return;
    }
    if (at === '/chat' && req.method === 'POST') {
      const { chips } = await readJson(req)() as { chips: Message['chips'] };
      const blocks: Message['blocks'] = [];
      let answers: unknown = null;
      for (const chip of chips) {
        const said = engine.resolve(chip.kind, chip.ref);
        if ('refused' in said) return void send(res, 409, { reason: said.reason });
        if (said.text) blocks.push({ where: said.where, text: said.text });
        if (chip.kind === 'answers') answers = said; // what the Send's record acknowledges: the answers this read
      }
      messages.push({ chips, blocks });
      return void send(res, 200, { blocks, answers });
    }
    if (at.startsWith(API)) {
      const gone = new AbortController();
      res.on('close', () => gone.abort());
      const reply = await engine.route(
        { method: req.method ?? 'GET', path: at.slice(API.length), query: url.searchParams, body: readJson(req) },
        { caller: { by: 'person' }, signal: gone.signal },
      );
      if (!reply) return void send(res, 404, { title: 'No such route' }, { 'content-type': 'application/problem+json' });
      return void send(res, reply.status, reply.body, reply.headers);
    }
    const pics = [PICS, DEFAULT_PICS].find((prefix) => at.startsWith(prefix));
    if (pics) {
      const reply = engine.image({ method: req.method ?? 'GET', path: url.pathname.slice(pics.length), ...(req.headers['if-none-match'] && { ifNoneMatch: req.headers['if-none-match'] }) });
      const isJson = !Buffer.isBuffer(reply.body) && reply.body !== null;
      return void send(res, reply.status, reply.body, { ...(isJson ? {} : { 'content-type': 'application/octet-stream' }), ...reply.headers });
    }
    const [root, rel] = at.startsWith('/plugin/') ? [FOLDER, at.slice('/plugin/'.length)] : at.startsWith('/host/') ? [HERE, at.slice('/host/'.length)] : [null, ''];
    const file = root && path.join(root, rel);
    if (!file || !file.startsWith(root) || !existsSync(file)) return void send(res, 404, { title: 'Not found' });
    send(res, 200, readFileSync(file), { 'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream' });
  }

  const server = createServer((req, res) => { answer(req, res).catch((err: unknown) => { console.error(err); if (!res.headersSent) send(res, 500, { title: String(err) }); }); });
  await new Promise<void>((done) => server.listen(port, '127.0.0.1', done));
  return {
    url: `http://127.0.0.1:${port}/`, dir, engine, bot, tool, messages,
    async close() {
      stop();
      for (const s of streams) s.end();
      server.closeAllConnections();
      await new Promise((done) => server.close(done));
      rmSync(dir, { recursive: true, force: true });
    },
  };
}

export type FakeHost = Awaited<ReturnType<typeof startHost>>;
