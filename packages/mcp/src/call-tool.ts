// `tools/call` (api.md 48): check the arguments, split them back into path, query and body by
// the generated route, call the board server through packages/client, and answer with
// `structuredContent` plus its JSON as text. A problem (bad arguments, a problem answer, no
// server) is `isError: true` with the problem as text only. A write whose every item failed is
// `isError: true` too, keeping its per-item results; one that partly worked is not an error.
import type { OperationId } from '#format';
import type { CallInput } from '#client';
import { ApiProblem, createClient } from '#client';
import { checkArgs } from './check-args.ts';
import { CODES, RpcError, isRecord } from './rpc.ts';
import type { Route } from './tools.ts';
import { TOOLS, routeOf } from './tools.ts';

export interface CallContext {
  /** The board server, such as `http://127.0.0.1:4466`. */
  readonly base: string;
  /** VB_AGENT_SECRET, used when a call that takes the secret does not pass `secret`. */
  readonly secret?: string;
  /** The folder this server works in, sent as `VB-Project` (api.md 116). */
  readonly project?: string;
  readonly fetch?: typeof fetch;
  readonly signal?: AbortSignal;
}

export interface ToolResult {
  content: { type: 'text'; text: string }[];
  structuredContent?: unknown;
  isError: boolean;
}

const text = (t: string, isError: boolean): ToolResult => ({ content: [{ type: 'text', text: t }], isError });

/** The HTTP call's inputs from the checked arguments, and the secret to send. */
export function split(route: Route, args: Readonly<Record<string, unknown>>, envSecret?: string): { input: CallInput; secret?: string } {
  const input: CallInput = {};
  for (const name of [...route.path, ...route.query]) if (args[name] !== undefined) input[name] = args[name];
  if (route.body.length) {
    const body: Record<string, unknown> = {};
    for (const name of route.body) if (args[name] !== undefined) body[name] = args[name];
    input.body = body;
  }
  const secret = route.secret ? (typeof args.secret === 'string' ? args.secret : envSecret) : undefined;
  return { input, ...(secret && { secret }) };
}

/** What a failed call says: a problem's detail and pointer errors, or how to start the server. */
export function failureText(err: unknown, base: string): string {
  if (err instanceof ApiProblem) {
    return [err.detail, ...err.errors.map((e) => `${e.pointer || '/'}: ${e.detail}`), ...(err.example === undefined ? [] : [`Example: ${JSON.stringify(err.example)}`])].join('\n');
  }
  const why = err instanceof Error ? (err.cause instanceof Error ? err.cause.message : err.message) : String(err);
  return `The board server at ${base} is not answering (${why}). Start it with \`npm run board\`, then call again.`;
}

/** Every item of a write failed: nothing was written, so the call as a whole is an error. */
const allFailed = (answer: unknown): boolean =>
  isRecord(answer) && Array.isArray(answer.results) && answer.results.length > 0 &&
  answer.results.every((r) => isRecord(r) && r.ok === false);

/** Run one `tools/call`. An unknown tool or malformed params is a protocol error (thrown). */
export async function callTool(params: Readonly<Record<string, unknown>>, ctx: CallContext): Promise<ToolResult> {
  const name = params.name;
  if (typeof name !== 'string') throw new RpcError(CODES.invalidParams, 'tools/call needs `name`, the tool to call.');
  const tool = TOOLS.get(name);
  if (!tool) throw new RpcError(CODES.invalidParams, `Unknown tool: ${name}`);
  const args = params.arguments ?? {};
  if (!isRecord(args)) throw new RpcError(CODES.invalidParams, 'tools/call `arguments` must be an object.');
  const checked = checkArgs(tool.inputSchema, args);
  if (checked.problems.length) {
    return text(`The arguments do not fit ${name}:\n${checked.problems.join('\n')}`, true);
  }
  const { input, secret } = split(routeOf(name), checked.value as Record<string, unknown>, ctx.secret);
  const client = createClient({ base: ctx.base, ...(secret && { secret }), ...(ctx.project && { project: ctx.project }), ...(ctx.fetch && { fetch: ctx.fetch }) });
  let answer: unknown;
  try {
    answer = await client.call(name as OperationId, input, { ...(ctx.signal && { signal: ctx.signal }) });
  } catch (err) {
    return text(failureText(err, ctx.base), true);
  }
  return { content: [{ type: 'text', text: JSON.stringify(answer) }], structuredContent: answer, isError: allFailed(answer) };
}
