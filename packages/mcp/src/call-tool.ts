// `tools/call` (api.md 48) over whichever tools a server serves (`ToolHost`, MCP's shapes): this
// package's own, over HTTP (`httpTools`), or a host's, such as the board engine's `tools`. The HTTP
// tools check the arguments, split them back into path, query and body by the generated route, call
// the board server through packages/client, and answer with `structuredContent` plus its JSON as text.
// A problem (bad arguments, a problem answer, no server) is `isError: true` with the problem as text
// only (`problemResult`). A write whose every item failed is `isError: true` too, keeping its per-item
// results; one that partly worked is not an error (`answerResult`).
import type { OperationId } from '#format';
import { isRecord } from '#format';
import type { CallInput } from '#client';
import { ApiProblem, createClient } from '#client';
import { checkArgs } from './check-args.ts';
import { CODES, RpcError } from './rpc.ts';
import type { Route } from './tools.ts';
import { TOOL_FILE, TOOLS, routeOf } from './tools.ts';
import * as protocolWords from './words/protocol.ts';

export interface CallContext {
  /** The board server, such as `http://127.0.0.1:4466`. */
  readonly base: string;
  /** VB_AGENT_SECRET, used when a call that takes the secret does not pass `secret`. */
  readonly secret?: string;
  /** The folder this server works in, sent as `VB-Project` (api.md 116). */
  readonly project?: string;
  readonly fetch?: typeof fetch;
}

/** MCP's `CallToolResult`, as these tools make it. `_meta` carries what a host reads beside the answer. */
export interface ToolResult {
  content: { type: 'text'; text: string }[];
  structuredContent?: unknown;
  isError: boolean;
  _meta?: Record<string, unknown>;
}

/** One tool as `tools/list` sends it: MCP's shape, the hints optional. */
export interface ListedTool {
  readonly name: string;
  readonly title?: string;
  readonly description: string;
  readonly inputSchema: { readonly [keyword: string]: unknown };
  readonly annotations?: { readonly [hint: string]: boolean };
}

/** The tools a server serves, in MCP's shapes. `signal` ends a held call. `instructions`, when given, is what the
 * server tells its client to do with them (a host's bot reads the plugin's, the board engine's `tools.instructions`). */
export interface ToolHost {
  list(): readonly ListedTool[];
  call(name: string, input: Record<string, unknown>, ctx?: { signal?: AbortSignal }): Promise<ToolResult>;
  readonly instructions?: string | undefined;
}

const text = (t: string, isError: boolean): ToolResult => ({ content: [{ type: 'text', text: t }], isError });

/** A problem as a tool's result: its words, as text only. */
export const problemResult = (p: Parameters<typeof problemText>[0]): ToolResult => text(problemText(p), true);

/** A tool a host's `call` does not have, as a tool's result (the protocol refuses one not listed first). */
export const unknownToolResult = (name: string): ToolResult => text(protocolWords.unknownTool(name), true);

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

/** What a problem says: its detail, its pointer errors and its example. */
const problemText = (p: { detail: string; errors?: readonly { pointer: string; detail: string }[]; example?: unknown }): string =>
  [p.detail, ...(p.errors ?? []).map((e) => `${e.pointer || '/'}: ${e.detail}`), ...(p.example === undefined ? [] : [protocolWords.example(JSON.stringify(p.example))])].join('\n');

/** What a failed call says: a problem's words, or how to start the server. */
export function failureText(err: unknown, base: string): string {
  if (err instanceof ApiProblem) return problemText(err);
  const why = err instanceof Error ? (err.cause instanceof Error ? err.cause.message : err.message) : String(err);
  return protocolWords.theBoardServerAtIs(base, why);
}

/** Every item of a write failed: nothing was written, so the call as a whole is an error. */
const allFailed = (answer: unknown): boolean =>
  isRecord(answer) && Array.isArray(answer.results) && answer.results.length > 0 &&
  answer.results.every((r) => isRecord(r) && r.ok === false);

/** An operation's answer as a tool's result. */
export const answerResult = (answer: unknown): ToolResult =>
  ({ content: [{ type: 'text', text: JSON.stringify(answer) }], structuredContent: answer, isError: allFailed(answer) });

/** This package's own tools: the generated list, each call to the board server over HTTP. */
export const httpTools = (ctx: CallContext): ToolHost => ({
  list: () => TOOL_FILE.tools,
  async call(name, args, { signal } = {}) {
    const checked = checkArgs(TOOLS.get(name)!.inputSchema, args);
    if (checked.problems.length) {
      return text(protocolWords.theArgumentsDoNotFit(name, checked.problems.join('\n')), true);
    }
    const { input, secret } = split(routeOf(name), checked.value as Record<string, unknown>, ctx.secret);
    const client = createClient({ base: ctx.base, ...(secret && { secret }), ...(ctx.project && { project: ctx.project }), ...(ctx.fetch && { fetch: ctx.fetch }) });
    try {
      return answerResult(await client.call(name as OperationId, input, { ...(signal && { signal }) }));
    } catch (err) {
      return text(failureText(err, ctx.base), true);
    }
  },
});

/** Run one `tools/call` on `tools`. A tool not listed or malformed params is a protocol error (thrown). */
export async function callTool(params: Readonly<Record<string, unknown>>, tools: ToolHost, signal?: AbortSignal): Promise<ToolResult> {
  const name = params.name;
  if (typeof name !== 'string') throw new RpcError(CODES.invalidParams, protocolWords.toolsCallNeedsNameThe);
  if (!tools.list().some((t) => t.name === name)) throw new RpcError(CODES.invalidParams, protocolWords.unknownTool(name));
  const args = params.arguments ?? {};
  if (!isRecord(args)) throw new RpcError(CODES.invalidParams, protocolWords.toolsCallArgumentsMustBe);
  return tools.call(name, args, { ...(signal && { signal }) });
}
