---
task_name: The Chat Header Draws Its Pickers Once
created: 2026-11-02
completed: 2026-11-02
status: completed
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

**Reproduced** (`tests/pages/chat-panel.spec.ts`, the new test "the header draws its pickers once"): a
MutationObserver on the page from the click that opens the panel recorded `agent at 45 ms`, `model at 45 ms`
(the pickers leaving the page), on this machine, the moment the folder's list of what was allowed arrived.

**Cause.** Not Svelte: the header is the plain element `packages/chat/src/header/chat-header.ts`
(`ChatHeader.show`). Every `show` built the whole header from `headerTemplate` and swapped it in: it removed
every child but the allowed list and prepended the new markup, so each call threw the pickers away. The panel
calls `show` on every `render()` (`apps/board/src/shell/chat-panel.ts` `render`). After the first draw on
opening (`loadDrawing` → `render`), `loadDrawing` calls `allowed.load(true)`; when `list_permissions` answers,
`createAllowed`'s `set` calls `changed` → `render` → `show` again, a few tens of ms later (the "about 75 ms").
Every chat event (`use` → `watchChat` → `render`) did the same. The agents and models never change here
(`AGENTS`, `MODELS` are constants); the markup was simply rebuilt whatever changed. This broke
`docs/principles.md` § Component model, "Update in place".

**Fix.** `packages/chat/src/morph.ts` (new, 25 lines, in the chat package because it imports nothing from the
repo): `morphNodes(now, next)` makes the nodes drawn match the markup the template makes again, by position
and kind, changing attributes and text only; a different number or kind of nodes returns false and the caller
puts the new ones in. `morph` does one element, and a `<select>` shows the option its markup selects
(`defaultSelected`), so a picker the person changed goes back to the session's choice when the host redraws it
(e.g. New session cancelled), as the full redraw did. `ChatHeader.show` now morphs its nodes (all but the
list) and only falls back to putting new ones in on the first draw or a shape change (a picker becoming plain
text). The template, `HeaderView`, the events and `show`'s signature are unchanged: no contract or seam change.
Focus logic kept: Stop turning off still moves focus to New session; focus is only called when it moved.

**Tests.** Failing first: the new page test failed with the two pickers removed at 45-46 ms; passes after the
fix (also confirmed red again by forcing the old path for one run). `fits` no longer needs `toPass` (the
picker is never on its way out), so the plain measure is back. The "New session asks first" test now also
picks a model, cancels, and expects the picker to show the session's model again (the property/attribute
risk of updating a `<select>` in place).

**Browser look** (a throwaway board on port 5711, an empty project in the scratchpad, no messages sent):
light and dark; opening the panel, the Agent picker is the same element before and after the list arrives
(none removed); with focus on a picker, reading the list again (`chat-allowed`) keeps focus and the focus ring
(dark checked by eye); switching agent Claude → Kiro keeps the Model picker element and updates its options
(3 → 2) and choice. Opening the panel itself moves focus to the composer's text, by design (not this change).

**Checks** (`nice -n 15`, at most 3 workers): unit `npm test` 2207 + 14 timing pass; `npm run verify` ok;
`npm run check` 0 errors; pages (`VB_TEST_PORT=5710`) every `chat*` spec, `gallery`, `access-by-bot`,
`send-access`: 170 passed; `chat-panel.spec.ts` again after the last edit: 13 passed; plugin suite
(`VB_TEST_PORT=5610`): 79 passed. The full page suite was not run (left for the set's gates).

**Caught Beyond the Brief.**
- The page spec file is now 306 lines (verify warns over 300; was 289). Not split.
- The panel's open always takes focus to the composer, so "focus kept on a picker while data arrives" only
  happens when the person moves to a picker before the list or an event comes; checked by focusing it and
  making the header redraw.
- The feed and composer already update in place; the header was the one chat element still rebuilt on every
  `show`. `morph.ts` could serve others (e.g. the composer's line, the allowed list), not done here.
- Housekeeping: my first test run started from the `tidy` worktree (the shell's default directory), so the
  global setup rebuilt that worktree's `apps/board/dist` (ignored build output; its `git status` stays clean).
  After that every command used absolute paths into this worktree.
- No security concerns: no new input, route or network call.
