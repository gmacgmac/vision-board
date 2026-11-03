# Bot Quality Follow-ups - Plan

> Points 398, 400, 402 (maintainer's yes, 2026-11-03). Decision: D-083. Base: branch `feat/bot-quality`.

## Problem

1. (402) `answered` on an agent's read repeats a reply's words (`{kind:'reply', seq, text}`), context the board already
   holds. The maintainer: the mark says only what answered the note and where; when unsure, the bot reads the card.
2. (398) Every new flag changes `FlagName` in `plugin.d.ts`, so `SEAM_TYPES` must be recomputed by hand. Flags are
   additions (D-078); flag names should not count toward the seam's fingerprint.
3. (400) Sub-agents slipped into the wrong checkout three times. A script makes a task's worktree, and every brief
   names its absolute path.

## Solution

- ANSWER_01: drop `text` from the `reply` kind of `NoteAnswer` (`packages/actions/src/note-answer.ts`), its schema
  (`$defs/noteAnswer`), `openapi.json` (version up), `api.md` point 172, tests; `SKILL.md` one line: unsure what a note
  said or what answered it, read its card (`show_node`); version up. Eval the two scenarios that cover notes.
- SEAM_01: flag names typed as `string` where they cross the seam (`plugin.d.ts`, made by `apps/board/bin/plugin-types.ts`),
  so a new flag leaves `SEAM_TYPES` alone; inside the app `FlagName` stays the checked union. `plugin.md` says so.
- WT_01: `npm run worktree -- <name> [--base <branch>]`: makes `.claude/worktrees/<name>` on `feat/<name>`, links
  `node_modules`, prints the absolute path and a free `VB_TEST_PORT`. Refuses an existing name or branch.

## House Rules

- Sub-agents never commit, never write `cortex/LOG.md` (the orchestrator logs and commits), never touch `docs/decisions.md`.
- Work only in your own worktree (absolute path in your brief); never `cd` elsewhere; never port 4466.
- Tests at `nice -n 15`, at most 3 workers. `seam.ts` `SEAM_TYPES` is set by the orchestrator after merging.
- Gates: `npm run verify`, `npm run check`, unit tests; page or plugin specs for what changed.
