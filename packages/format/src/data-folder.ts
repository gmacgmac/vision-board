// The data folder's layout (PLAN decision 2, D-084 2): the one home of every name in a project's
// `.visionboard` and of every path built from them. Nothing else names a data-folder file or builds a
// data-folder path; `npm run verify` holds that (scripts/verify-data-folder.mjs). Pure string logic
// joined with `/`, and no `node:` import (D-059, D-060): the page loads `#format` too.
// Today a project has one ledger, and its folder is the project's `.visionboard`, so the ledger's
// files and the project's repo-wide files sit side by side. Only this file knows that.

/** The project's data folder, at its root (and the person's own, at home). */
export const DATA_DIR = '.visionboard';
/** The ledger: append-only JSONL (D-017). */
export const LEDGER_FILE = 'ledger.jsonl';
/** The agents' secret hashes (D-027): never read by an agent. */
export const AGENTS_FILE = 'agents.json';
/** The one-server-per-ledger lock (D-017, `lock.ts`). */
export const LOCK_FILE = 'lock';
/** Pictures cards show (D-048). */
export const IMAGES_DIR = 'images';
/** App folders, one per app (D-047). */
export const APPS_DIR = 'apps';
/** Each app card's saved panel state, one file per card (D-050). */
export const APP_STATE_DIR = 'app-state';
/** The data folder's own git rules: the files above that must never be committed. */
export const GITIGNORE_FILE = '.gitignore';
/** The standalone chat's sessions index (repo-wide, PLAN decision 6). */
export const CHAT_SESSIONS_FILE = 'chat-sessions.json';
/** The person's "allow for this folder" answers (repo-wide, D-066). */
export const PERMISSIONS_FILE = 'permissions.json';
/** Files the person attached to a chat message (repo-wide, D-068). */
export const ATTACHMENTS_DIR = 'attachments';
/** The person's recent folders, in their home folder's data folder (api.md 110). */
export const RECENT_FILE = 'recent.json';

/** Every name inside a data folder, so a rule (verify, a ledger's name) can refuse to clash with one. */
export const DATA_FOLDER_NAMES = [
  LEDGER_FILE, AGENTS_FILE, LOCK_FILE, IMAGES_DIR, APPS_DIR, APP_STATE_DIR, GITIGNORE_FILE,
  CHAT_SESSIONS_FILE, PERMISSIONS_FILE, ATTACHMENTS_DIR, RECENT_FILE,
] as const;

/** The steps from a project folder down to its ledger's folder. The only place the depth is said:
 * `ledgerFolder` goes down them and `projectOfLedger` comes back up. */
const LEDGER_STEPS: readonly string[] = [DATA_DIR];

/** `parts` joined with `/`, empty parts left out, so `''` as the first gives a project-relative path. */
const join = (...parts: string[]): string => parts.filter((p) => p !== '').join('/').replace(/\/{2,}/g, '/');

/** The files of one ledger's folder: everything the engine reads or writes (D-077). */
export interface LedgerFiles {
  readonly ledger: string;
  readonly agents: string;
  readonly lock: string;
  readonly images: string;
  readonly apps: string;
  readonly appState: string;
  readonly gitignore: string;
}

/** A project's repo-wide files: the standalone chat's, shared by every ledger (PLAN decision 6). */
export interface ProjectFiles {
  /** The folder they sit in. */
  readonly root: string;
  /** That folder's own git rules. */
  readonly gitignore: string;
  readonly chatSessions: string;
  readonly permissions: string;
  readonly attachments: string;
}

/** The person's own files, in their home folder. */
export interface HomeFiles {
  readonly recent: string;
}

/** The folder of the project's ledger: the engine's `dir` (today `<project>/.visionboard`). The only
 * way from a project folder to a ledger folder. */
export const ledgerFolder = (projectDir: string): string => join(projectDir, ...LEDGER_STEPS);

/** Every file and folder in ledger folder `ledgerDir` (`ledgerFolder`). The only home of their names. */
export function ledgerFiles(ledgerDir: string): LedgerFiles {
  return {
    ledger: join(ledgerDir, LEDGER_FILE),
    agents: join(ledgerDir, AGENTS_FILE),
    lock: join(ledgerDir, LOCK_FILE),
    images: join(ledgerDir, IMAGES_DIR),
    apps: join(ledgerDir, APPS_DIR),
    appState: join(ledgerDir, APP_STATE_DIR),
    gitignore: join(ledgerDir, GITIGNORE_FILE),
  };
}

/** The repo-wide files of project folder `projectDir`. With `''`, the same paths relative to the
 * project: what an agent is told (`.visionboard/attachments/…`). The only home of where they sit. */
export function projectFiles(projectDir: string): ProjectFiles {
  const root = join(projectDir, DATA_DIR);
  return {
    root,
    gitignore: join(root, GITIGNORE_FILE),
    chatSessions: join(root, CHAT_SESSIONS_FILE),
    permissions: join(root, PERMISSIONS_FILE),
    attachments: join(root, ATTACHMENTS_DIR),
  };
}

/** The project folder that ledger folder `ledgerDir` belongs to: `ledgerFolder` undone. The only way
 * back up from a ledger (never "two levels up" from its file). `/` or `\` between steps. */
export function projectOfLedger(ledgerDir: string): string {
  let at = ledgerDir.replace(/[\\/]+$/, '');
  for (let i = 0; i < LEDGER_STEPS.length; i++) {
    const cut = Math.max(at.lastIndexOf('/'), at.lastIndexOf('\\'));
    at = cut > 0 ? at.slice(0, cut) : cut === 0 ? '/' : '.';
  }
  return at;
}

/** The person's own files under home folder `home` (`~/.visionboard/recent.json`). The only home of where. */
export const homeFiles = (home: string): HomeFiles => ({ recent: join(home, DATA_DIR, RECENT_FILE) });
