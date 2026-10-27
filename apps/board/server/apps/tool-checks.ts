// An app's tools as the board checks them (D-047 ruling 6, apps.md § The tools module): each tool
// the module says it has must fit the manifest schema's `$defs/tool`, and its input and output
// schemas must compile; the arguments of a call are checked against `inputSchema` before it runs,
// and the answer against `outputSchema` after. An answer becomes MCP's tool result: an object is
// `structuredContent` and its JSON the text; text is the text; a thrown error is `isError`.
import type { AppProblem, AppToolInfo, AppToolResult } from '#format';
import { problem, sizeWords } from '../problem.ts';
import type { SchemaProblem } from '../schema.ts';
import { foreignSchemas, schemaProblems } from '../schema.ts';
import type { Answer } from './child.ts';
import { fieldWords, MANIFEST_ID } from './manifest.ts';
import * as appsSupervisorWords from '../words/apps-supervisor.ts';
import { isRecord } from '#format';

const TOOL_ID = `${MANIFEST_ID}#/$defs/tool`;

/** One tool, checked: its shape, and the checks of its arguments and its answer. */
export interface CheckedTool { info: AppToolInfo; input: (v: unknown) => SchemaProblem[]; output?: (v: unknown) => SchemaProblem[] }

const said = (ps: SchemaProblem[]) => ps.map((p) => p.detail).join('; ');

/** The tools by name, in the module's order; or what is wrong with them, for the agent. */
export function checkTools(infos: unknown[], file: string): Map<string, CheckedTool> | AppProblem[] {
  const problems: AppProblem[] = [];
  const tools = new Map<string, CheckedTool>();
  const compile = foreignSchemas();
  infos.forEach((info, i) => {
    const label = isRecord(info) && typeof info.name === 'string' ? `"${info.name}"` : appsSupervisorWords.number(i + 1);
    const shape = schemaProblems(TOOL_ID, info);
    if (shape.length) return void problems.push({ file, detail: appsSupervisorWords.tool(label, shape.map(fieldWords).join('; ')) });
    const tool = info as AppToolInfo;
    try {
      tools.set(tool.name, { info: tool, input: compile(tool.inputSchema), ...(tool.outputSchema && { output: compile(tool.outputSchema) }) });
    } catch (err) {
      problems.push({ file, detail: appsSupervisorWords.toolASchemaOfIt(label, err instanceof Error ? err.message : String(err)) });
    }
  });
  return problems.length ? problems : tools;
}

/** The arguments of a call, checked against the tool's `inputSchema`; `invalid` when they don't fit,
 * each fault pointed at in the request body. */
export function checkInput(app: string, tool: CheckedTool, input: unknown): void {
  const faults = tool.input(input);
  if (!faults.length) return;
  throw problem('invalid', appsSupervisorWords.theArgumentsDonTFit(tool.info.name, app, said(faults)), {
    errors: faults.map((p) => ({ pointer: `/arguments${p.pointer}`, detail: p.detail })),
  });
}

/** A tool's answer as MCP's tool result; a problem when the answer is refused. */
export function resultOf(app: string, tool: CheckedTool, answer: Exclude<Answer, { ended: unknown }>, outputBytes: number): AppToolResult {
  const name = appsSupervisorWords.theToolOfTheApp2(tool.info.name, app);
  const tooLarge = () => problem('too-large', appsSupervisorWords.answeredMoreThanAnswerLess(name, sizeWords(outputBytes)));
  if ('error' in answer) return { content: [{ type: 'text', text: answer.error }], isError: true };
  if ('refused' in answer) {
    if (answer.refused === 'too-large') throw tooLarge();
    throw problem('app-failed', appsSupervisorWords.answeredSomethingThatIsNot(name));
  }
  const { result } = answer;
  const text = typeof result === 'string' ? result : JSON.stringify(result);
  if (text !== undefined && Buffer.byteLength(text) > outputBytes) throw tooLarge();
  const off = tool.output?.(result) ?? [];
  if (off.length) throw problem('app-failed', appsSupervisorWords.answeredSomethingItsOutputSchemaRefuses(name, said(off)));
  if (typeof result === 'string') return { content: [{ type: 'text', text: result }], isError: false };
  if (isRecord(result)) return { content: [{ type: 'text', text: text! }], structuredContent: result, isError: false };
  throw problem('app-failed', appsSupervisorWords.answeredAnswerAnObjectOr(name, result === undefined));
}
