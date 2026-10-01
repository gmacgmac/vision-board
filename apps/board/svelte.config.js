// Svelte 5, runes only: the compiler rejects most Svelte 4 syntax (.kiro/steering/svelte-conventions.md).
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

export default {
  preprocess: vitePreprocess(),
  compilerOptions: { runes: true },
};
