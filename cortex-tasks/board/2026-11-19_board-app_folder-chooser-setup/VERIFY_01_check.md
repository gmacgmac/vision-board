# VERIFY_01 — Follow the guide; one check per ruling

Model: standard · Skills: — · Ports: 8720, 8730

## Objective

Prove the set works as the person and a new machine meet it: follow `SETUP.md` from a clean temporary home, and check
each ruling of PLAN § Decisions once.

## Steps

1. **New machine.** `HOME=<a new temp folder>` for every command. Clone this worktree's branch into another temp folder
   (`git clone` from the local path). Follow `SETUP.md` exactly, step by step, but start the board on port 8730
   (`VB_PORT`), never 4466. For each client, write its MCP entry and skill link inside the temp home only; for clients
   not installed here, check the file you wrote parses (JSON or TOML) and the link resolves. Prove the MCP server
   works: start `packages/mcp/bin/vb-mcp.ts` against the 8730 board, speak to it over stdio (initialize, tools/list,
   `list_boards`), and note the answers. Record every place the guide was unclear, wrong or missing a step.
2. **Rulings** (on the worktree, board on 8720, temp `HOME`):
   - Decision 1: the dialog is wide, a long folder name wraps (screenshot light and dark); the "Choose in Finder…"
     button shows on macOS and Tab reaches it.
   - Decision 2: with the injected chooser (the tests' runner, or the documented test hook): an outside-home folder
     opens and appears in Recent; the same path sent without the chooser is refused; a hidden one is refused with
     words. Read the server code path once and confirm only chooser or recent paths pass outside home.
   - Decisions 3-5: `SETUP.md` names each client and the ChatGPT reason; skill steps are links; MCP set-up lives in
     `packages/mcp/README.md` only.
3. Report: pass or fail per item, with evidence (commands, outputs, screenshot paths). Fix nothing; list fixes.

## Constraints

Never the real home folder, never port 4466, no git command that changes state, no edits except this file's notes.

## Implementation Notes

_Fill in on completion._
