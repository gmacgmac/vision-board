// The engine's tools, in MCP's shapes (D-074 rule 4): `list()` is one tool per agent operation the
// generated tool table marks `plugin` (`toolRows`, gen-api.mjs, from openapi.json's `x-hosts`: what a plugin
// bot gets), named as the MCP server names them, and `call(name, input, ctx)` answers MCP's `CallToolResult`, so each host chooses its transport
// (`createMcpServer({ tools })` serves it as is; a host's own MCP server can wrap it). A call checks its
// input against the table's JSON Schema, splits it back into the operation's path, query and body by the
// table's `route`, and runs the operation with the caller its host passes (a host that knows the agent,
// nclite's run ticket, passes it; no secret, no `join`). Its text is the operation's JSON, and a problem
// is `isError` with words, as `vb-mcp` answers them (`answerResult`, `problemResult`). A board write also
// says what it changed in `_meta` (`TOOL_CHANGE`), the one shape any host reads for a change chip; a CLI's
// stream, which carries only the text, reads the same facts from it (#agent `boardWriteSummary`). The tools
// marked `standalone` alone are left out: `list_apps` (the app host's), `read_attachment` (beside its chat)
// and `join` (the host says who is calling; its `route` still takes `join`, to register its bot once). With the
// `botToolRules` flag (on), an input the table gives other hosts only (`inputHosts`: `check_responses`'s `wait`) is
// left out of the listed schema and refused with words when sent, and `instructions` holds the plugin's (words/plugin-tools.ts).
import { BOARD_WRITE, boardWriteSummary } from '#agent';
import type { FlagOverrides, OperationId, ProblemDocument } from '#format';
import { flagOn } from '#format';
import type { ListedTool, ToolResult } from '#mcp';
import { answerResult, INSTRUCTIONS_JOINED, problemResult, unknownToolResult } from '#mcp';
import type { Caller } from '../ledger.ts';
import { problem } from '../problem.ts';
import { toolRows } from '../format-files.ts';
import { foreignSchemas } from '../schema.ts';
import * as httpWords from '../words/http.ts';
import { descriptionEdits, inputEdits, inputRefusals, instructionEdits, ruleEdits } from '../words/plugin-tools.ts';

/** One row of the tool table, as the engine reads it. */
interface ToolRow {
  name: string;
  title: string;
  description: string;
  input: Record<string, unknown>;
  route: { path: string[]; query: string[]; body: string[] };
  hosts: string[];
  /** The inputs only some hosts give, and those hosts (an input's `x-hosts`). */
  inputHosts?: Record<string, string[]>;
}

/** The `_meta` key of what a board write changed: `{ board, cards, head }`, the card numbers it drew
 * or changed and the ledger's head after it. */
export const TOOL_CHANGE = 'vb/change';

/** What a call runs with: the caller from the host, and a signal that ends a held read
 * (`check_responses` with `wait`). */
export interface ToolContext { caller?: Caller | undefined; signal?: AbortSignal | undefined }

/** The engine's tools, in MCP's shapes. An error is a result with `isError`: `call` does not throw. */
export interface EngineTools {
  /** Each tool's name, words and input as JSON Schema. */
  list(): readonly ListedTool[];
  call(name: string, input: Record<string, unknown>, ctx?: ToolContext): Promise<ToolResult>;
  /** What the MCP server tells a bot before its first call (`createMcpServer({ tools })` sends it): the plugin's
   * instructions, with no `join`, secret or `wait`. A host's own MCP server may send it too. With the `botToolRules`
   * flag off it is left out, and `createMcpServer` sends standalone's joined text, as before. */
  readonly instructions?: string;
}

/** Run operation `id` with plain inputs: the engine's one way in, under both `route` and the tools. */
export type RunOp = (id: OperationId, input: {
  params: Record<string, unknown>; body: unknown; caller: Caller | undefined; signal: AbortSignal | undefined;
}) => Promise<{ status: number; body: unknown }>;

const ROWS = toolRows() as readonly ToolRow[];

/** `text` with each edit made, each `from` found exactly once (`what` names the text in the error). */
const edited = (text: string, edits: readonly { from: string; to: string }[], what: string): string => edits.reduce((t, { from, to }) => {
  if (t.split(from).length !== 2) throw new Error(`${what} must hold ${JSON.stringify(from)} once`);
  return t.replace(from, () => to);
}, text);

/** A tool's description as a plugin bot reads it (words/plugin-tools.ts): what only the standalone bot has is taken
 * out, and with the rules on, what a host's bot may not do. */
function forPlugin(row: ToolRow, rules: boolean): string {
  const edits = [...descriptionEdits, ...(rules ? ruleEdits : [])].filter((e) => e.tool === row.name);
  return edited(row.description, edits, row.name);
}

/** The inputs of `row` a plugin bot is not given (none with the rules off). */
const notGiven = (row: ToolRow, rules: boolean): string[] =>
  (rules ? Object.entries(row.inputHosts ?? {}).filter(([, hosts]) => !hosts.includes('plugin')).map(([name]) => name) : []);

/** A tool's input as a plugin bot reads it and as its calls are checked: the inputs it is not given left out. */
function givenInput(row: ToolRow, rules: boolean): Record<string, unknown> {
  const gone = notGiven(row, rules);
  if (!gone.length) return row.input;
  const { properties, required, ...rest } = row.input as { properties: Record<string, unknown>; required?: string[] };
  const kept = (required ?? []).filter((n) => !gone.includes(n));
  return { ...rest, properties: Object.fromEntries(Object.entries(properties).filter(([n]) => !gone.includes(n))), ...(kept.length > 0 && { required: kept }) };
}

/** A tool's input as a plugin bot reads it: its words edited the same way; what it accepts is `givenInput`. */
function inputForPlugin(row: ToolRow, input: Record<string, unknown>): Record<string, unknown> {
  const edits = inputEdits.filter((e) => e.tool === row.name);
  if (!edits.length) return input;
  return JSON.parse(edits.reduce((text, { from, to }) => {
    if (!text.includes(from)) throw new Error(`${row.name}'s input must hold ${JSON.stringify(from)}`);
    return text.replaceAll(from, () => to);
  }, JSON.stringify(input))) as Record<string, unknown>;
}

/** The refusal of an input a host does not give, sent anyway: `invalid`, with the words for that input. */
function refusedInput(tool: string, name: string): ToolResult {
  const words = inputRefusals.find((r) => r.tool === tool && r.input === name);
  if (!words) throw new Error(`words/plugin-tools.ts inputRefusals has no words for ${tool}.${name}`);
  return problemResult(problem('invalid', words.detail, { errors: [{ pointer: `/${name}`, detail: words.pointer }] }).body);
}

/** A board write's result, with what it changed. */
function withChange(name: string, input: Record<string, unknown>, result: ToolResult): ToolResult {
  if (name !== BOARD_WRITE || result.isError) return result;
  return { ...result, _meta: { [TOOL_CHANGE]: { board: input.board, ...boardWriteSummary(result.content) } } };
}

/** The tools a plugin bot gets (`x-hosts`), each running through `run`; `serves` holds what the engine can run;
 * `flags`, the engine's (`botToolRules`). */
export function makeTools(serves: (id: string) => id is OperationId, run: RunOp, flags: FlagOverrides = {}): EngineTools {
  const rules = flagOn('botToolRules', flags);
  const check = foreignSchemas();
  const rows = new Map(ROWS.flatMap((row) => {
    if (!row.hosts.includes('plugin') || !serves(row.name)) return [];
    const input = givenInput(row, rules);
    return [[row.name as string, { row, id: row.name, input, gone: notGiven(row, rules), problems: check(input) }] as const];
  }));
  const listed: readonly ListedTool[] = [...rows.values()].map(({ row, input }) => ({ name: row.name, title: row.title, description: forPlugin(row, rules), inputSchema: inputForPlugin(row, input) }));
  return {
    list: () => listed,
    ...(rules && { instructions: edited(INSTRUCTIONS_JOINED, instructionEdits, 'INSTRUCTIONS_JOINED') }),
    async call(name, input, { caller, signal } = {}) {
      const tool = rows.get(name);
      if (!tool) return unknownToolResult(name);
      const sent = tool.gone.find((n) => input[n] !== undefined);
      if (sent !== undefined) return refusedInput(name, sent);
      const errors = tool.problems(input);
      if (errors.length) return problemResult(problem('invalid', httpWords.theInputDoesNotFit(name), { errors }).body);
      const pick = (names: readonly string[]) => Object.fromEntries(names.filter((n) => input[n] !== undefined).map((n) => [n, input[n]]));
      const params = pick([...tool.row.route.path, ...tool.row.route.query]);
      const body = tool.row.route.body.length ? pick(tool.row.route.body) : undefined;
      const r = await run(tool.id, { params, body, caller, signal });
      return r.status < 400 ? withChange(name, input, answerResult(r.body)) : problemResult(r.body as ProblemDocument);
    },
  };
}
