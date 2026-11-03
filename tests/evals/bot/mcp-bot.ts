// The bot's MCP server: stdio, started by the model's CLI (or the fake bot) from the run's MCP config. A generic
// pass-through (plugin.md § Tools): tools/list and tools/call go to the eval host's door, which calls `engine.tools`
// with the bot as caller, logs the call and clamps `wait`. The protocol is the repo's own (#mcp `createMcpServer({ tools
// })`, `serveStdio`), so the bot reads the instructions a host wired from #mcp would send; they are reported to the door
// for the report, and dropped only when the run says `VB_EVAL_INSTRUCTIONS=none`. Every door request has a deadline,
// and the process ends itself after PASS_THROUGH_LIFE_MS.
import { createMcpServer, serveStdio } from '#mcp';
import { DOOR_MS, PASS_THROUGH_LIFE_MS } from './limits.ts';

const DOOR = process.env.VB_EVAL_DOOR ?? '';
const TOKEN = process.env.VB_EVAL_TOKEN ?? '';
const KEEP = process.env.VB_EVAL_INSTRUCTIONS !== 'none';
if (!DOOR || !TOKEN) { console.error('mcp-bot: VB_EVAL_DOOR and VB_EVAL_TOKEN are required'); process.exit(2); }
setTimeout(() => { console.error('mcp-bot: lifetime cap'); process.exit(0); }, PASS_THROUGH_LIFE_MS).unref();

const post = async (what: string, body: unknown, signal?: AbortSignal) => {
  const r = await fetch(DOOR + what, {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-eval-token': TOKEN }, body: JSON.stringify(body),
    signal: AbortSignal.any([AbortSignal.timeout(DOOR_MS), ...(signal ? [signal] : [])]),
  });
  return r.json();
};

const listed = await post('list', {});
const { instructions } = (await post('instructions', {})) as { instructions: string | null };
const server = createMcpServer({
  tools: {
    ...(instructions ? { instructions } : {}),
    list: () => listed,
    async call(name, input, ctx = {}) {
      try { return await post('call', { name, arguments: input }, ctx.signal); } catch (e) {
        return { content: [{ type: 'text', text: `The host could not run ${name}: ${String(e)}` }], isError: true };
      }
    },
  },
});
const handle = server.handle.bind(server);
let told = false;
server.handle = async (message, signal) => {
  const reply = await handle(message, signal);
  const result = reply && 'result' in reply && reply.result && typeof reply.result === 'object' ? reply.result as Record<string, unknown> : null;
  if (result && 'instructions' in result) {
    if (!told) { told = true; await post('note', { instructions: KEEP ? String(result.instructions) : '' }).catch(() => {}); }
    if (!KEEP) delete result.instructions;
  }
  return reply;
};
await serveStdio(server, { input: process.stdin, output: process.stdout });
process.exit(0);
