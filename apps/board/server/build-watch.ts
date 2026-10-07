// Watch mode only (`VB_WATCH=1`, api.md 79): names the page the server is serving, for the
// `build` event of `watch_project`. The id is the server's start time plus the mtime of
// `dist/index.html`, so a restart and a new page build both change it. `dist/` is watched with
// `fs.watch`; once it has been quiet for `quietMs` and `index.html` exists, a changed id is sent
// to every listener, so a page never reloads into a half-written build.
import fs from 'node:fs';
import path from 'node:path';

export interface BuildWatch {
  /** The build being served now. */
  id(): string;
  /** Call `fn` with each new id; returns the off switch. */
  onChange(fn: (id: string) => void): () => void;
  close(): void;
}

export function watchBuild(dist: string, quietMs = 300): BuildWatch {
  const started = Date.now().toString(36);
  const index = path.join(dist, 'index.html');
  const idNow = (): string | undefined => {
    const mtime = fs.statSync(index, { throwIfNoEntry: false })?.mtimeMs;
    return mtime === undefined ? undefined : `${started}-${Math.trunc(mtime).toString(36)}`;
  };
  let id = idNow() ?? started;
  const listeners = new Set<(id: string) => void>();
  let timer: NodeJS.Timeout | undefined;
  const settle = () => {
    const next = idNow();
    if (next === undefined || next === id) return;
    id = next;
    for (const fn of listeners) fn(id);
  };
  const watcher = fs.watch(dist, { recursive: true }, () => {
    clearTimeout(timer);
    timer = setTimeout(settle, quietMs);
  });
  watcher.on('error', (err) => console.error(`build watch: ${err.message}`));
  return {
    id: () => id,
    onChange(fn) {
      listeners.add(fn);
      return () => { listeners.delete(fn); };
    },
    close() {
      clearTimeout(timer);
      watcher.close();
      listeners.clear();
    },
  };
}
