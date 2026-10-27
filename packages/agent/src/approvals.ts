// Approval facts and answers (PLAN ruling 5), in the chat schema's shapes (`$defs` writeFacts,
// commandFacts, answer, outcome in packages/chat/schema/chat-event.schema.json), which follow
// nclite's (container/approval-ask.ts). The gate sends facts, never a sentence, and obeys the
// outcome; how the question reads is the host's.
import { isRecord } from './record.ts';

export type WriteOp = 'create' | 'replace' | 'edit' | 'append';

export interface WriteFacts {
  kind: 'write';
  op: WriteOp;
  path: string;
  /** A short preview of the change, for the person to read. */
  preview?: string;
}

export interface CommandFacts {
  kind: 'command';
  command: string;
  /** Names of risky patterns the command matched; empty when none was recognised. */
  risks: string[];
  /** Files and folders the command names; empty when none was recognised. */
  paths: string[];
}

export type Facts = WriteFacts | CommandFacts;

/** The person's answer. */
export interface ApprovalAnswer {
  approved: boolean;
  scope?: 'once' | 'session';
}

export type ApprovalStatus = 'approved' | 'denied' | 'expired' | 'released';

/** What the gate is told: go on only when `approved` is true. */
export interface ApprovalOutcome {
  approved: boolean;
  status: ApprovalStatus;
  approvalId?: string;
  scope?: 'once' | 'session';
  asked?: false;
}

/** The CLI tools the gate pauses (Claude Code's names). Board tools are not gated (ruling 5). */
export const GATED_TOOLS = ['Write', 'Edit', 'MultiEdit', 'NotebookEdit', 'Bash'] as const;

export const PREVIEW_MAX = 2000;
export const COMMAND_MAX = 20_000;
export const PATH_MAX = 4096;
/** The chat schema's `path`: no control, line-break or text-direction character. */
const UNSAFE_PATH = /[\u0000-\u001f\u007f\u0085\u2028\u2029\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/;

type Rec = Record<string, unknown>;
const str = (v: unknown): string => (typeof v === 'string' ? v : '');

/** Cut to the preview limit, saying so. */
function clip(text: string): string {
  return text.length <= PREVIEW_MAX ? text : `${text.slice(0, PREVIEW_MAX - 1)}…`;
}

const marked = (prefix: string, text: string) => text.split('\n').map((l) => `${prefix}${l}`).join('\n');
const diff = (oldText: string, newText: string) =>
  [oldText && marked('- ', oldText), newText && marked('+ ', newText)].filter(Boolean).join('\n');

function write(op: WriteOp, path: string, preview: string): WriteFacts {
  return { kind: 'write', op, path, ...(preview.trim() !== '' && { preview: clip(preview) }) };
}

/**
 * The facts for one gated tool call, from the CLI's hook input (`tool_name`, `tool_input`, `cwd`),
 * or a reason to refuse without asking: an unknown tool, or a path or command that can't be shown
 * to the person as it is. `exists` says whether a file is there (so a Write is create or replace).
 */
export function factsFor(input: unknown, exists: (path: string) => boolean): Facts | { refuse: string } {
  if (!isRecord(input) || !isRecord(input.tool_input)) return { refuse: 'The gate could not read the tool call.' };
  const tool = str(input.tool_name);
  const args = input.tool_input;
  if (tool === 'Bash') {
    const command = str(args.command);
    if (command.trim() === '') return { refuse: 'The command was empty.' };
    if (command.length > COMMAND_MAX) return { refuse: `The command is longer than ${COMMAND_MAX} characters, too long to show the person.` };
    return { kind: 'command', command, risks: [], paths: [] };
  }
  const raw = str(tool === 'NotebookEdit' ? args.notebook_path : args.file_path);
  if (raw === '') return { refuse: `The gate does not know the tool ${tool || '(none)'}, so it was not run.` };
  const cwd = str(input.cwd);
  const path = raw.startsWith('/') || cwd === '' ? raw : `${cwd.replace(/\/+$/, '')}/${raw}`;
  if (path.length > PATH_MAX || UNSAFE_PATH.test(path)) return { refuse: 'The file path has characters that cannot be shown to the person safely.' };
  switch (tool) {
    case 'Write': return write(exists(path) ? 'replace' : 'create', path, str(args.content));
    case 'Edit': return write('edit', path, diff(str(args.old_string), str(args.new_string)));
    case 'MultiEdit': {
      const edits = Array.isArray(args.edits) ? args.edits.filter(isRecord) : [];
      return write('edit', path, edits.map((e) => diff(str(e.old_string), str(e.new_string))).join('\n\n'));
    }
    case 'NotebookEdit': return write('edit', path, marked('+ ', str(args.new_source)));
    default: return { refuse: `The gate does not know the tool ${tool || '(none)'}, so it was not run.` };
  }
}

/** The model's line when the person moved on (nclite's RELEASED_REFUSAL). */
export const RELEASED_REFUSAL = 'Not done: the person sent a new message or stopped the turn. Don\'t retry unless they ask.';

/** What the agent is told for an outcome that is not a yes, or null for a yes (nclite's refusalFor). */
export function refusalFor(outcome: ApprovalOutcome): string | null {
  if (outcome.approved) return null;
  if (outcome.status === 'released') return RELEASED_REFUSAL;
  const why = outcome.status === 'expired' ? 'nobody answered in time, and silence is a denial here' : 'the person said no';
  return `Denied: ${why}. Do not retry it, and do not work around it.`;
}
