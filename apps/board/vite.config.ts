// Builds the board page into dist/, which apps/board/server.ts serves (D-012). No dev server:
// the board server owns localhost, the Host/Origin guard and the session API (rule 18).
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [svelte()],
  build: { outDir: 'dist', emptyOutDir: true, target: 'es2022' },
});
