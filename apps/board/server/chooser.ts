// The system's own folder chooser (D-110, api.md 208-210): the only module that opens it, and the only one that
// remembers what the person picked in it. On macOS the board server runs on the person's own computer, so it opens
// Finder's chooser itself: `osascript` run with `execFile` (no shell) on a fixed script file beside this one
// (`choose-folder.applescript`), with the prompt and start folder as its arguments, so nothing the page sends reaches
// the script; the script activates first, so the chooser opens in front of the browser, not behind it. One at a time:
// a second call while one is open is `conflict`. The caller going away (the page's Cancel, a reload) aborts it, which
// closes the chooser. The runner is injected (`BoardServerOptions`
// `chooser`), so tests never open a real one. A picked folder's real path is kept, in memory, for this run only:
// that set, and the server's own recent list, are the only paths `open_project` trusts outside home (folders.ts
// `resolvePicked`, open-folder.ts).
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { problem } from './problem.ts';
import * as serverFoldersWords from './words/server-folders.ts';

/** Run the chooser: the picked folder's path as the system gives it, or undefined when the person cancelled
 * (or `signal` aborted it). Throws when it could not open. */
export type ChooserRun = (o: { prompt: string; start: string; signal: AbortSignal }) => Promise<string | undefined>;

/** The longest the chooser stays open: then it is closed, as if cancelled, so no process outlives a forgotten one. */
export const CHOOSER_TIMEOUT_MS = 10 * 60 * 1000;

/** The script: bring osascript to the front, ask for a folder starting in argv 2, answer its POSIX path. */
const SCRIPT = fileURLToPath(new URL('./choose-folder.applescript', import.meta.url));

/** AppleScript's "User canceled." error number. */
const CANCELLED = /\(-128\)/;

/** Finder's folder chooser, on macOS. */
export const macChooser: ChooserRun = ({ prompt, start, signal }) => new Promise((resolve, reject) => {
  const args = [SCRIPT, prompt, start];
  execFile('/usr/bin/osascript', args, { signal, timeout: CHOOSER_TIMEOUT_MS, encoding: 'utf8' }, (err, stdout, stderr) => {
    if (!err) return resolve(stdout.replace(/\n$/, '') || undefined);
    if (signal.aborted || err.killed || CANCELLED.test(stderr)) return resolve(undefined);
    reject(new Error(stderr.trim() || err.message));
  });
});

export interface Chooser {
  /** Whether this server offers it (list_folders `chooser`). */
  readonly offered: boolean;
  /** Open it, starting in `start`: the path picked, or undefined when cancelled. `conflict` while one is open. */
  choose(start: string, signal: AbortSignal): Promise<string | undefined>;
  /** Keep `real` (a checked real path) as picked this run. */
  trust(real: string): void;
  /** `real` was picked in it this run. */
  picked(real: string): boolean;
}

/** The server's chooser: `run` when one is given and `on` (the systemFolderChooser flag), else none offered. */
export function createChooser(run: ChooserRun | undefined, on: boolean): Chooser {
  const offered = on && run !== undefined;
  const trusted = new Set<string>();
  let open = false;
  return {
    offered,
    async choose(start, signal) {
      if (!offered) throw problem('not-found', serverFoldersWords.chooserNotOffered);
      if (open) throw problem('conflict', serverFoldersWords.chooserAlreadyOpen);
      open = true;
      try {
        return await run!({ prompt: serverFoldersWords.chooserPrompt, start, signal });
      } catch (err) {
        throw problem('conflict', serverFoldersWords.chooserFailed(err instanceof Error ? err.message : String(err)));
      } finally {
        open = false;
      }
    },
    trust: (real) => { trusted.add(real); },
    picked: (real) => trusted.has(real),
  };
}
