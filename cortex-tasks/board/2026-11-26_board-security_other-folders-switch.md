---
task_name: A board-menu switch lets agents from other folders in
created: 2026-11-26
completed: 2026-11-26
status: completed
categories: [board-security]
type: implementation
model: strong
persona: Principal security engineer for local agent tooling — the person opens a door on purpose, it is recorded, and every other guard stays shut.
skills: [cortex-architecture]
tracker:
---

# Task: A board-menu switch lets agents from other folders in

## Problem
An agent whose working folder is not the board's open folder is refused with `wrong-folder`
(`apps/board/server/caller-folder.ts` `checkFolder`). The maintainer uses the board with agents from other repos
and needs to let them in on purpose.

## Rulings (maintainer, chat points 842-845)
1. A toolbar-menu item (`apps/board/src/board/chrome/ToolbarMenu.svelte`, a menuitemcheckbox like the others),
   "Let agents from other folders in", off by default.
2. Stored as the person's act in the ledger (like lock/unlock), so it survives restarts, belongs to that ledger, shows
   in history, and goes through the one action layer. Contract first (`packages/format`), `npm run gen`.
3. On: `checkFolder` no longer refuses a header naming another folder. Everything else stays: the board grant
   before writing, a secret from another ledger of the open folder is still `wrong-folder` (844), reads still name
   the open folder (`project`). Off: exactly today's behaviour.
4. A new decision entry D-120 in `docs/decisions.md`, appended (approved by the maintainer, 845); existing entries
   untouched.
5. Behind a flag in `packages/format/src/flags.ts`, on by default. Words in words files. No skill change.
6. Tests: unit tests for `checkFolder` (switch off refuses, on lets in, other-ledger secret still refused) and the
   act's rules; one page spec for the menu item. `npm run verify`. No full page suite.
