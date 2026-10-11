// A stand-in for `kiro-cli acp`, so the adapter's tests never run the real one. It speaks ACP over
// stdio and answers from a recorded real run (FAKE_KIRO_FIXTURE: `fixtures/kiro-denied.jsonl`, the
// agent's side of one session, scrubbed): initialize, session/new, session/load (a short replay of
// history first, as Kiro does), and session/prompt, which replays the recorded turn. A permission
// request in the recording is sent and waited for. Everything the client sends, and every answer to
// a permission request, is noted in FAKE_KIRO_NOTE (one JSON line each), with the arguments, the
// pid and the working folder. FAKE_KIRO_MODE:
//   replay (default)  the recorded turn, then its ending
//   hang              the first chunk, then wait; session/cancel ends the turn as "cancelled"
//   stubborn          as hang, but session/cancel is ignored (only a kill ends it)
//   no-servers        never says the tool server is ready
// As the real one (kiro-cli 2.29.1): `--agent <name>` starts as that agent only when
// `$HOME/.kiro/agents/<name>.json` exists, else silently as `kiro_default`; `session/new` answers with
// `modes.currentModeId` and `models` (`availableModels`: FAKE_KIRO_MODELS, comma-separated, or a
// short real list; `currentModelId`: `--model`, else the agent file's `model`, else `auto`).
// Not a test itself (no .test.ts).
import { appendFileSync, existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { createInterface } from 'node:readline';

type Msg = { id?: number | string; method?: string; params?: any; result?: any };
const lines: Msg[] = readFileSync(process.env.FAKE_KIRO_FIXTURE!, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
const mode = process.env.FAKE_KIRO_MODE ?? 'replay';
const note = (what: Record<string, unknown>) => {
  if (process.env.FAKE_KIRO_NOTE) appendFileSync(process.env.FAKE_KIRO_NOTE, `${JSON.stringify(what)}\n`);
};
const send = (m: Record<string, unknown>) => process.stdout.write(`${JSON.stringify({ jsonrpc: '2.0', ...m })}\n`);

const initResult = lines.find((m) => m.result?.agentCapabilities)!.result;
const created = lines.find((m) => m.result?.sessionId)!.result;
const ready = lines.find((m) => m.method === '_kiro.dev/mcp/server_initialized')!;
const turnStart = lines.indexOf(lines.find((m) => m.result?.sessionId)!) + 2; // after the second "ready" note
const ending = lines.findLast((m) => m.result?.stopReason)!;
const turn = lines.slice(turnStart, lines.indexOf(ending));
const session: string = created.sessionId;

const flag = (name: string) => { const i = process.argv.indexOf(name); return i < 0 ? undefined : process.argv[i + 1]; };
const agentFile = flag('--agent') && path.join(process.env.HOME ?? '', '.kiro', 'agents', `${flag('--agent')}.json`);
const agent = agentFile && existsSync(agentFile) ? JSON.parse(readFileSync(agentFile, 'utf8')) : undefined;
const offered = (process.env.FAKE_KIRO_MODELS ?? 'auto,claude-opus-5.5,claude-sonnet-5.5,claude-haiku-4.5').split(',');
const newSession = {
  ...created,
  modes: { currentModeId: agent ? flag('--agent') : 'kiro_default', availableModes: [] },
  models: {
    currentModelId: flag('--model') ?? agent?.model ?? 'auto',
    availableModels: offered.map((id) => ({ modelId: id, name: id })),
  },
};

const answers = new Map<string | number, (result: unknown) => void>();
let promptId: number | string | undefined;

async function replay(id: number | string): Promise<void> {
  let waiting: Promise<unknown>[] = [];
  for (const m of turn) {
    if (m.method && m.id !== undefined) {
      waiting.push(new Promise((resolve) => answers.set(m.id!, resolve)));
      send(m as Record<string, unknown>);
      continue;
    }
    if (waiting.length > 0) { await Promise.all(waiting); waiting = []; }
    send(m as Record<string, unknown>);
  }
  if (waiting.length > 0) await Promise.all(waiting);
  send({ id, result: ending.result });
}

const history = (text: string, kind: string) =>
  send({ method: 'session/update', params: { sessionId: session, update: { sessionUpdate: kind, content: { type: 'text', text } } } });

createInterface({ input: process.stdin }).on('line', (line) => {
  const m: Msg = JSON.parse(line);
  if (m.method === undefined && m.id !== undefined) {
    note({ answered: m.id, result: m.result });
    answers.get(m.id)?.(m.result);
    return;
  }
  note({ method: m.method, params: m.params, args: process.argv.slice(2), pid: process.pid, cwd: process.cwd() });
  switch (m.method) {
    case 'initialize': return send({ id: m.id, result: initResult });
    case 'session/new':
      if (mode !== 'no-servers') send(ready as Record<string, unknown>);
      return send({ id: m.id, result: newSession });
    case 'session/load':
      history('An earlier message.', 'user_message_chunk');
      history('An earlier reply.', 'agent_message_chunk');
      if (mode !== 'no-servers') send(ready as Record<string, unknown>);
      return send({ id: m.id, result: {} });
    case 'session/prompt': {
      promptId = m.id;
      if (mode === 'hang' || mode === 'stubborn') return history('Working on it.', 'agent_message_chunk');
      return void replay(m.id!);
    }
    case 'session/cancel':
      if (mode === 'hang' && promptId !== undefined) send({ id: promptId, result: { stopReason: 'cancelled' } });
      return;
    default:
      if (m.id !== undefined) send({ id: m.id, error: { code: -32601, message: `no ${m.method}` } });
  }
});
if (mode === 'stubborn') process.on('SIGTERM', () => { /* ignored on purpose */ });
