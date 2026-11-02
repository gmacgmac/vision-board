---
inclusion: fileMatch
fileMatchPattern: ["**/*.svelte", "**/*.svelte.ts", "**/svelte.config.js", "**/vite.config.ts"]
---

> **Version**: 1.0 | **Updated**: 2026-10-01

# Svelte conventions (Svelte 5, runes only)

The app uses **Svelte 5.57.1** (D-012, D-014). Most training data and examples online are
Svelte 3/4, so check every Svelte file against this list. `svelte.config.js` sets
`compilerOptions.runes = true`, so the compiler rejects most Svelte 4 syntax. Treat a compile
error as a sign you wrote the old syntax.

## Where Svelte is used

Only the app around the board: the chat panel, the side panels, the toolbar and page layout
(D-005, D-015). Nodes, links and regions are plain web components (`<vb-node>`, `<vb-link>`,
`<vb-region>`) with a framework-free core. Svelte places them; it never reimplements them.

The board's own controls (`apps/board/src/board/chrome/`) are Svelte inside the board, compiled into
the plugin's bundle: a host only ever calls `mount` and never sees Svelte.

## Use (Svelte 5) / never use (Svelte 4)

| Need | Use | Never |
|---|---|---|
| Props | `let { title, onsend } = $props()` | `export let title` |
| State | `let open = $state(false)` | a plain `let` expecting reactivity |
| Derived | `const count = $derived(items.length)` | `$: count = items.length` |
| Side effects | `$effect(() => { ... })` (rarely, prefer derived) | `$: { ... }`, `afterUpdate` |
| Events | `onclick={handler}` | `on:click={handler}` |
| Component events | a callback prop (`onsend`) | `createEventDispatcher` |
| Children | `let { children } = $props()`, `{@render children?.()}` | `<slot />` |
| Named content | `{#snippet header()}...{/snippet}` + `{@render header()}` | `<slot name="header">` |
| Mounting | `mount(App, { target })` | `new App({ target })` |
| Shared state | a `.svelte.ts` module exporting `$state` | `writable()` stores for new code |

## Rules

1. Check versions with `npm view svelte version` before claiming what is current. Never guess.
2. When unsure of an API, read the official docs for LLMs, <https://svelte.dev/llms-small.txt>,
   not memory.
3. Styling comes only from design tokens (`--vb-*`, rule 3). No literal colours in `<style>`.
4. Every component is keyboard reachable and labelled (rule 5). It stays one job per file and
   about 300 lines (rule 2).
5. `npm run check` (svelte-check) must pass before work is reported done.
