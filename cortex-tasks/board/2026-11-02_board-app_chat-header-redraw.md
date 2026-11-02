---
task_name: The Chat Header Draws Its Pickers Once
created: 2026-11-02
completed:
status: planned
categories: [board-app]
type: implementation
model: strong
persona: Front-end performance engineer — a control that is thrown away and drawn again a moment after it appears is a bug even when nobody sees it: it drops focus, races tests and wastes a frame.
skills: [cortex-architecture]
tracker:
---

# Task: The Chat Header Draws Its Pickers Once

## Problem Statement

Point 387. The chat panel's header (`chat-header`) draws its pickers, then about 75 ms after the panel
opens draws them again: the first ones leave the page and new ones take their place. It was already so
at commit 8d8be60. Nobody sees it, but `tests/pages/chat-panel.spec.ts` `fits` caught a picker on its
way out, so commit 29a67db made that test measure again (`toPass`). The maintainer wants the cause
found and fixed in the product.

## Steps

1. Reproduce: in a page spec or a throwaway script in `temp/`, watch `chat-header` with a
   MutationObserver from the moment the panel opens and record what is removed and added, and when.
2. Find the cause: what changes about 75 ms in (agents or models arriving, a keyed `{#each}` or `{#key}`
   whose key changes, a `$state` replaced instead of updated, a component remounted by its parent). Say
   it in the notes, with file and symbol.
3. Failing test first: a page spec that fails while the pickers are replaced after opening (same element
   before and after the data arrives). Then fix it so each picker is drawn once and updated in place.
   Svelte 5 runes only (`.kiro/steering/svelte-conventions.md`).
4. Keep the `toPass` in `fits` only if it still has a reason; if the redraw is gone, put the plain
   measure back.
5. Look in a browser, light and dark: the pickers, focus kept on a picker while data arrives.
6. Checks: unit, `npm run verify`, `check`, the chat panel specs and the plugin suite, at `nice -n 15`,
   at most 3 workers.

## Constraints

- Work only in the worktree you are given (branch `feat/header-redraw`). No commits.
- Ports: `VB_TEST_PORT=5610` (plugin), `5710` (pages). Never 4466 or 4600–5599.
- No protected files. Don't write `cortex/LOG.md` or `cortex/AUDITED.md`: the orchestrator logs.
- STOP and report if the fix needs a contract or seam change.

## Implementation Notes
