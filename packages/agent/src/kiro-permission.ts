// Kiro's `session/request_permission` as the board's approval (PLAN ruling 5): what Kiro asks
// before a tool runs becomes the same facts the Claude gate sends (a file change, or a command),
// the person's answer comes back as the option Kiro offered. The board's own tools go ahead; a read,
// a search, a file change or a command is decided by the access rules first (`policy`, D-066), as the
// Claude gate's are: refused (said why), allowed without asking, or asked of the person; anything else
// is refused, because the panel has no way to show it. Only a one-time option is ever chosen, so Kiro
// keeps no trust of its own from us: "for this session" is the board server's to remember.
import type { OpenLedger } from './access-rules.ts';
import type { Facts } from './approvals.ts';
import { factsFor } from './approvals.ts';
import { policy } from './policy.ts';
import { isRecord } from './record.ts';

type Rec = Record<string, unknown>;
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
  if (!isRecord(params) || !isRecord(params.toolCall) || !Array.isArray(params.options)) return null;
  const options = params.options.flatMap((o) =>
    isRecord(o) && typeof o.optionId === 'string' && typeof o.kind === 'string' ? [{ optionId: o.optionId, name: str(o.name), kind: o.kind }] : []);
  const identity = isRecord(params._meta) && isRecord(params._meta.mcpToolIdentity) ? str(params._meta.mcpToolIdentity.serverName) : '';
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
  (Array.isArray(content) ? content.filter((c): c is Rec => isRecord(c) && c.type === 'diff' && typeof c.path === 'string') : []);

/** Every path a tool call names: its locations, then its input's `path`, `file_path`, `destination` and
 * each of `operations`' (Kiro's read), so a move or a many-file read is judged on all of them. */
function pathsOf(toolCall: Rec, input: Rec): string[] {
  const locs = Array.isArray(toolCall.locations) ? toolCall.locations.filter(isRecord).map((l) => str(l.path)) : [];
  const ops = Array.isArray(input.operations) ? input.operations.filter(isRecord).map((o) => str(o.path)) : [];
  return [...locs, str(input.path), str(input.file_path), str(input.destination), str(input.target), ...ops].filter((p) => p !== '');
}

/** The rules' verdict on `facts`, and on every other path the call names (`also`, judged as `facts`' kind). */
function judged(facts: Facts, also: string[], cwd: string, strict: boolean, ledger?: OpenLedger): Verdict {
  let asks = false;
  for (const f of [facts, ...also.map((path): Facts => (facts.kind === 'write' ? { ...facts, path } : { kind: 'read', path }))]) {
    const d = policy(f, cwd, { strict, ledger });
    if ('refuse' in d) return d;
    if ('ask' in d) asks = true;
  }
  return asks ? { ask: facts } : { allow: true };
}

/**
 * What to do for `toolCall` (an ACP tool call with its `kind`, `locations`, `content` and
 * `rawInput`). `own` says whether the tool is one of the board's own (the `vision-board` server's).
 * `cwd` is the board's folder, which the access rules are relative to; `ledger`, the open ledger, whose pictures and
 * apps a write is asked of the board (it knows whether the ledger may be written now); `strict`, the `agentAccessRules`
 * flag off (nothing goes ahead unasked).
 */
export function verdictFor(toolCall: Rec, own: boolean, cwd: string, exists: (path: string) => boolean, strict = false, ledger?: OpenLedger): Verdict {
  if (own) return { allow: true };
  const kind = str(toolCall.kind);
  if (kind === 'think') return { allow: true };
  const input = isRecord(toolCall.rawInput) ? toolCall.rawInput : {};
  if (kind === 'read' || kind === 'search') {
    const named = pathsOf(toolCall, input);
    if (named.length === 0 && kind === 'read') return { refuse: 'The read did not say which file, so it was refused.' };
    const asked = factsFor({ tool_name: kind === 'read' ? 'Read' : 'Grep', tool_input: { file_path: named[0], path: named[0] ?? '' }, cwd }, exists);
    return 'refuse' in asked ? asked : judged(asked, named.slice(1), cwd, strict, ledger);
  }
  if (kind === 'execute') {
    const asked = factsFor({ tool_name: 'Bash', tool_input: { command: str(input.command) }, cwd }, exists);
    return 'refuse' in asked ? asked : judged(asked, [], cwd, strict, ledger);
  }
  if (kind === 'edit' || kind === 'delete' || kind === 'move') {
    const [change] = diffs(toolCall.content);
    const loc = Array.isArray(toolCall.locations) && isRecord(toolCall.locations[0]) ? str(toolCall.locations[0].path) : '';
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
    const others = pathsOf(toolCall, input).filter((p) => p !== file).map((p) => (p.startsWith('/') ? p : `${cwd}/${p}`));
    return 'refuse' in asked ? asked : judged(asked, others, cwd, strict, ledger);
  }
  return { refuse: `The board cannot show a ${kind || 'tool'} request to the person, so it was refused.` };
}
