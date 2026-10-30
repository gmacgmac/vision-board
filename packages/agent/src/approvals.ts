// Approval facts and answers (PLAN ruling 5), in the chat schema's shapes (`$defs` writeFacts,
// commandFacts, answer, outcome in packages/chat/schema/chat-event.schema.json), which follow
// nclite's (container/approval-ask.ts). The gate sends facts, never a sentence, and obeys the
// outcome; how the question reads is the host's. A read (`Read`, `Glob`, `Grep`) has facts too: the
// access rules (policy.ts) decide it, and only one they ask about reaches the person. What a remembered
// yes covers is `coverOf`: a write's folder, a read's file, a search's folder, a command's first words (D-066).
import path from 'node:path';
import type { PathReader } from './policy.ts';
import { resolveIn } from './policy.ts';
import { rememberedHead } from './readonly-command.ts';
import { isRecord } from './record.ts';
import * as words from './words/agent-access.ts';

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
  /** The shell's working folder, when it is not the board's: what the command's relative words are judged from. */
  cwd?: string;
}

/** A file the agent is about to read, or with `recursive` every file under a folder (a search). */
export interface ReadFacts {
  kind: 'read';
  path: string;
  recursive?: boolean;
}

export type Facts = WriteFacts | CommandFacts | ReadFacts;

/** How long a yes holds: this call, the session, or the board's folder (remembered; never outside it). */
export type AskScope = 'once' | 'session' | 'folder';

/** The person's answer. */
export interface ApprovalAnswer {
  approved: boolean;
  scope?: AskScope;
}

export type ApprovalStatus = 'approved' | 'denied' | 'expired' | 'released';

/** What the gate is told: go on only when `approved` is true. */
export interface ApprovalOutcome {
  approved: boolean;
  status: ApprovalStatus;
  approvalId?: string;
  scope?: AskScope;
  asked?: false;
}

/** Claude Code's reading tools: the gate decides them too, by the access rules (most go unasked). */
export const READ_TOOLS = ['Read', 'Glob', 'Grep'] as const;
/** The CLI tools the gate decides (Claude Code's names). Board tools are not gated (ruling 5). */
export const GATED_TOOLS = ['Write', 'Edit', 'MultiEdit', 'NotebookEdit', 'Bash', ...READ_TOOLS] as const;

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

const WILD = /[*?[{]/;
/** A glob's folder: its parts before the first wildcard (`src/**\/*.ts` is `src`, `/etc/*` is `/etc`). */
function globRoot(pattern: string): string {
  const parts = pattern.split('/');
  const i = parts.findIndex((p) => WILD.test(p));
  const root = (i < 0 ? parts.slice(0, -1) : parts.slice(0, i)).join('/');
  return root === '' && pattern.startsWith('/') ? '/' : root;
}

/** `raw` against the working folder, or a refusal when it can't be shown to the person as it is. */
function placed(raw: string, cwd: string): string | { refuse: string } {
  const p = raw.startsWith('/') || cwd === '' ? raw : `${cwd.replace(/\/+$/, '')}${raw === '' ? '' : `/${raw}`}`;
  return p.length > PATH_MAX || UNSAFE_PATH.test(p) ? { refuse: 'The file path has characters that cannot be shown to the person safely.' } : p;
}

/** A reading tool's facts: Read a file; Glob lists the names under its pattern's folder; Grep reads every file under its path. */
function readFacts(tool: string, args: Rec, cwd: string): ReadFacts | { refuse: string } {
  const pattern = str(args.pattern);
  const raw = tool === 'Read' ? str(args.file_path) : tool === 'Glob' && globRoot(pattern) !== ''
    ? (globRoot(pattern).startsWith('/') ? globRoot(pattern) : [str(args.path) || '.', globRoot(pattern)].join('/'))
    : str(args.path);
  if (tool === 'Read' && raw === '') return { refuse: words.noPath };
  const at = placed(raw, cwd);
  if (typeof at !== 'string') return at;
  return { kind: 'read', path: at === '' ? '.' : at, ...(tool === 'Grep' && { recursive: true }) };
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
  const cwd = str(input.cwd);
  if ((READ_TOOLS as readonly string[]).includes(tool)) return readFacts(tool, args, cwd);
  const raw = str(tool === 'NotebookEdit' ? args.notebook_path : args.file_path);
  if (raw === '') return { refuse: `The gate does not know the tool ${tool || '(none)'}, so it was not run.` };
  const file = placed(raw, cwd);
  if (typeof file !== 'string') return file;
  switch (tool) {
    case 'Write': return write(exists(file) ? 'replace' : 'create', file, str(args.content));
    case 'Edit': return write('edit', file, diff(str(args.old_string), str(args.new_string)));
    case 'MultiEdit': {
      const edits = Array.isArray(args.edits) ? args.edits.filter(isRecord) : [];
      return write('edit', file, edits.map((e) => diff(str(e.old_string), str(e.new_string))).join('\n\n'));
    }
    case 'NotebookEdit': return write('edit', file, marked('+ ', str(args.new_source)));
    default: return { refuse: `The gate does not know the tool ${tool || '(none)'}, so it was not run.` };
  }
}

/** The model's line when the person moved on (nclite's RELEASED_REFUSAL). */
export const RELEASED_REFUSAL = 'Not done: the person sent a new message or stopped the turn. Don\'t retry unless they ask.';

/** The model's line when the host's access rules refused it and nobody was asked. */
export const RULES_REFUSAL = words.refusedByTheRules;

/** What the agent is told for an outcome that is not a yes, or null for a yes (nclite's refusalFor). */
export function refusalFor(outcome: ApprovalOutcome): string | null {
  if (outcome.approved) return null;
  if (outcome.status === 'released') return RELEASED_REFUSAL;
  if (outcome.asked === false) return RULES_REFUSAL;
  const why = outcome.status === 'expired' ? 'nobody answered in time, and silence is a denial here' : 'the person said no';
  return `Denied: ${why}. Do not retry it, and do not work around it.`;
}

/** What a remembered yes covers: writes in a folder, reads of one file (or one folder's listing),
 * searches of a folder, or a command's first words. Paths by where they really lead. */
export type Cover = { kind: 'write' | 'read' | 'search'; path: string } | { kind: 'command'; head: string };

/**
 * The cover of a yes for `facts` in the board's `folder`, or null when a yes for it is never kept: a
 * command `rememberedHead` won't remember, or a path that can't be followed. A write's yes covers
 * writes in that file's folder (not its subfolders, D-066 6); a read's, that file only (a yes to read
 * one file outside the folder never opens its neighbours, such as a home folder's dotfiles); a
 * search's, searches of that folder.
 */
export function coverOf(facts: Facts, folder: string, reader?: PathReader): Cover | null {
  if (facts.kind === 'command') {
    const head = rememberedHead(facts.command);
    return head === null ? null : { kind: 'command', head };
  }
  try {
    const at = resolveIn(folder, facts.path, reader);
    if (facts.kind === 'write') return { kind: 'write', path: path.dirname(at.abs) };
    return { kind: facts.recursive && at.stat?.isDirectory() ? 'search' : 'read', path: at.abs };
  } catch {
    return null;
  }
}
