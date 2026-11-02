---
task_name: Claude Code Live Test
created: 2026-11-02
completed:
status: planned
categories: [board-agent]
type: research
model: standard
persona: QA engineer for agent integrations — a real agent is run end to end exactly as a person would use it, and every claim in the result is something that was seen happen, with the log line to show it.
skills: [cortex-research]
tracker:
---

# Task: Claude Code Live Test

## Problem Statement

The deferred Claude Code live test (maintainer approved, 2026-11-02). The Kiro live test (Kiro on
Sonnet) passed earlier; Claude Code was never run live with attachments, nor with today's Send changes
(points 377, 383, 384). Test the board's chat panel with a real Claude Code session, as a person uses
it. Test only: no product changes.

## Steps

1. Start the board from your worktree on port 5810 with a fresh project folder in `temp/`
   (`npm run board`; `VB_PROJECT` for the folder; find how the port is set). Never 4466.
2. Reuse the earlier harnesses, pointed at 5810 and agent `claude`: `temp/live-attach.mjs` (API) and
   `temp/live-read.mjs` (the real page in Chromium) in the main checkout's `temp/` (absolute path:
   `/Users/gm/Library/CloudStorage/Dropbox-Personal/Developer/web-apps/vision-board/.claude/worktrees/tidy/temp/`),
   and its documents in `temp/verify-01/docs`. Copy what you need into your worktree's `temp/`.
3. Check, and record what was seen for each:
   a. The five attachment questions of `live-read.mjs` (Word section and diagram, Excel formula and
      name, a diagram-only PDF, a 3000 px picture, a 4.5 MB picture): right answers, no approval asked.
   b. Access rules: a read outside the project folder is refused or asked, as the board's rules say
      (`apps/board/server/chat-access.ts`, `chat-permissions.ts`); a closed file is denied.
   c. Drawing: the agent draws a few cards; the person (you, through the page) answers ✓, ✗, a note;
      Send; the agent reads exactly those answers and redraws. Send goes dark after; a second answer
      lights it again.
   d. Send while the agent is busy (point 383): press Send mid-reply; the answers go when it is free,
      and the ledger has the press line and the line when it went.
4. Write the result: what passed, what failed, with log lines or screenshots in `temp/`. A failure
   is reported, not fixed.

## Constraints

- Work only in the worktree you are given (branch `feat/cc-live`). No commits, no product code.
- Port 5810 only. Never 4466. Stop the board and every process you started when you finish.
- Keep it small: a short prompt per check; Claude Code on its default model.
- Don't change `~/.claude` or any settings outside the worktree. Don't write `cortex/LOG.md` or
  `cortex/AUDITED.md`.

## Implementation Notes
