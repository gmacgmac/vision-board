// The scripted bot for `--dry`: started exactly as the model's CLI is (same arguments, same stream-json in and out), it
// starts the MCP pass-through from the run's MCP config, speaks MCP to it over stdio, and plays the scenario's fake
// turns (`good` or `bad`, from VB_EVAL_FAKE), writing the stream the CLI would: init, tool uses and their answers, text,
// and a `result` per turn. So the host, the pass-through, the person, the stream reader and the checks are tested with
// no model and no cost.
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { scenarioById } from './scenarios/index.ts';
import type { FakeBot } from './types.ts';

const argv = process.argv.slice(2);
const arg = (name: string) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] ?? '' : ''; };
const SERVER = 'vision-board';
const scenario = scenarioById(process.env.VB_EVAL_SCENARIO ?? '');
const script = (process.env.VB_EVAL_FAKE === 'bad' ? scenario.fake.bad : undefined) ?? scenario.fake.good;
const dir = /board folder is (\S+)/.exec(arg('--append-system-prompt'))?.[1] ?? '';
const emit = (row: object) => process.stdout.write(`${JSON.stringify(row)}\n`);

// The MCP pass-through, as the CLI starts it.
const config = JSON.parse(readFileSync(arg('--mcp-config'), 'utf8')).mcpServers[SERVER];
const server = spawn(config.command, config.args, { env: { ...process.env, ...config.env }, stdio: ['pipe', 'pipe', 'inherit'] });
const waiting = new Map<number, (v: any) => void>();
createInterface({ input: server.stdout! }).on('line', (line) => { const m = JSON.parse(line); waiting.get(m.id)?.(m); waiting.delete(m.id); });
let nextId = 0;
const rpc = (method: string, params: object): Promise<any> => new Promise((done) => {
  const id = ++nextId;
  waiting.set(id, done);
  server.stdin!.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`);
});
await rpc('initialize', { protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 'fake-bot', version: '1' } });
const tools = (await rpc('tools/list', {})).result.tools.map((t: { name: string }) => `mcp__${SERVER}__${t.name}`);
emit({ type: 'system', subtype: 'init', model: 'fake-bot', tools: ['Write', ...tools] });

let uses = 0;
function useLine(name: string, input: unknown, result: string, isError: boolean) {
  const id = `fake-${++uses}`;
  emit({ type: 'assistant', message: { content: [{ type: 'tool_use', id, name, input }] } });
  emit({ type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: id, is_error: isError, content: [{ type: 'text', text: result }] }] } });
}

let turn = 0;
for await (const line of createInterface({ input: process.stdin })) {
  if (!line.trim()) continue;
  const message = JSON.parse(line).message.content[0].text as string;
  const said: string[] = [];
  const bot: FakeBot = {
    dir, message,
    async call(name, input) {
      const reply = await rpc('tools/call', { name, arguments: input });
      const text = String(reply.result?.content?.[0]?.text ?? JSON.stringify(reply.error));
      useLine(`mcp__${SERVER}__${name}`, input, text, Boolean(reply.result?.isError ?? true));
      try { return JSON.parse(text); } catch { return text; }
    },
    write(file, text) {
      mkdirSync(path.dirname(file), { recursive: true });
      writeFileSync(file, text);
      useLine('Write', { file_path: file, content: text }, `File created successfully at: ${file}`, false);
    },
    use(name, input) { useLine(name, input, `<tool_use_error>Error: No such tool available: ${name}</tool_use_error>`, true); },
    say(text) { said.push(text); emit({ type: 'assistant', message: { content: [{ type: 'text', text }] } }); },
  };
  await script[turn]?.(bot);
  turn += 1;
  emit({ type: 'result', subtype: 'success', num_turns: uses + 1, total_cost_usd: 0, is_error: false, result: said.join('\n') });
}
server.stdin!.end();
