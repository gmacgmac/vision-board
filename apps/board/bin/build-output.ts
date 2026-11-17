// The page's two builds share one dist/ (vite.config.ts: the board page, then the gallery and the PDF frame), so
// neither may empty it as Vite's `emptyOutDir` would, on every rebuild under --watch, taking the other build's files.
// `ownOutput` empties dist/ once, as the build named `first` (the one that runs first) starts writing, and from then
// on each build writes over
// its own last output: a file it wrote last time and not now goes, so a rebuild leaves no stale chunk and only one
// frame script for server/pdf-frame.ts to find. Node-side (file access), so it lives with the build tools.
import fs from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';

export function ownOutput(first: string): Plugin {
  let emptied = false;
  const last = new Map<string, Set<string>>();
  return {
    name: 'own-output',
    renderStart(out) {
      if (emptied || !out.dir || this.environment.name !== first) return;
      emptied = true;
      fs.rmSync(out.dir, { recursive: true, force: true });
    },
    writeBundle(out, bundle) {
      const now = new Set(Object.keys(bundle));
      for (const f of last.get(this.environment.name) ?? []) if (!now.has(f)) fs.rmSync(path.join(out.dir!, f), { force: true });
      last.set(this.environment.name, now);
    },
  };
}
