// The skill copied into each installed client (D-118, `npm run skill:install`, and the board at start). A client is
// installed when its own folder exists under home; its `skills/vision-board` is ours, so it is replaced whole: copied
// into a temporary sibling, then swapped in, never half a copy. What ships is the build's (`build.mjs` `buildSkill`:
// the skill and the references its text names) plus `examples/` when a shipped file names it; never NOTES.md,
// scenarios.md or source/. A skill that is not what `npm run build:skill` writes is refused (`stale`). Then each
// installed client's MCP server is reported (skill-mcp.ts), and added only with `addMcp`, the person's yes.
import fs from 'node:fs';
import path from 'node:path';
import { buildSkill, stale, STANDALONE_DIR } from '../../../skills/vision-board/source/build.mjs';
import type { McpEntry, Runner } from './skill-mcp.ts';
import { MCP_FILES, MCP_MARK, addMcp, claudeAddArgs, mcpStatus, shellLine } from './skill-mcp.ts';
import * as binWords from './words/bin.ts';

export type ClientId = 'claude' | 'kiro' | 'crew';
/** The clients, each by its own folder under home; its skills are in that folder's `skills/`. */
export const CLIENTS: readonly { id: ClientId; folder: string }[] = [
  { id: 'claude', folder: '.claude' },
  { id: 'kiro', folder: '.kiro' },
  { id: 'crew', folder: path.join('.kiro', 'crew') },
];
export const SKILL_NAME = 'vision-board';
export const skillTarget = (home: string, folder: string): string => path.join(home, folder, 'skills', SKILL_NAME);
const isDir = (p: string): boolean => fs.statSync(p, { throwIfNoEntry: false })?.isDirectory() ?? false;

/** Every file under `root`/`rel`, relative to `root`, dotfiles left out. */
function filesUnder(root: string, rel = ''): string[] {
  return fs.readdirSync(path.join(root, rel), { withFileTypes: true }).filter((e) => !e.name.startsWith('.')).flatMap((e) => {
    const at = rel ? `${rel}/${e.name}` : e.name;
    return e.isDirectory() ? filesUnder(root, at) : [at];
  });
}

/** The files of `skillDir` a client gets: the build's, and `examples/` when one of them names it. */
export function skillFiles(skillDir: string = STANDALONE_DIR): string[] {
  const built = Object.keys(buildSkill('standalone'));
  const named = built.some((f) => fs.readFileSync(path.join(skillDir, f), 'utf8').includes('examples/'));
  return [...built, ...(named && isDir(path.join(skillDir, 'examples')) ? filesUnder(skillDir, 'examples') : [])];
}

/** Whether the copy at `target` is missing, or not exactly `files` of `skillDir` (dotfiles such as .DS_Store aside). */
export function copyDiffers(target: string, skillDir: string, files: string[]): boolean {
  if (!isDir(target)) return true;
  const have = filesUnder(target);
  if (have.length !== files.length || have.some((f) => !files.includes(f))) return true;
  return files.some((f) => !fs.readFileSync(path.join(target, f)).equals(fs.readFileSync(path.join(skillDir, f))));
}

const LEFTOVER = new RegExp(`^\\.${SKILL_NAME}\\.\\d+\\.(?:tmp|old)$`);

/** Replace `target` whole with `files` of `skillDir`: copied into a temporary sibling, then swapped in; on a failure the
 * temporary copy goes and the old folder (or link) stays. Leftovers of a run that was killed are removed first. */
export function replaceFolder(target: string, skillDir: string, files: string[]): void {
  const parent = path.dirname(target);
  fs.mkdirSync(parent, { recursive: true });
  for (const name of fs.readdirSync(parent)) if (LEFTOVER.test(name)) fs.rmSync(path.join(parent, name), { recursive: true, force: true });
  const tmp = path.join(parent, `.${SKILL_NAME}.${process.pid}.tmp`);
  const old = path.join(parent, `.${SKILL_NAME}.${process.pid}.old`);
  try {
    for (const f of files) {
      fs.mkdirSync(path.dirname(path.join(tmp, f)), { recursive: true });
      fs.copyFileSync(path.join(skillDir, f), path.join(tmp, f));
    }
  } catch (err) {
    fs.rmSync(tmp, { recursive: true, force: true });
    throw err;
  }
  const had = fs.lstatSync(target, { throwIfNoEntry: false }) !== undefined;
  if (had) fs.renameSync(target, old);
  try { fs.renameSync(tmp, target); } catch (err) {
    if (had) fs.renameSync(old, target);
    fs.rmSync(tmp, { recursive: true, force: true });
    throw err;
  }
  if (had) fs.rmSync(old, { recursive: true, force: true });
}

type Client = { id: ClientId; folder: string };
export type CopyOutcome = (Client & { status: 'copied' }) | (Client & { status: 'skipped' }) | (Client & { status: 'failed'; why: string });

/** Copy the skill into every installed client; nothing is copied when the skill is stale (`stale` names the files). */
export function installSkill(home: string, skillDir: string = STANDALONE_DIR): { stale: string[]; outcomes: CopyOutcome[] } {
  const out = stale(skillDir);
  if (out.length) return { stale: out, outcomes: [] };
  const files = skillFiles(skillDir);
  const outcomes = CLIENTS.map(({ id, folder }): CopyOutcome => {
    if (!isDir(path.join(home, folder))) return { id, folder, status: 'skipped' };
    try {
      replaceFolder(skillTarget(home, folder), skillDir, files);
      return { id, folder, status: 'copied' };
    } catch (err) {
      return { id, folder, status: 'failed', why: (err as Error).message };
    }
  });
  return { stale: [], outcomes };
}

/** Whether some installed client's copy is missing or differs from the skill (the board's check at start). */
export function needsInstall(home: string, skillDir: string = STANDALONE_DIR): boolean {
  const installed = CLIENTS.filter((c) => isDir(path.join(home, c.folder)));
  if (!installed.length) return false;
  try {
    const files = skillFiles(skillDir);
    return installed.some((c) => copyDiffers(skillTarget(home, c.folder), skillDir, files));
  } catch {
    return true;
  }
}

/** The main checkout of the repo at `root`: `root` itself, or, in a linked git worktree, the checkout it belongs to. */
export function mainCheckout(root: string): string {
  const git = path.join(root, '.git');
  if (!fs.statSync(git, { throwIfNoEntry: false })?.isFile()) return root;
  const dir = /^gitdir:\s*(.+)$/m.exec(fs.readFileSync(git, 'utf8'))?.[1]?.trim();
  const gitdir = dir === undefined ? undefined : path.resolve(root, dir);
  return gitdir && path.basename(path.dirname(gitdir)) === 'worktrees' ? path.dirname(path.dirname(path.dirname(gitdir))) : root;
}

/** This repo's root. */
export const REPO = path.resolve(import.meta.dirname, '../../..');
/** The entry a client runs the board's MCP server by: this Node, and the main checkout's server (a worktree goes away). */
export const boardMcpEntry = (root: string = REPO): McpEntry => ({ command: process.execPath, args: [path.join(mainCheckout(root), MCP_MARK)] });

const NEXT: Readonly<Record<ClientId, string>> = { claude: binWords.nextClaude, kiro: binWords.nextKiro, crew: binWords.nextCrew };
const setupLine = (id: ClientId, file: string, entry: McpEntry): string =>
  (id === 'claude' ? binWords.setupClaude(shellLine(['claude', ...claudeAddArgs(entry)])) : binWords.setupKiro(file, JSON.stringify(entry)));

export interface RunOptions { home: string; skillDir?: string; addMcp?: boolean; entry?: McpEntry; run?: Runner }

/** One run: copy, then each installed client's MCP line (adding the missing entries only with `addMcp`). The lines it
 * prints, and its exit code: 1 on a stale skill, no installed client, a failed copy or a failed add. */
export function runSkillInstall({ home, skillDir, addMcp: add = false, entry = boardMcpEntry(), run }: RunOptions): { lines: string[]; code: number } {
  const tilde = (p: string) => (p.startsWith(`${home}${path.sep}`) ? `~${p.slice(home.length)}` : p);
  const name = (id: ClientId) => binWords.clientNames[id];
  const { stale: out, outcomes } = installSkill(home, skillDir);
  if (out.length) return { lines: [binWords.skillStale(out)], code: 1 };
  const installed = outcomes.filter((o) => o.status !== 'skipped');
  if (!installed.length) return { lines: [binWords.noClient(CLIENTS.map((c) => tilde(path.join(home, c.folder))))], code: 1 };
  const lines = outcomes.map((o) => (o.status === 'copied' ? binWords.skillCopied(name(o.id), tilde(skillTarget(home, o.folder)))
    : o.status === 'skipped' ? binWords.skillSkipped(name(o.id), tilde(path.join(home, o.folder))) : binWords.skillFailed(name(o.id), o.why)));
  lines.push(...outcomes.filter((o) => o.status === 'copied').map((o) => NEXT[o.id]));
  let failed = outcomes.some((o) => o.status === 'failed');
  let missing = false;
  for (const { id } of installed) {
    const file = tilde(path.join(home, MCP_FILES[id]));
    const status = mcpStatus(home, id);
    if (status.state === 'present') lines.push(binWords.mcpPresent(name(id), status.name, file));
    else if (status.state === 'unreadable') lines.push(binWords.mcpUnreadable(name(id), file, status.why));
    else if (status.taken) lines.push(binWords.mcpNameTaken(name(id), file));
    else if (!add) { missing = true; lines.push(binWords.mcpMissing(name(id), setupLine(id, file, entry))); }
    else {
      const r = addMcp(home, id, entry, run);
      if (r.state === 'added') lines.push(binWords.mcpAdded(name(id), file));
      else if (r.state === 'name-taken') lines.push(binWords.mcpNameTaken(name(id), file));
      else { failed = true; lines.push(binWords.mcpAddFailed(name(id), r.why)); }
    }
  }
  if (missing) lines.push(binWords.askBeforeAddMcp);
  return { lines, code: failed ? 1 : 0 };
}
