// Builds the board page into dist/, which apps/board/server.ts serves (D-012). No dev server:
// the board server owns localhost, the Host/Origin guard and the session API (rule 18).
import { fileURLToPath } from 'node:url';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import type { Plugin } from 'vite';
import { defineConfig } from 'vite';
import { ownOutput } from './bin/build-output.ts';

const page = (name: string) => fileURLToPath(new URL(name, import.meta.url));

/** pdf.js's `import()`s load Node's modules or a worker by URL, none of which the frame has. Left in, the build wraps them
 *  in a helper in a shared chunk; gone, the frame's script stays one file, and no path in it loads code. */
const pdfNoImports = (): Plugin => ({
  name: 'pdf-no-imports',
  enforce: 'pre',
  transform: (code, id) => (/pdfjs-dist\/build\/pdf\.mjs$/.test(id) ? code.replace(/\bimport\(/g, '(async () => { throw new Error(\'no import in the frame\'); })(') : undefined),
});

// Two builds into one dist/, so the board page's chunks are cut for the board page alone (performance.md § What the page
// leaves out of its start weight). `client` is the board (index.html): everything it runs at start is one chunk
// (`$initial`), so a part it loads later (src/board/lazy.ts) splits off only what is that part's own; built with the
// gallery, the bundler would cut the start into a chunk per set of pages and parts sharing it, each file gzipped alone.
// `pages` is the pattern gallery (gallery.html, page tests) and the script of the frame that reads a stranger's PDF or
// picture: never loaded as a file, the server puts it inside the frame's own page (server/pdf-frame.ts), so it must stay
// one file, sharing no chunk with the board. Neither empties dist/: `ownOutput` does, once (bin/build-output.ts).
const input = (names: Record<string, string>) => ({ input: Object.fromEntries(Object.entries(names).map(([k, v]) => [k, page(v)])) });

export default defineConfig({
  // The repo is one package scope (D-059): the root's scripts run this config, so the root is set here.
  root: page('.'),
  plugins: [svelte(), ownOutput('client')],
  worker: { plugins: () => [pdfNoImports()] },
  build: { outDir: 'dist', emptyOutDir: false, target: 'es2022' },
  environments: {
    client: {
      build: {
        rolldownOptions: { ...input({ index: 'index.html' }), output: { codeSplitting: { groups: [{ name: 'board', tags: ['$initial'] }] } } },
      },
    },
    pages: {
      consumer: 'client',
      build: { rolldownOptions: input({ gallery: 'gallery.html', 'pdf-frame': 'src/shell/pdf-pages-frame.ts' }) },
    },
  },
  builder: {
    async buildApp(builder) {
      await builder.build(builder.environments.client!);
      await builder.build(builder.environments.pages!);
    },
  },
});
