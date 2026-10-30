// The engine's tools (nclite's plugin contract, plugins.md § Where each part runs): one per agent
// operation in the generated tool table (`TOOLS_FILE`, gen-tools.mjs, from openapi.json), named as
// the MCP server names them. A tool checks its input against the table's JSON Schema, splits it back
// into the operation's path, query and body by the table's `route`, and runs the operation with the
// caller its host passes (a host that knows the agent, nclite's run ticket, passes it; no secret,
// no `join`). It answers the operation's JSON, or its problem. Tools whose operation the engine does
// not serve (`list_apps`, the standalone app host's; `read_attachment`, beside its chat) are left out.
import fs from 'node:fs';
import type { OperationId, ProblemDocument } from '#format';
import { TOOLS_FILE } from '#format/files';
import type { Caller } from '../ledger.ts';
import { problem } from '../problem.ts';
import { foreignSchemas } from '../schema.ts';
import * as httpWords from '../words/http.ts';

/** One row of the tool table, as the engine reads it. */
interface ToolRow {
  name: string;
  input: Record<string, unknown>;
  route: { path: string[]; query: string[]; body: string[] };
}

/** What a tool did: the operation's answer, or its problem (a refused input is `invalid`). */
export type ToolOutcome = { ok: true; result: unknown } | { ok: false; problem: ProblemDocument };

/** A tool: its input as the table's schema takes it, the caller from the host, and a signal that
 * ends a held read (`check_responses` with `wait`). */
export type EngineTool = (input: Record<string, unknown>, caller?: Caller, opts?: { signal?: AbortSignal }) => Promise<ToolOutcome>;

/** Run operation `id` with plain inputs: the engine's one way in, under both `route` and the tools. */
export type RunOp = (id: OperationId, input: {
  params: Record<string, unknown>; body: unknown; caller: Caller | undefined; signal: AbortSignal | undefined;
}) => Promise<{ status: number; body: unknown }>;

const ROWS: readonly ToolRow[] = (JSON.parse(fs.readFileSync(TOOLS_FILE, 'utf8')) as { tools: ToolRow[] }).tools;

const refused = (errors: { pointer: string; detail: string }[], name: string): ToolOutcome =>
  ({ ok: false, problem: problem('invalid', httpWords.theInputDoesNotFit(name), { errors }).body });

/** The tools for the operations `serves` holds, each running through `run`. */
export function makeTools(serves: (id: string) => id is OperationId, run: RunOp): Record<string, EngineTool> {
  const check = foreignSchemas();
  const tools: Record<string, EngineTool> = {};
  for (const row of ROWS) {
    if (!serves(row.name)) continue;
    const id = row.name;
    const problems = check(row.input);
    tools[id] = async (input, caller, opts = {}) => {
      const errors = problems(input);
      if (errors.length) return refused(errors, id);
      const pick = (names: readonly string[]) => Object.fromEntries(names.filter((n) => input[n] !== undefined).map((n) => [n, input[n]]));
      const params = pick([...row.route.path, ...row.route.query]);
      const body = row.route.body.length ? pick(row.route.body) : undefined;
      const r = await run(id, { params, body, caller, signal: opts.signal });
      return r.status < 400 ? { ok: true, result: r.body } : { ok: false, problem: r.body as ProblemDocument };
    };
  }
  return tools;
}
