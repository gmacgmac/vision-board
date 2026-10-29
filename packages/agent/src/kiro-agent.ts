// Kiro's agent file (N34 ruling 1): the host writes `<home>/.kiro/agents/vision-board.json` from this
// package's draft (`kiro/vision-board.agent.json`), with the prompt as an absolute `file://` path to
// the skill the host names (a global agent file cannot reach the host by a relative path, research
// finding 4). Only that file; rewritten only when its content differs, so a moved repo cannot leave
// a stale path. `kiro.ts` starts Kiro as this agent and checks it did (finding 2: a missing agent
// silently starts `kiro_default`). The caller reports a failure to write; nothing here retries.
// The file also carries the access rules (D-066; VERIFY_01 F1, `kiroAccess`): Kiro reads its working
// folder silently by default, so reads and commands are made to ask (which brings them to `verdictFor`),
// and the rows `ACCESS_RULES` refuses are denied by Kiro itself, as a second line.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AccessOp } from './access-rules.ts';
import { ACCESS_RULES, exceptionsTo } from './access-rules.ts';
import { REFUSED_PROGRAMS } from './readonly-command.ts';

/** The agent's name: its file's name and what `kiro-cli acp --agent` takes. */
export const KIRO_AGENT = 'vision-board';
/** The draft the file is made from. */
export const KIRO_AGENT_DRAFT = fileURLToPath(new URL('../kiro/vision-board.agent.json', import.meta.url));

/** Where Kiro looks for a global agent of that name. */
export const kiroAgentFile = (home: string): string => path.join(home, '.kiro', 'agents', `${KIRO_AGENT}.json`);

/** One rule of Kiro's permissions (kiro.dev/docs/permissions: `capability`, `match`, `exclude`, `effect`). */
export interface KiroRule { capability: string; match?: string[]; exclude?: string[]; effect: 'deny' | 'ask' | 'allow' }

/** A row's path as Kiro matches it: `**` + `/x` anywhere, else relative to the working folder (the board's). */
const kiroPath = (glob: string) => (glob.startsWith('**') ? glob : `./${glob}`);
const refused = (op: AccessOp) => ACCESS_RULES.filter((r) => r[op] === 'refuse');

/**
 * The access rules in Kiro's own terms, both engines. **V3** `permissions.rules` (kiro.dev/docs/permissions;
 * deny beats ask beats allow, whatever the scope): `fs_read` and `shell` ask, which overrides the default
 * silent `fs_read` on `./**`, so each read and command becomes a `session/request_permission` that
 * `verdictFor` answers (allowed inside the folder without asking the person); then a `deny` per row
 * refusing a read (`fs_read`) or a write (`fs_write`), its exceptions as `exclude`. **CLI 2.x** (engine v2,
 * kiro.dev/docs/reference/built-in-tools: "`read`, `grep`, and `glob` are trusted in the current working
 * directory", with no setting to make them ask): `toolsSettings` `read`, `grep`, `glob` `deniedPaths` for
 * every row refusing a read (`.env.*` with `.env.example`, since 2.x has no exception), `write`
 * `deniedPaths` for the rows refusing a write that have none, and `shell` `autoAllowReadonly: false`.
 */
export function kiroAccess(): { rules: KiroRule[]; toolsSettings: Record<string, Record<string, unknown>> } {
  const rules: KiroRule[] = [
    { capability: 'fs_read', match: ['**'], effect: 'ask' },
    { capability: 'shell', match: ['*'], effect: 'ask' },
  ];
  for (const [op, capability] of [['read', 'fs_read'], ['write', 'fs_write']] as const) {
    for (const row of refused(op)) {
      const exclude = exceptionsTo(row, op).map((r) => kiroPath(r.path));
      rules.push({ capability, match: [kiroPath(row.path)], ...(exclude.length > 0 && { exclude }), effect: 'deny' });
    }
  }
  // Shell patterns: `*` matches any characters (kiro.dev/docs/permissions); 2.x commands are anchored regexes.
  rules.push({ capability: 'shell', match: REFUSED_PROGRAMS.flatMap((p) => [p, `${p} *`]), effect: 'deny' });
  const reads = { deniedPaths: refused('read').map((r) => kiroPath(r.path)) };
  const writes = { deniedPaths: refused('write').filter((r) => exceptionsTo(r, 'write').length === 0).map((r) => kiroPath(r.path)) };
  return { rules, toolsSettings: { read: reads, grep: reads, glob: reads, write: writes, shell: { autoAllowReadonly: false, deniedCommands: REFUSED_PROGRAMS.map((p) => `${p}(\\s.*)?`) } } };
}

/** The file's text: the draft with `prompt` pointing at `promptFile`, an absolute path, and the access
 * rules (`kiroAccess`) after the draft's own rules. */
export function kiroAgentText(promptFile: string): string {
  if (!path.isAbsolute(promptFile)) throw new Error(`The Kiro agent's prompt must be an absolute path, not ${promptFile}`);
  const draft = JSON.parse(readFileSync(KIRO_AGENT_DRAFT, 'utf8')) as Record<string, unknown> & { permissions: { rules: KiroRule[] } };
  const access = kiroAccess();
  const permissions = { ...draft.permissions, rules: [...draft.permissions.rules, ...access.rules] };
  return `${JSON.stringify({ ...draft, prompt: `file://${promptFile}`, permissions, toolsSettings: access.toolsSettings }, null, 2)}\n`;
}

const current = (file: string): string | undefined => {
  try { return readFileSync(file, 'utf8'); } catch { return undefined; }
};

/** Write the agent file under `home` unless it already says the same; `written` says whether it did.
 * Throws when it cannot be written (the host says so where Kiro is chosen). */
export function writeKiroAgent(home: string, promptFile: string): { file: string; written: boolean } {
  const file = kiroAgentFile(home);
  const text = kiroAgentText(promptFile);
  if (current(file) === text) return { file, written: false };
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, text);
  return { file, written: true };
}

/** The model when the host names none (ruling 3: never Kiro's `auto`), and the effort for both. */
export const KIRO_DEFAULT_MODEL = 'claude-opus-5.5';
export const KIRO_EFFORT = 'high';

type Rec = Record<string, unknown>;
const rec = (v: unknown): Rec => (typeof v === 'object' && v !== null ? v as Rec : {});
const modelId = (m: unknown): string => (typeof m === 'string' ? m : String(rec(m).modelId ?? rec(m).id ?? ''));

/** What is wrong with the session Kiro opened (`session/new`'s or `session/load`'s answer), or null:
 * it is not the vision-board agent, or it does not offer `model`. `strict` (a new session) also
 * refuses an answer that says neither; a loaded session is checked on what it says. */
export function sessionProblem(answer: unknown, model: string, strict: boolean): string | null {
  const { modes, models } = rec(answer);
  const mode = rec(modes).currentModeId;
  if ((strict || modes !== undefined) && mode !== KIRO_AGENT) {
    return `Kiro started as ${typeof mode === 'string' ? mode : 'an unknown agent'}, not the ${KIRO_AGENT} agent. `
      + `Kiro looks for it in ~/.kiro/agents/${KIRO_AGENT}.json, which the board writes when it starts: restart the board, or check that file.`;
  }
  const offered = rec(models).availableModels;
  if (!strict && models === undefined) return null;
  const ids = Array.isArray(offered) ? offered.map(modelId).filter(Boolean) : [];
  return ids.includes(model) ? null : `Kiro does not offer the model ${model} here. It offers: ${ids.join(', ') || 'none it named'}.`;
}
