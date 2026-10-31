// The fake host's own Svelte, compiled and bundled by its own copy, beside the one inside the plugin's bundle. It
// uses `VB_HOST_SVELTE` (a folder holding a `svelte` package), else a sibling project's newer or older copy when one
// is on this machine (read only; nothing is written there), else the repo's: then two runtimes of one version
// still run side by side, and `sveltes()` says so plainly.
import { existsSync, readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build, type Plugin } from 'vite';

const HERE = import.meta.dirname;
const REPO = path.resolve(HERE, '../../../node_modules/svelte');
const OTHER = path.join(os.homedir(), 'ai/nclite/app/node_modules/svelte');
const HOST = [process.env.VB_HOST_SVELTE, OTHER].find((d): d is string => !!d && existsSync(path.join(d, 'package.json'))) ?? REPO;

const versionOf = (dir: string): string => (JSON.parse(readFileSync(path.join(dir, 'package.json'), 'utf8')) as { version: string }).version;

/** The version of the host's Svelte and of the repo's, which the bundle carries. */
export const sveltes = (): { host: string; bundle: string } => ({ host: versionOf(HOST), bundle: versionOf(REPO) });

/** `svelte` and `svelte/...` from the host's copy, by that package's own exports. */
function fromHostCopy(): Plugin {
  const exports = (JSON.parse(readFileSync(path.join(HOST, 'package.json'), 'utf8')) as { exports: Record<string, string | Record<string, string>> }).exports;
  return {
    name: 'host-svelte', enforce: 'pre',
    resolveId(id) {
      if (id !== 'svelte' && !id.startsWith('svelte/')) return null;
      const entry = exports[id === 'svelte' ? '.' : `.${id.slice('svelte'.length)}`];
      if (!entry) throw new Error(`the host's Svelte has no ${id}`);
      return path.join(HOST, typeof entry === 'string' ? entry : (entry.browser ?? entry.default)!);
    },
    async transform(code, id) {
      if (!id.endsWith('.svelte')) return null;
      const { compile } = await import(pathToFileURL(path.join(HOST, 'src/compiler/index.js')).href) as typeof import('svelte/compiler');
      return { code: compile(code, { filename: id, generate: 'client', css: 'external', dev: false }).js.code, map: null };
    },
  };
}

let bundle: Promise<string> | undefined;

/** The host's Svelte and its pane, as one script. */
export const hostSvelteBundle = (): Promise<string> => (bundle ??= (async () => {
  const out = await build({
    configFile: false, logLevel: 'silent', root: HERE, plugins: [fromHostCopy()],
    build: { write: false, target: 'es2022', minify: false, lib: { entry: path.join(HERE, 'host-svelte-entry.js'), formats: ['es'], fileName: 'host-svelte' } },
  });
  const files = (Array.isArray(out) ? out : [out]).flatMap((o) => ('output' in o ? o.output : []));
  const js = files.find((f) => f.type === 'chunk');
  if (js?.type !== 'chunk') throw new Error('the host\'s Svelte did not bundle');
  return js.code;
})());
