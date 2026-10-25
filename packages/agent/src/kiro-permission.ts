// Kiro's `session/request_permission` as the board's approval (PLAN ruling 5): what Kiro asks
// before a tool runs becomes the same facts the Claude gate sends (a file change, or a command),
// the person's answer comes back as the option Kiro offered. The adapter decides in three ways:
// the board's own tools and plain reading go ahead without asking (as Claude's allowed tools do);
// a file change or a command asks the person; anything else is refused, because the panel has no
// way to show it. Only a one-time option is ever chosen, so Kiro keeps no trust of its own from us:
// "for this session" is the board server's to remember.
import type { Facts } from './approvals.ts';
import { factsFor } from './approvals.ts';

type Rec = Record<string, unknown>;
const isRec = (v: unknown): v is Rec => typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (v: unknown): string => (typeof v === 'string' ? v : '');

/** What to do with one permission request. */
export type Verdict = { allow: true } | { ask: Facts } | { refuse: string };

export interface PermissionRequest {
  sessionId: string;
  toolCall: Rec;
  /** For an MCP tool, the server it belongs to (Kiro: `_meta.mcpToolIdentity.serverName`). */
  server?: string;
  options: { optionId: string; name: string; kind: string }[];
}

/** The request's shape, or null when it is not one we can answer. */
export function readRequest(params: unknown): PermissionRequest | null {
  if (!isRec(params) || !isRec(params.toolCall) || !Array.isArray(params.options)) return null;
  const options = params.options.flatMap((o) =>
    isRec(o) && typeof o.optionId === 'string' && typeof o.kind === 'string' ? [{ optionId: o.optionId, name: str(o.name), kind: o.kind }] : []);
  const identity = isRec(params._meta) && isRec(params._meta.mcpToolIdentity) ? str(params._meta.mcpToolIdentity.serverName) : '';
  return { sessionId: str(params.sessionId), toolCall: params.toolCall, options, ...(identity !== '' && { server: identity }) };
}

/** The option to answer with: the one-time allow or the one-time reject; null when not offered. */
export function pickOption(options: PermissionRequest['options'], approved: boolean): string | null {
  return options.find((o) => o.kind === (approved ? 'allow_once' : 'reject_once'))?.optionId ?? null;
}

/** The answer to a permission request: the chosen option, or "cancelled" when none fits. */
export const outcome = (optionId: string | null) =>
  ({ outcome: optionId === null ? { outcome: 'cancelled' } : { outcome: 'selected', optionId } });

/** `{ type: 'diff', path, oldText, newText }` entries of a tool call's content. */
const diffs = (content: unknown): Rec[] =>
  (Array.isArray(content) ? content.filter((c): c is Rec => isRec(c) && c.type === 'diff' && typeof c.path === 'string') : []);

/**
 * What to do for `toolCall` (an ACP tool call with its `kind`, `locations`, `content` and
 * `rawInput`). `own` says whether the tool is one of the board's own (the `vision-board` server's).
 */
export function verdictFor(toolCall: Rec, own: boolean, cwd: string, exists: (path: string) => boolean): Verdict {
  if (own) return { allow: true };
  const kind = str(toolCall.kind);
  if (kind === 'read' || kind === 'search' || kind === 'think') return { allow: true };
  const input = isRec(toolCall.rawInput) ? toolCall.rawInput : {};
  if (kind === 'execute') {
    const asked = factsFor({ tool_name: 'Bash', tool_input: { command: str(input.command) }, cwd }, exists);
    return 'refuse' in asked ? asked : { ask: asked };
  }
  if (kind === 'edit' || kind === 'delete' || kind === 'move') {
    const [change] = diffs(toolCall.content);
    const loc = Array.isArray(toolCall.locations) && isRec(toolCall.locations[0]) ? str(toolCall.locations[0].path) : '';
    const file = change ? str(change.path) : loc || str(input.path) || str(input.file_path);
    if (file === '') return { refuse: 'The file change did not say which file, so it was refused.' };
    // The change as a diff when Kiro sent one; else from the tool's own input (create, or replace some text).
    const before = change ? str(change.oldText) : str(input.oldStr ?? input.old_str);
    const after = change ? str(change.newText) : str(input.content ?? input.fileText ?? input.newStr ?? input.new_str);
    const edits = before !== '' || (!change && (input.newStr !== undefined || input.new_str !== undefined));
    const hook = edits
      ? { tool_name: 'Edit', tool_input: { file_path: file, old_string: before, new_string: after } }
      : { tool_name: 'Write', tool_input: { file_path: file, content: after } };
    const asked = factsFor({ ...hook, cwd }, exists);
    return 'refuse' in asked ? asked : { ask: asked };
  }
  return { refuse: `The board cannot show a ${kind || 'tool'} request to the person, so it was refused.` };
}
