// Builds the board page into dist/, which apps/board/server.ts serves (D-012). No dev server:
// the board server owns localhost, the Host/Origin guard and the session API (rule 18).
import { fileURLToPath } from 'node:url';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vite';

const page = (name: string) => fileURLToPath(new URL(name, import.meta.url));

export default defineConfig({
  // The repo is one package scope (D-059): the root's scripts run this config, so the root is set here.
  root: page('.'),
  plugins: [svelte()],
  // Two pages: the board (index.html) and the pattern gallery (gallery.html, page tests).
  build: {
    outDir: 'dist', emptyOutDir: true, target: 'es2022',
    rollupOptions: { input: { index: page('index.html'), gallery: page('gallery.html') } },
  },
});
