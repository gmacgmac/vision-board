---
task_name: Copy the skill into each installed client (npm run skill:install)
created: 2026-11-24
completed: 2026-11-24
status: completed
categories: [board-agent, project-docs]
type: implementation
model: strong
persona: Developer-tools engineer — an installer that never leaves a half copy, never edits a setting it was not asked to, and says in one line per client what happened and what to do next.
skills: [cortex-architecture, cortex-docs]
tracker:
---

# Task: Copy the skill into each installed client (`npm run skill:install`)

---

## Problem Statement

D-057 links each client's skill folder to `skills/vision-board/`. Kiro Crew does not follow links, and on the
maintainer's machine the links are gone: `~/.claude/skills/vision-board` and `~/.kiro/skills/vision-board` do
not exist; `~/.kiro/crew/skills/vision-board` is a hand-made copy. Agents in Claude Code, Kiro CLI/IDE and Kiro
Crew should all get the skill, kept current without anyone remembering to copy it, and be told whether the
board's MCP server is set up. Design approved by the maintainer (chat points 739-755).

---

## How it meets the principles

- **Reuse.** The build's exports (`skills/vision-board/source/build.mjs` `buildSkill`, `stale`, `SKILL_FILE`) say
  what ships and whether `SKILL.md` is current; nothing re-derives the reference list. Atomic writes reuse
  `apps/board/server/atomic-file.ts` `writeFileAtomic`. The client table reuses `packages/mcp/README.md`'s.
- **One job per file.** Logic in `apps/board/server/skill-install.ts` (clients, copy, compare) and
  `apps/board/server/skill-mcp.ts` (MCP detect, add, the Kiro file merge); the command in
  `apps/board/bin/skill-install.ts`; board start calls the same function from `apps/board/server.ts`.
- **Words.** Every printed sentence in `apps/board/server/words/bin.ts`, a `skill-install.ts` section (area `bin`,
  already "the board's command-line tools"; no new home).
- **Flag.** `skillInstallAtStart` in `packages/format/src/flags.ts` (on: the approved design runs it at start).
- **Standalone only.** Only `apps/board/server.ts` calls it; a host's engine never does. It also skips a linked
  git worktree, so a work-in-progress skill never replaces the person's (steering § Worktrees).
- **Tests** against a temporary `HOME` and a fake `claude` runner; the real home is never read or written.
  `apps/board/tests/skill-install.test.ts`, not `scripts/`: `npm run verify` forbids `scripts/` importing the app.

---

## Steps

1. **Clients** (`skill-install.ts` `CLIENTS`): Claude Code (`~/.claude` → `skills/`), Kiro CLI and IDE (`~/.kiro` →
   `skills/`), Kiro Crew (`~/.kiro/crew` → `skills/`). Installed = its own folder exists; then `skills/` is made.
   A missing client is skipped, never an error.
2. **What ships** (`skillFiles`): `buildSkill('standalone')`'s files (the skill and the references its text names),
   plus `examples/` when a shipped file names `examples/`. Never `NOTES.md`, `scenarios.md` or `source/`.
3. **Stale check**: `stale()` non-empty → refuse, exit 1, tell the person to run `npm run build:skill`.
4. **Copy** (`copyInto`): into a temporary sibling (`.vision-board.<pid>.tmp`), then swap: old → `.old`, temp → in,
   `.old` removed. A failure removes the temp folder and puts the old one back.
5. **Report**: one line per client (copied / skipped / failed and why), then one next-step line per copied client.
   Exit non-zero on a real error or when no client is installed.
6. **MCP report** (`skill-mcp.ts`): per installed client, set up or not, found by args containing
   `packages/mcp/bin/vb-mcp.ts` (any name). Claude Code `~/.claude.json` top-level `mcpServers`; Kiro CLI/IDE
   `~/.kiro/settings/mcp.json`; Kiro Crew `~/.kiro/crew/mcp.json`. Missing → that client's setup line, then one
   line: ask the person before running `--add-mcp`.
7. **`--add-mcp`**: adds only missing entries, named `vision-board`; never changes or removes one. Claude Code
   through `claude mcp add --transport stdio --scope user vision-board -- <node> <repo>/packages/mcp/bin/vb-mcp.ts`;
   the Kiro files by inserting the entry into `mcpServers` as text (the rest byte-for-byte), checked by parsing,
   written atomically with the file's mode kept. A `vision-board` name held by another server is left alone and
   reported. `<repo>` is the main checkout, also when run from a worktree.
8. **Board start**: `apps/board/server.ts`, flag `skillInstallAtStart`, outside a linked worktree: when an installed
   client's copy is missing or differs (dotfiles ignored), run the install without `--add-mcp` and print the lines.
   A failure there never stops the board.
9. **Hooks**: `.githooks/post-commit` and `.githooks/post-merge` run `npm run skill:install` on `main` when the
   commit (or `ORIG_HEAD..HEAD`) changed `skills/vision-board/`. `git config core.hooksPath .githooks` is documented
   in SETUP.md, never set by us.
10. **Docs**: SETUP.md § 5 replaces the `ln -s` table; `packages/mcp/README.md` notes the report;
    `tests/evals/bot/standalone.ts` comment points at D-118.
11. **Protected (draft, maintainer's yes first)**: `AGENTS.md` paragraph, steering § Running line, D-118 entry.

---

## Acceptance

- `apps/board/tests/skill-install.test.ts` passes: all installed, some missing, none installed, stale skill, an
  existing folder replaced, MCP present / missing / present under another name, `--add-mcp` leaving other
  entries alone (byte-for-byte), and a name held by another server.
- `npm run verify` and `node --test scripts/words.test.mjs` pass; flags tests pass.
- Run once for real without `--add-mcp`; its output reported.

---

## Results

- **Built**: `apps/board/server/skill-install.ts` (`CLIENTS`, `skillFiles`, `copyDiffers`, `replaceFolder`,
  `installSkill`, `needsInstall`, `mainCheckout`, `boardMcpEntry`, `runSkillInstall`), `apps/board/server/skill-mcp.ts`
  (`mcpStatus`, `addMcp`, `insertServer`, `claudeAddArgs`, `shellLine`), `apps/board/bin/skill-install.ts`,
  `npm run skill:install`; words in `apps/board/server/words/bin.ts` § skill-install.ts; flag `skillInstallAtStart`;
  `apps/board/server.ts` `installSkillAtStart`; `.githooks/post-commit`, `.githooks/post-merge`.
- **Decision number**: D-117 was already taken (the remote door), so the new decision is D-118.
- **Test location**: `apps/board/tests/skill-install.test.ts` (14 tests), not `scripts/`: verify forbids `scripts/`
  importing the app (`scripts/verify.mjs` `checkReferences`).
- **Checks**: the new tests 14/14; `scripts/words.test.mjs`, `scripts/verify.test.mjs`, `flags.test.ts` 43/43;
  `npm run verify` ok; `tsc -p tsconfig.json` clean. No page code changed, so no page suite or browser look.
- **Docs**: SETUP.md § 5 rewritten (the command, its table, the hooks line; Codex stays a hand-made link);
  `tests/evals/bot/standalone.ts` points at D-118.

### Protected drafts (await the maintainer's yes; not written)

`AGENTS.md`, a new paragraph after its one line:

> After changing `skills/vision-board/`, run `npm run build:skill`, then `npm run skill:install`; `npm run board` also
> runs it at start. It copies the skill into each installed client (Claude Code, Kiro CLI and IDE, Kiro Crew) and
> reports whether each has the board's MCP server. Clients get copies, not links, because Kiro Crew does not follow
> links (D-118). Ask the person before running it with `--add-mcp`: that changes their client settings.

`.kiro/steering/vision-board-proj.md` § Running, the line about links becomes:

> - Kiro in the chat panel runs as the `vision-board` agent, from this repo's `skills/vision-board/SKILL.md`;
>   `npm run skill:install` copies it to each installed client (D-118).

`docs/decisions.md`, appended:

> ## D-118 The skill is copied into each installed client by one command (replaces D-057's links)
> - **Date**: 2026-11-24 · **Status**: Accepted (maintainer, chat points 739-755) · **From**: Kiro Crew ignores a linked skill folder, and the links were gone
> - **Decision**: `npm run skill:install` copies the built skill (`SKILL.md`, the references its text names, and `examples/` when named) into `skills/vision-board/` of each installed client, one whose own folder exists: Claude Code (`~/.claude`), Kiro CLI and IDE (`~/.kiro`), Kiro Crew (`~/.kiro/crew`). The folder is replaced whole through a temporary sibling. It refuses a skill `npm run build:skill` has not rebuilt. It runs at the standalone board's start when a copy is missing or differs (flag `skillInstallAtStart`; not from a git worktree), and from the `.githooks` `post-commit` and `post-merge` hooks on `main` when `skills/vision-board/` changed. It reports per client whether the board's MCP server is set up, found by what it runs (`packages/mcp/bin/vb-mcp.ts`), not its name; `--add-mcp` adds the missing entries as `vision-board`, never changing one, and an agent asks the person before using it. The MCP name `vision-board` and the one source in this repo stand from D-057.
> - **Why**: links do not reach every client (Kiro Crew), and a copy kept current by one command at start and at commit cannot drift for long. Rejected: links (Kiro Crew ignores them); a prompt at commit time (agents commit with no keyboard).
> - **Task**: cortex-tasks/board/2026-11-24_board-agent_skill-install.md
