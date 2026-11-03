# Bot Quality: Rules The Tools Enforce, Instructions Proven By Scenarios

> Points 393 and 394 (maintainer, 2026-11-03): "autonomous freedom to figure out a solution ... very high
> quality ... perhaps we need to change the way we do a few things. Explore ideas, test them, come back with a
> proposal." Checkpoint: tag `checkpoint/before-bot-quality` (d1fb7b7). Work stays on `feat/bot-quality`; main
> and the maintainer's board are not moved until the maintainer says so in the morning.

## Problem

The plugin bot's live run (`cortex-tasks/board/2026-11-03_board-agent_plugin-skill-live-run.md`, evidence
`temp/plugin-live/`) passed its main paths but showed:

1. **A loop risk.** Asked to wait, the bot held its turn with `check_responses` `wait: 60`, twice. The skill
   forbids it; the tool description and the MCP server's instructions offer it. Only the test's caps bounded it.
2. **Wrong instructions from the server.** `#mcp` `createMcpServer({ tools })` sends standalone's instructions
   (`join`, `wait` up to 60 s) to a host's bot.
3. **Reads that hide the truth, so prose must fill in.** `get_board` shows a note without its reply, so the bot
   answered a note twice; a bot can't tell it holds a board, so it asked a grant on its own.
4. **Keys reused across turns** (`conflict`, recovered each time, a wasted call each time).
5. **Wording slips**: paragraphs and lists after "Done."; ticks proposed on the person's word alone.
6. **Point 394**: `c` notes the selected card, not the focused one.

## Approach: three levels, strongest first

The idea under all of it: a rule a bot must not break is enforced by the tool, not asked of it in prose;
a fact the bot needs is in what it reads; prose carries only judgement. And prose is code (`cortex-architecture`
rule 11): it changes only against scenarios that show it works.

1. **Enforce in the tools (TOOLS_01).** A host's bot is given no `wait` on `check_responses` (its schema, from
   the one tool table, per host: `x-hosts`), and the engine refuses one from a plugin caller. The MCP server's
   instructions come per host from the words, so a host's bot never reads `join` or `wait`. Reads say what the
   bot needs: a note owed or answered; a board this bot holds. A key conflict answers what the key was used for
   and a fresh-key hint. All behind one flag in `packages/format/src/flags.ts`, on by default, so off is the
   revert.
2. **Prove the instructions by scenario (EVAL_01).** A committed, on-demand eval: real model, the plugin as a
   host runs it, scripted person actions, scored deterministically from the tool-call log and the chat text
   (no model judging a model). Hard limits built in (below). Not in CI: it costs money; `npm run eval:bot`.
   Baseline on today's code first, so every later change is measured against it.
3. **Then the words (SKILL_01).** Findings that remain after 1 are fixed in `skills/vision-board/SKILL.md`
   (through `apps/board/plugin/words/skill-edits.ts` where only the plugin's copy changes), each change kept
   only if the eval shows it helps and breaks nothing.

Point 394 (KEY_01) is separate board-ui work: find whether `c` on the selection is by design; fix if not.

## Hard limits on every model run (maintainer: "no eternal loops")

Every run: `--max-budget-usd 0.50`, `--max-turns 15`, a 180 s kill of the process group, `wait` clamped
by the harness, every harness call with a deadline. Per task a run cap (EVAL_01 10, SKILL_01 24, final 10);
the whole set at most $10. No retry loops: one retry, then report. A limit that can't be enforced is BLOCKED.

## House Rules

- Sub-agents never commit and never write `cortex/LOG.md` or `cortex/AUDITED.md`; the orchestrator does.
- Each task in its own worktree from `feat/bot-quality`, absolute paths; ports per TASK-STATUS; never 4466.
- Tests at `nice -n 15`, at most 3 workers.
- Protected files (steering, `AGENTS.md`, `CLAUDE.md`, `docs/principles.md`, tokens, existing decisions):
  not touched. New decisions are drafted in notes for the morning.
- `skills/vision-board/SKILL.md` is the one copy linked into `~/.claude` and `~/.kiro` from the main checkout,
  so edits on this branch reach no live agent until merged.
- New sentences go in words files; new behaviour behind the flag; a failing test before each fix.

## Done

Every finding has a fix proven by a test or the eval, or a written reason it was left; the eval's final run
beats the baseline with no new failure; full gates green; a morning proposal (`PROPOSAL.md` here) says what
was tried, what worked, what to keep, and how to revert.
