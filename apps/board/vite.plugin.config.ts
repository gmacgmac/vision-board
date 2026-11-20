// The plugin's two bundles (bin/build-plugin.ts runs them; D-074): the view for a browser and the engine for Node,
// each one ESM file a host imports by path, with everything it needs inside. The view carries its own Svelte
// and exports only what plugin/view.ts exports; the engine carries ajv and the format's files, and imports
// nothing but Node's own `node:` modules. Same input, same bytes: no sourcemap, no timestamp, no path of this machine.
import path from 'node:path';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import type { InlineConfig, Plugin } from 'vite';
import { PARTS } from './plugin/manifest.ts';
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

/** One of the board's faces: its family and its file (bin/build-plugin.ts `FACES`, from packages/tokens/src/fonts.css). */
export type Face = { family: string; file: string };

/** The board's faces (D-116), as a host takes them (plugin.md § Theme and host styling, Fonts): each `@font-face` src
 *  made the one plain `url("fonts/<file>.woff2") format("woff2")`, relative to the sheet, that a host checks against the
 *  manifest's `view.fonts`; the build copies the files there (bin/build-plugin.ts). Whatever the bundler made of a face
 *  (a hashed copy, an inlined one) goes. Every face placed once, in order, or the build stops. */
export const placeFontFaces = (faces: readonly Face[]): Plugin => ({
  name: 'place-font-faces',
  enforce: 'post',
  generateBundle(_, bundle) {
    for (const name of Object.keys(bundle)) if (/\.woff2$/.test(name)) delete bundle[name];
    const dir = path.posix.relative(path.posix.dirname(PARTS.styles), PARTS.fonts);
    const sheet = Object.values(bundle).find((f) => f.type === 'asset' && f.fileName.endsWith('.css'));
    if (sheet?.type !== 'asset') throw new Error('the view bundle has no stylesheet');
    const placed: string[] = [];
    sheet.source = String(sheet.source).replace(/@font-face\{([^}]*)\}/g, (all, body: string) => {
      const family = /(?:^|;)font-family:["']?([a-z0-9-]+)["']?(?=;|$)/.exec(body)?.[1];
      const face = faces.find((f) => f.family === family);
      const src = /(^|;)src:url\([^)]*\)(?:\s*format\([^)]*\))?(?=;|$)/;
      if (!face || !src.test(body)) throw new Error(`a face the build cannot place: ${all.slice(0, 120)}`);
      placed.push(face.family);
      return `@font-face{${body.replace(src, `$1src:url("${dir}/${face.file}") format("woff2")`)}}`;
    });
    if (!placed.length || placed.join() !== faces.map((f) => f.family).join()) throw new Error(`the board's faces: expected ${faces.map((f) => f.family)}, placed ${placed}`);
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

/** `view/board.js` (exports `mount`) and `view/board.css`, built into `<outDir>/view/`, the sheet declaring `faces`. */
export const viewBuild = (outDir: string, faces: readonly Face[], watch = false): InlineConfig => {
  const base = common(path.join(outDir, 'view'), watch);
  return {
    ...base, plugins: [svelte({ configFile: here('svelte.config.js') }), hostKeepsColorScheme(), placeFontFaces(faces)],
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
      // The engine's imports are by each package's front door; what it does not use is dropped, whole. Unminified, so a
      // host can read it, but without the sources' doc comments, which are most of its weight (the budget,
      // plugin-build.test.ts); a licence comment stays, and so does an annotation the next bundler reads.
      rollupOptions: {
        external: [/^node:/], treeshake: { moduleSideEffects: false },
        output: { codeSplitting: false, comments: { legal: true, annotation: true, jsdoc: false } },
      },
    },
  };
};
