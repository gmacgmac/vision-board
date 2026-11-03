---
task_name: Plugin Skill Live Run
created: 2026-11-03
completed:
status: planned
categories: [board-agent]
type: research
model: strong
persona: QA engineer for agent integrations — a real model is run exactly as a host would run it, every claim is something seen happen with the log line to show it, and no run can go on longer than it was allowed to.
skills: [cortex-research]
tracker: M48
---

# Task: Plugin Skill Live Run

## Problem Statement

Tracker M48, point 392 (maintainer: run it on a Claude model; "ensure that there's no eternal loops").
The plugin folder (`dist/plugin/board/`) ships `skill.md`, the instructions a bot under a host reads,
cut from `skills/vision-board/SKILL.md` by `apps/board/plugin/words/skill-edits.ts`. No real model has
followed it. Run a real Claude model as a host's bot would run: `skill.md` as its instructions, only
the tools a host gives (`engine.tools`, D-080), on a board in a host page. Test only: no product changes.

## Steps

1. Build the folder (`npm run build:plugin` or what `apps/board/bin/build-plugin.ts` says) and read
   `skill.md`, `docs/specification/plugin.md` (§ The chat, § Tools, § Where the board lives in nclite).
2. A throwaway host in `temp/plugin-live/`, reusing the fake host (`tests/plugin/fake-host/server.ts`,
   `host.js`, `chat.js`) rather than writing a new one. It serves the built folder on port 6010 and puts
   `engine.tools` behind a stdio MCP server (the repo's MCP SDK, no new dependency) that the model's CLI
   starts. The board folder is a fresh one under `temp/plugin-live/workspace/` (D-077).
3. The model: `claude -p` (Claude Code's print mode), `--model sonnet`, `skill.md` as the system prompt
   (`--system-prompt-file`), `--mcp-config` with `--strict-mcp-config`, `--tools` limited to the board's
   MCP tools plus `Write` for pictures (and nothing else), `--permission-mode` so it never waits on a
   prompt, `--add-dir` only the workspace.
4. Runs, each a short prompt, and record what was seen:
   a. Draw: asked to lay out three choices for a small plan; it draws cards with `write_board` (keys,
      no coordinates, the right kinds).
   b. Answers: the person (Playwright on the host page, or the engine's person actions) gives ✓, ✗ and
      a note; Send goes as the host's message with the answers chip; the bot reads exactly those and
      answers the note with a reply or an append, and asks again where it still needs a ✓.
   c. Picture: asked to show a small picture (an SVG or PNG it writes), it puts it in the `images/`
      folder of the board folder it was told, and a card shows it (D-077).
   d. Refusals: asked to tick a card itself, it says it can't (✓ is the person's); a tool not given
      (`join`) is not tried, or fails cleanly.
5. Write the result in Implementation Notes: passed / failed per run with evidence paths in
   `temp/plugin-live/`, what in `skill.md` confused the model (quote the line), and suggested wording.
   A finding is reported, not fixed.

## Hard limits (no endless loops; maintainer's condition)

- Every `claude -p` run: `--max-budget-usd 0.50`, and wrapped in a wall-clock kill after 180 s
  (`timeout` / `gtimeout`, or a `setTimeout` that kills the process group). If the CLI has a max-turns
  option, set it to 15.
- At most 8 model runs in total, retries included. Never loop a run on failure: one retry at most, then
  report it.
- Any `check_responses` `wait` at most 30 s. The harness polls nothing without a deadline.
- Stop everything you started when done (host server, MCP server, browser); port 6010 free after.

## Constraints

- Work only in the worktree you are given (branch `feat/plugin-live`). No commits, no product code.
- Port 6010 only. Never 4466, never kill a process you didn't start.
- Don't change `~/.claude` or any settings outside the worktree. Don't write `cortex/LOG.md` or
  `cortex/AUDITED.md`.

## Implementation Notes
