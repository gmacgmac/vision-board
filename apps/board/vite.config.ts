// Builds the board page into dist/, which apps/board/server.ts serves (D-012). No dev server:
// the board server owns localhost, the Host/Origin guard and the session API (rule 18).
import { fileURLToPath } from 'node:url';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import type { Plugin } from 'vite';
import { defineConfig } from 'vite';

const page = (name: string) => fileURLToPath(new URL(name, import.meta.url));

/** pdf.js's `import()`s load Node's modules or a worker by URL, none of which the frame has. Left in, the build wraps them
 *  in a helper in a shared chunk; gone, the frame's script stays one file, and no path in it loads code. */
const pdfNoImports = (): Plugin => ({
  name: 'pdf-no-imports',
  enforce: 'pre',
  transform: (code, id) => (/pdfjs-dist\/build\/pdf\.mjs$/.test(id) ? code.replace(/\bimport\(/g, '(async () => { throw new Error(\'no import in the frame\'); })(') : undefined),
});

export default defineConfig({
  // The repo is one package scope (D-059): the root's scripts run this config, so the root is set here.
  root: page('.'),
  plugins: [svelte()],
  worker: { plugins: () => [pdfNoImports()] },
  // Two pages: the board (index.html) and the pattern gallery (gallery.html, page tests). A third entry is
  // the script of the frame that reads a stranger's PDF or picture: never loaded as a file, the server puts it
  // inside the frame's own page (server/pdf-frame.ts), so it must stay one file, sharing no chunk with the board.
  build: {
    outDir: 'dist', emptyOutDir: true, target: 'es2022',
    rollupOptions: { input: { index: page('index.html'), gallery: page('gallery.html'), 'pdf-frame': page('src/shell/pdf-pages-frame.ts') } },
  },
});
