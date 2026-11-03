// Test support: a real board folder on disk for the access rules, with real symlinks and a hard link,
// beside a folder outside it and a symlink to the board's folder. Not a test itself (no .test.ts).
import { linkSync, lstatSync, mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

export interface AccessFixture {
  /** The board's folder, by its real path. */
  folder: string;
  /** A symlink to the board's folder. */
  folderLink: string;
  /** A folder beside the board's, outside it. */
  outside: string;
  /** Whether this disk treats `a` and `A` as one name (found by looking, not assumed). */
  ignoresCase: boolean;
  remove(): void;
}

const FILES = [
  'src/x.ts', 'clean/a.ts', 'apps/web/.env', 'apps/web/main.ts', '.env', '.env.local',
  '.visionboard/agents.json', '.visionboard/chat-sessions.json', '.visionboard/ledger.jsonl', '.visionboard/lock',
  '.visionboard/permissions.json', '.visionboard/app-state/s.json', '.visionboard/other.json',
  '.visionboard/images/a.png', '.visionboard/apps/calc/app.json', '.visionboard/attachments/2026-10-30/1-a.pdf', '.git/HEAD', '.git/hooks/x',
];

/** `extra`: more files to make in the board's folder (the ledger folders' layout, `policy-ledgers.test.ts`). */
export function accessFixture(extra: readonly string[] = []): AccessFixture {
  const base = realpathSync(mkdtempSync(path.join(tmpdir(), 'agent-access-')));
  const folder = path.join(base, 'Board');
  const outside = path.join(base, 'outside');
  for (const f of [...[...FILES, ...extra].map((f) => path.join(folder, f)), path.join(outside, 'notes.txt'), path.join(outside, '.env')]) {
    mkdirSync(path.dirname(f), { recursive: true });
    writeFileSync(f, 'x\n');
  }
  const link = (target: string, at: string) => symlinkSync(target, path.join(folder, at));
  link('.env', 'notes');                                   // inside, to a refused file
  link('../outside/notes.txt', 'out-link');                // inside, to a file outside
  link('.visionboard', 'vb-link');                         // a symlinked folder
  link('.visionboard/images', 'up');                       // so `up/..` is `.visionboard`, not the folder
  link('../agents.json', '.visionboard/images/sneaky');    // an allowed folder, to a refused file
  link('../../.git/hooks/pre-commit', '.visionboard/images/hooky'); // dangling, into .git
  link('loop-b', 'loop-a');
  link('loop-a', 'loop-b');
  linkSync(path.join(folder, '.env'), path.join(folder, 'clean-hard.txt')); // a second name for .env
  const folderLink = path.join(base, 'board-link');
  symlinkSync(folder, folderLink);
  const ignoresCase = lstatSync(path.join(folder, '.ENV'), { throwIfNoEntry: false }) !== undefined;
  return { folder, folderLink, outside, ignoresCase, remove: () => rmSync(base, { recursive: true, force: true }) };
}
