// The eval's host, from the fake host (tests/plugin/fake-host/server.ts) and the live run's throwaway one: the plugin
// folder's engine loaded by its manifest (`loadEngine`; under `--dry`, the same engine from source, so `npm test` needs
// no build), the bot named once through `route`, and one door for the bot's MCP pass-through: `POST /list`, `POST
// /call` (plugin.md § Tools, "one generic pass-through"), `POST /note` for what the pass-through saw. The door is
// 127.0.0.1 only and asks a per-run token. Every call is logged as the bot asked it, then `wait` is clamped and the
// engine is given a deadline. The person acts through the person's door (`engine.route`, caller person), and Send
// resolves the answers chip and records the Send as a host's chat does (plugin.md § The chat, `send(record)`).
import { randomBytes } from 'node:crypto';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { loadEngine, type HostCaller, type PluginEngine, type ToolResultShape } from '../../plugin/fake-host/server.ts';
import { CALL_MS, WAIT_CLAMP_S } from './limits.ts';
import type { Call, Person } from './types.ts';

const PERSON: HostCaller = { by: 'person' };
const BOT_LABEL = 'The host\'s bot';

async function engineFor(dir: string, dry: boolean, flags?: Record<string, boolean>): Promise<PluginEngine> {
  const { createEngine } = dry ? await import('#board/engine') : await loadEngine();
  const options = { dir, name: () => 'The host\'s folder', warn: () => {}, ...(flags && { flags }) };
  return createEngine(options) as unknown as PluginEngine;
}

/** `work`, or a timeout answer after `ms`. */
export async function deadline<T>(work: Promise<T>, ms: number, what: string): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const late = new Promise<never>((_, fail) => { timer = setTimeout(() => fail(new Error(`${what}: no answer in ${ms} ms`)), ms); });
  try { return await Promise.race([work, late]); } finally { clearTimeout(timer); }
}

async function readBody(req: IncomingMessage): Promise<any> {
  const parts: Buffer[] = [];
  for await (const part of req) parts.push(part as Buffer);
  return JSON.parse(Buffer.concat(parts).toString('utf8') || '{}');
}

const json = (res: ServerResponse, status: number, value: unknown) => {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(value));
};

export async function startEvalHost(o: { dir: string; port: number; dry: boolean; flags?: Record<string, boolean> }) {
  const engine = await engineFor(o.dir, o.dry, o.flags);
  const joined = (await engine.route({ method: 'POST', path: 'agents', body: { label: BOT_LABEL } }))!.body as { agent: string };
  const bot: HostCaller = { by: 'agent', agent: joined.agent };
  const token = randomBytes(18).toString('base64url');
  const calls: Call[] = [];
  const seen: { instructions: string | null } = { instructions: null };
  let turn = -1;

  /** The bot's tool, with the bot as caller and a deadline. */
  const tool = (name: string, input: Record<string, unknown>): Promise<ToolResultShape> =>
    deadline(engine.tools.call(name, input, { caller: bot, signal: AbortSignal.timeout(CALL_MS) }), CALL_MS + 1_000, name);

  async function botCall(name: string, asked: Record<string, any>): Promise<ToolResultShape> {
    const input = { ...asked };
    const row: Call = { turn, name, input: asked, ms: 0, isError: true, text: '' };
    if (name === 'check_responses' && typeof input.wait === 'number' && input.wait > WAIT_CLAMP_S) {
      row.clamped = { wait: input.wait, to: WAIT_CLAMP_S };
      input.wait = WAIT_CLAMP_S;
    }
    const started = Date.now();
    calls.push(row);
    try {
      const result = await tool(name, input);
      Object.assign(row, { isError: result.isError, text: result.content?.[0]?.text ?? '' });
      return result;
    } catch (err) {
      Object.assign(row, { timedOut: true, text: String(err) });
      return { content: [{ type: 'text', text: `The host could not run ${name}: ${String(err)}` }], isError: true };
    } finally { row.ms = Date.now() - started; }
  }

  const server = createServer((req, res) => {
    if (req.headers['x-eval-token'] !== token || req.method !== 'POST') return json(res, 403, { title: 'Not this run\'s pass-through' });
    void (async () => {
      const body = await readBody(req);
      if (req.url === '/list') return json(res, 200, engine.tools.list());
      if (req.url === '/call') return json(res, 200, await botCall(String(body.name), body.arguments ?? {}));
      if (req.url === '/note') { if (typeof body.instructions === 'string') seen.instructions = body.instructions; return json(res, 200, {}); }
      json(res, 404, { title: 'No such door' });
    })().catch((err: unknown) => { if (!res.headersSent) json(res, 500, { title: String(err) }); });
  });
  await new Promise<void>((done, fail) => { server.once('error', fail); server.listen(o.port, '127.0.0.1', done); });
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : o.port;

  const route = async (method: string, path: string, body?: unknown) => {
    const reply = await deadline(engine.route({ method, path, query: new URLSearchParams(), ...(body !== undefined && { body }) }, { caller: PERSON }), CALL_MS, `${method} ${path}`);
    if (!reply || reply.status >= 300) throw new Error(`${method} ${path}: ${reply?.status} ${JSON.stringify(reply?.body)}`);
    return reply.body as any;
  };
  const ledger = async () => (await route('GET', 'ledger')).events as { seq: number; type: string; [k: string]: any }[];
  const latestVer = async (board: string, n: number) => ((await route('GET', `boards/${board}/nodes/${n}`)).versions as { ver: number }[]).at(-1)!.ver;
  const act = (board: string, body: Record<string, unknown>) => route('POST', `boards/${board}/act`, { type: 'act', board, ...body });

  const person: Person = {
    async mark(board, n, mark) { await act(board, { action: mark, n, ver: await latestVer(board, n) }); },
    async note(board, n, text) {
      await act(board, { action: 'comment', n, ver: await latestVer(board, n), text });
      return (await ledger()).filter((e) => e.action === 'comment').at(-1)!.seq;
    },
    async send(board) {
      const since = (await ledger()).filter((e) => e.action === 'send' && e.board === board).at(-1)?.head ?? 0;
      const said = engine.resolve('answers', { board, since });
      if ('refused' in said) throw new Error(`the answers chip was refused: ${said.reason}`);
      await act(board, { action: 'send', head: said.head });
      return String(said.text ?? '');
    },
  };

  return {
    dir: o.dir, door: `http://127.0.0.1:${port}/`, token, bot, calls, seen, person, ledger,
    tool: async (name: string, input: Record<string, unknown>) => {
      const result = await tool(name, input);
      if (result.isError) throw new Error(`setup ${name} failed: ${result.content?.[0]?.text}`);
      return JSON.parse(result.content?.[0]?.text ?? 'null');
    },
    setTurn(n: number) { turn = n; },
    image: (path: string) => engine.image({ method: 'GET', path }).status,
    async close() {
      server.closeAllConnections();
      await new Promise((done) => server.close(done));
    },
  };
}

export type EvalHost = Awaited<ReturnType<typeof startEvalHost>>;
