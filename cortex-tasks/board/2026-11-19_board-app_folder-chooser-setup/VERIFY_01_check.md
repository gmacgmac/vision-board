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

All items pass; nothing fixed. Scratchpad: `/private/tmp/claude-501/-Users-dev-Dropbox--Personal--Developer-web-apps-vision-board/f2a24d35-ec00-4d2c-8e6d-d8eba2a95d55/scratchpad/` (temp homes `home1`, `home2`; scripts `mcp-probe.mjs`, `launch8720.mjs`, `api-check.mjs`, `api2.mjs`, `ui.mjs`; shots `shot-{light,dark}-list.png`, `shot-light-chosen.png`, `shot-light-hidden.png`). Servers on 8720 and 8730 stopped; 4466 never touched.

**1. New machine: PASS.** Clone of branch at cd2a5993, `npm ci` ok (62 packages, 0 vulnerabilities), `npm run board` with `VB_PORT=8730` built, served, `curl` 200. Wrote by hand in temp home: `~/.claude.json`, Claude Desktop config, `~/.kiro/settings/mcp.json` (all parse as JSON), `~/.codex/config.toml` (parses with tomllib); the four skill links (`~/.claude/skills`, `~/.kiro/skills`, `~/.kiro/crew/skills`, `~/.agents/skills`) each list `SKILL.md`. `vb-mcp.ts` over stdio from the clone: initialize ok (protocol 2025-11-25, server `vision-board` 1.46.0), tools/list 14 tools, `list_boards` answered `project` = the clone, `ledger` main, 3+ boards. Run from another folder it answered the `wrong-folder` text instead (see gap 3).
Guide gaps, wrong or missing:
 1. Step 3: the board starts read-only ("Opened read-only: nothing is written until you switch the board to Editing (or start with --edit, or VB_EDIT=1)"); SETUP never says so, and an agent that draws will meet `read-only`. Missing step: say how to switch to Editing, or the `VB_EDIT=1` start.
 2. Step 3 check uses port 4466 only; no mention of `VB_PORT` for a busy port (I used it; the README has it). Minor.
 3. Step 4/6: the `wrong-folder` case is the first one a new machine meets when the client starts in a different folder than the board has open (I hit it). The table says stop and tell the person; it does not say the fix is to open that folder in the board (or set `VB_PROJECT` in the entry's `env`, `packages/mcp/README.md` Settings). Add one line.
 4. Step 4's table repeats each client's file path and restart step that `packages/mcp/README.md` § Adding it to a client also holds (the JSON itself is written once). Decision 3 says that README is the one home: two copies to keep true; consider linking the README row instead.
 5. Step 4 gives `claude mcp add --scope user` with no command; the full line (`--transport stdio`, `--`) is only in the README. An agent must follow the link; the step should say so in the Claude Code row.
 6. Step 5 puts "make the folder first" after the table; fine, but the link commands fail with "No such file or directory" if read in order. Move the sentence above the table.
 7. The dialog's own subtitle still reads "Under your home folder. The board then shows that folder's boards..." (screenshots) though Choose in Finder… now opens folders anywhere: stale words, `docs/specification/words.md` area (T_01).

**2. Decision 1: PASS.** Page served from the worktree dist, injected runner offers the chooser (`list_folders` `chooser: true`). Dialog `boundingBox().width` 720 light and dark. A 100-character folder name wraps to 2 lines (lines 1.999, `scrollWidth <= clientWidth`, never cut) light and dark; the Recent row with the whole outside path wraps too (shots). "Choose in Finder…" button visible; from the first control, Tab reaches it after 6 presses (focus ring on it in both shots).
**Decision 2: PASS.** Server code read: `open_project` (`apps/board/server/open-folder.ts` `openProject`) is the only handler that opens a path outside home, through `resolveVouched(home, path, raw => chooser.picked(raw) || readRecent(home).includes(raw))`; the other callers are `list_folders` (`resolveFolder`, home only), the recent list (the server's own file, `resolveVouched(...,() => true)`), and `startFolder` (`recent.ts`, `resolvePicked`); `project.open` has the single caller. Runs (temp home, drive folder outside it):
 - outside folder sent without the chooser: 403 "Only folders under your home folder can be opened..."; an unpicked sibling and a `..` path the same.
 - same path after `choose_folder` picked it: pick 200 `found: true, boards: 1`; `open_project` 200; the page title became `outside-example · Vision Board`; it is in `recent` (list and `recent.json`); an unpicked outside folder stays 403 after.
 - hidden pick (`.hidden-dir/proj`): 422 `invalid` "is hidden (a part of its path starts with a dot), so it can't be a project folder. Choose a folder that is not hidden." (and in the dialog's problem line); sent straight to `open_project`: 403.
 - home itself: 422 "is your home folder or holds it"; an ancestor of home (`/private/tmp/claude-501`): 422 same; cancel: `{cancelled: true}`; no cookie: 403; foreign Origin: 403.
**Decisions 3-5: PASS.** SETUP names Claude Code, Claude Desktop, Kiro CLI, Kiro IDE, Kiro Crew, Codex; ChatGPT app on the web named and left out with the reason (internet-only MCP servers, board stays on the machine); skill steps are `ln -s` links, never copies (Claude Desktop named as the one client with a ZIP only, "do not do it without their yes"); the MCP entry JSON exists only in `packages/mcp/README.md` (no `mcpServers` in `SETUP.md`), SETUP and the repo README link to it. Caveat: gap 4.
Nothing in the real home was written; the board's own start wrote `~/.kiro/agents` and `~/.kiro/vision-board` into the temp home only.
