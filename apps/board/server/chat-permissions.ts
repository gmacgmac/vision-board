// "Allow for this folder" (D-066 6, api.md 100, 107): the yeses the person gave the side-panel agent for
// the board's folder, kept across sessions and restarts in its `permissions.json` (`projectFiles(folder).permissions`). The
// only module that reads or writes it; the access rules refuse it to the agent (`ACCESS_RULES`), so only
// the server writes it (atomically). Each entry is a cover (`coverOf`, packages/agent): writes in one
// folder, reads of one file, searches of one folder (relative to the board's folder), or a command by
// its first words. Read on
// first use and checked (`permission.schema.json`); a damaged file keeps nothing (so the agent asks), is
// never silently rewritten, and is replaced only by the person's next "for this folder".
import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { Cover } from '#agent';
import { PERMISSIONS_FILE } from '#format';
import { writeFileAtomic } from './atomic-file.ts';
import { ignoreInGit } from './agents.ts';
import { problem } from './problem.ts';
import { SCHEMA_BASE, schemaProblems } from './schema.ts';
import * as serverChatWords from './words/server-chat.ts';

const PERMISSION_ID = `${SCHEMA_BASE}schema/api/permission.schema.json`;

/** One kept yes, as list_permissions shows it (`permission.schema.json`). */
export interface FolderPermission {
  id: string;
  kind: Cover['kind'];
  /** The folder (a write, a search) or file (a read), relative to the board's folder, `/`-joined; '' for the folder itself. */
  path?: string;
  command?: string;
  created: string;
}

export interface Permissions {
  /** Every kept yes, oldest first. */
  list(): FolderPermission[];
  /** Whether a kept yes covers `cover` (paths absolute, as `coverOf` gives them). */
  covers(cover: Cover): boolean;
  /** Keep `cover` (file first); nothing when it is outside the folder or already kept. */
  add(cover: Cover): void;
  /** Forget one, by id (file first); `not-found` when none has it. The ones left. */
  forget(id: string): FolderPermission[];
}

const valid = (entry: unknown) => schemaProblems(PERMISSION_ID, entry).length === 0;

/** The kept yeses in the file, or none (and a warning) when it is missing or damaged. */
function read(file: string, warn: (m: string) => void): FolderPermission[] {
  if (!fs.existsSync(file)) return [];
  try {
    const list = (JSON.parse(fs.readFileSync(file, 'utf8')) as { permissions?: unknown }).permissions;
    if (Array.isArray(list) && list.every(valid)) return list as FolderPermission[];
  } catch { /* said below */ }
  warn(serverChatWords.thePermissionsFileIsDamaged(file));
  return [];
}

/** The store for the board's folder `root` (its real path) and its repo-wide folder `dir` (`projectFiles(root).root`). */
export function openPermissions(dir: string, root: string, warn: (m: string) => void = (m) => console.error(m)): Permissions {
  const file = path.join(dir, PERMISSIONS_FILE);
  let kept: FolderPermission[] | undefined;
  const all = () => (kept ??= read(file, warn));
  const save = (next: FolderPermission[]) => {
    fs.mkdirSync(dir, { recursive: true });
    ignoreInGit(dir, PERMISSIONS_FILE);
    writeFileAtomic(file, `${JSON.stringify({ permissions: next }, null, 2)}\n`, 0o600);
    kept = next;
  };
  /** The entry's fields for `cover`, or null when a path cover is outside the folder. */
  const fields = (cover: Cover): Pick<FolderPermission, 'kind' | 'path' | 'command'> | null => {
    if (cover.kind === 'command') return { kind: 'command', command: cover.head };
    const rel = path.relative(root, cover.path);
    if (rel === '..' || rel.startsWith(`..${path.sep}`) || path.isAbsolute(rel)) return null;
    return { kind: cover.kind, path: rel.split(path.sep).join('/') };
  };
  const same = (p: FolderPermission, f: NonNullable<ReturnType<typeof fields>>) =>
    p.kind === f.kind && p.path === f.path && p.command === f.command;
  return {
    list: () => [...all()],
    covers(cover) {
      const f = fields(cover);
      return f !== null && all().some((p) => same(p, f));
    },
    add(cover) {
      const f = fields(cover);
      if (f === null || all().some((p) => same(p, f))) return;
      const entry = { id: `pm-${randomBytes(6).toString('hex')}`, ...f, created: new Date().toISOString() };
      if (!valid(entry)) return;
      save([...all(), entry]);
    },
    forget(id) {
      if (!all().some((p) => p.id === id)) throw problem('not-found', serverChatWords.noPermissionIsKeptFor(id));
      save(all().filter((p) => p.id !== id));
      return [...all()];
    },
  };
}
