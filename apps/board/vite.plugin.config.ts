// The plugin's two bundles (bin/build-plugin.ts runs them; D-074): the view for a browser and the engine for Node,
// each one ESM file a host imports by path, with everything it needs inside. The view carries its own Svelte
// and exports only what plugin/view.ts exports; the engine carries ajv and the format's files, and imports
// nothing but Node's own `node:` modules. Same input, same bytes: no sourcemap, no timestamp, no path of this machine.
import path from 'node:path';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import type { InlineConfig, Plugin } from 'vite';
import { allSchemaFiles, openapiDoc, toolRows } from './server/format-files.ts';

const here = (rel: string) => path.resolve(import.meta.dirname, rel);
const ROOT = here('../..');

/** The engine reads the format's files (schemas, openapi.json, the tool table) from disk; the bundle must read
 *  nothing from beside itself. This swaps server/format-files.ts for the same three readers over the files'
 *  text, put in now, less the schemas' `$comment`s (notes to the maintainer, no meaning to a validator). The real module's other export (`schemaFiles`, for tests) is not in the bundle. */
export const embedFormatFiles = (): Plugin => {
  const real = here('server/format-files.ts');
  const virtual = '\0vb-format-files';
  return {
    name: 'embed-format-files',
    enforce: 'pre',
    async resolveId(source, importer, options) {
      if (!importer || !/format-files(\.ts)?$/.test(source)) return null;
      const found = await this.resolve(source, importer, { ...options, skipSelf: true });
      return found?.id === real ? virtual : null;
    },
    load(id) {
      if (id !== virtual) return null;
      const schemas = allSchemaFiles().map(({ schema }) => ({ file: schema.$id, schema }));
      const text = (value: unknown) => JSON.stringify(JSON.stringify(value, (key, v) => (key === '$comment' ? undefined : v)));
      return [
        `const SCHEMAS = ${text(schemas)};`, `const OPENAPI = ${text(openapiDoc())};`, `const ROWS = ${text(toolRows())};`,
        'export const allSchemaFiles = () => JSON.parse(SCHEMAS);', 'export const openapiDoc = () => JSON.parse(OPENAPI);', 'export const toolRows = () => JSON.parse(ROWS);',
      ].join('\n');
    },
  };
};

/** The tokens set `color-scheme` on `:root` and on `[data-theme]`, which is the standalone page's to say: under a host it
 *  would turn the host's own fields and scrollbars dark (the board's own is on its root, plugin/color-scheme.css). Each
 *  of those three rules loses its `color-scheme` (a rule left with nothing goes), or the build stops. */
export const hostKeepsColorScheme = (): Plugin => ({
  name: 'host-keeps-color-scheme',
  enforce: 'post',
  generateBundle(_, bundle) {
    const sheet = Object.values(bundle).find((f) => f.type === 'asset' && f.fileName.endsWith('.css'));
    if (sheet?.type !== 'asset') throw new Error('the view bundle has no stylesheet');
    let taken = 0;
    sheet.source = String(sheet.source).replace(/(?<=^|[}\s])(:root|\[data-theme=(?:light|dark)\])\{([^}]*)\}/g, (all, sel: string, body: string) => {
      const rest = body.replace(/(^|;)color-scheme:[^;}]+;?/, '$1').replace(/;$/, '');
      if (rest === body) return all;
      taken += 1;
      return rest ? `${sel}{${rest}}` : '';
    });
    if (taken !== 3) throw new Error(`the tokens' color-scheme: expected 3 rules, took ${taken}`);
  },
});

/** The browsers the view's sheet is written for: each has `light-dark()`, so the minifier keeps it native and every colour
 *  resolves against the `color-scheme` at the board's root (a host's `--host-color-scheme`; plugin.md § Theme and host
 *  styling, Mode), not against the media query a lowered `--lightningcss-*` pair would follow. */
export const CSS_TARGET = ['chrome123', 'safari17.5', 'firefox120'];

const common = (outDir: string, watch: boolean) => ({
  configFile: false as const, root: ROOT, logLevel: 'warn' as const,
  build: { outDir, emptyOutDir: false, copyPublicDir: false, sourcemap: false, reportCompressedSize: false, ...(watch && { watch: {} }) },
});

/** `view/board.js` (exports `mount`) and `view/board.css`, built into `<outDir>/view/`. */
export const viewBuild = (outDir: string, watch = false): InlineConfig => {
  const base = common(path.join(outDir, 'view'), watch);
  return {
    ...base, plugins: [svelte({ configFile: here('svelte.config.js') }), hostKeepsColorScheme()],
    build: {
      ...base.build, target: 'es2022', cssTarget: CSS_TARGET, cssCodeSplit: false,
      lib: { entry: here('plugin/view.ts'), formats: ['es'], fileName: () => 'board.js', cssFileName: 'board' },
      rollupOptions: { output: { codeSplitting: false } },
    },
  };
};

/** `engine/engine.js` (exports `createEngine`), built into `<outDir>/engine/`. */
export const engineBuild = (outDir: string, watch = false): InlineConfig => {
  const base = common(path.join(outDir, 'engine'), watch);
  return {
    ...base, plugins: [embedFormatFiles()], ssr: { noExternal: true },
    build: {
      ...base.build, ssr: true, target: 'node22', minify: false,
      lib: { entry: here('plugin/engine.ts'), formats: ['es'], fileName: () => 'engine.js' },
      // The engine's imports are by each package's front door; what it does not use is dropped, whole.
      rollupOptions: { external: [/^node:/], treeshake: { moduleSideEffects: false }, output: { codeSplitting: false } },
    },
  };
};
