# Plan: Access Clarity

## Problem
An agent cannot tell from a read what it may write, so it sends writes that fail (`needs-grant`), wasting a whole batch
(27 card rewrites in the case that started this). Each new chat panel session joins as a new agent, so it does not hold
the containers an earlier chat in the same folder made, and every chat that gets access adds its name to the container
title. Separately, the host's Save as PDF (WebKit) paints the container frame's CSS mask as solid squares.

## Solution
- **Reads say who you are and what you may write** at every tier: make a board (any joined agent), add containers (board
  `held`), write in a container (container `held`, done in commit f47f23b4). `request_grant` answers by the same rule.
- **One chat identity per folder's ledger**: every chat panel session the person starts there is the same agent, holding
  what earlier chats made. The skill tells it to ask the person when it lacks the context to change what is there.
- **Holders as one chip** on the container title, its list on hover or focus, Remove kept.
- **Print-safe frames**: the corners are cut with `clip-path`, not `mask`, on screen and in print; a check keeps CSS
  masks out of what the board ships, and the plugin spec says which CSS a host's PDF engine can't record.

## Decisions (maintainer, points 692-705, 2026-11-20)
1. Agent reads (`get_board`, `show_container`, `list_boards`, `show_node`, `list_open`) carry `you: { agent, label }`
   for a joined agent; a read by a client that has not joined carries `joined: false` (it can read, must `join` to
   write). Under `botToolRules`, like the other caller marks.
2. `request_grant` answers `held` only when a write would pass: the board by `holds`, a container by `mayAnswerIn`.
3. The instructions (MCP `info.ts`, tool descriptions, skill § Access) state the three tiers in one line: make a
   board, always; add containers, the board `held`; write in a container, it `held`; else `request_grant` first.
4. An eval scenario writes into another agent's container: it passes only when `request_grant` comes before any write
   there and no item answers `needs-grant`.
5. D-114: one chat identity per ledger in a folder. The first chat after this change adopts the folder's most recent
   chat agent if there is one, else a new one; the containers and boards earlier chat agents of that ledger hold are
   granted to it once (every chat was the person's click). Agents outside the panel (MCP clients) keep their own ids.
   The ledger's read-only switch still stops every write.
6. The skill adds: cards you did not draw in this conversation may come from an earlier chat; read them first, and if
   you lack the context to change them well, ask the person in the chat before writing. Never change what you don't
   understand.
7. Holders: one chip (person icon and count) after the title; hover or focus opens the list (label, creator marked,
   when joined), each removable holder with its Remove. Same shrink order as today's holders.
8. D-115: the board ships no CSS `mask`; the container corners are a `clip-path` polygon (Fable 5.2 reproduced the
   WebKit PDF fault and proved the polygon in a WebKit PDF). A verify check fails on `mask`/`-webkit-mask` in shipped
   CSS other than `none`; `docs/specification/plugin.md` lists the print-safe rule and any other paint feature found
   unsafe in a WebKit PDF.

## House Rules
- Worktrees: each wave-1 task has its own, from main, made by the orchestrator. Ports: T_01 6100, T_02 6200,
  T_04 6300, T_03 6400, VERIFY 6500. Never 4466. Page tests use a temporary HOME with
  `PLAYWRIGHT_BROWSERS_PATH=/Users/dev/Library/Caches/ms-playwright`.
- Orchestrator only: `docs/decisions.md`, this folder's TASK-STATUS.md, merges and commits.
- Tests: each task runs the tests for what it changed; the full page suite runs once, in VERIFY_01.
- `npm run eval:bot` (Haiku) passes before the skill merges; compare with the same scenarios on main, as misses on
  timeline, import and copy predate this set.
- No PII. No git commands that change state by executing agents. `/Users/dev/AI/nclite` is read only.
