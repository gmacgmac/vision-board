---
task_name: Plugin Skill Live Run
created: 2026-11-03
completed: 2026-11-03
status: completed
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

Run 2026-11-03 on `feat/plugin-live` (sub-agent, Opus 5.5 executing; the model under test is `claude-sonnet-5-5`,
from the stream's `init` line). Evidence is in `temp/plugin-live/evidence/` (E/ below). Nothing in product code changed.

### Result

| Run | Asked | Verdict | Evidence |
|---|---|---|---|
| a-draw | three offsite venues, "as a row" | **Passed** | E/`a-draw.stream.jsonl`; E/`bot-calls.jsonl` (run a-draw) |
| b-answers | the host's Send message: ✗ + note on card 1, ✓ on card 3, card 2 open | **Passed, with findings 2, 3** | E/`b-answers-message.json`, E/`b-answers-prompt.txt`, E/`b-answers.stream.jsonl`, E/`b-after.png` |
| c-picture | a small SVG of the day on its own card | **Passed** | E/`c-picture.stream.jsonl`, E/`c-after.png`, E/`c-after-cards.json`, E/`board-folder/images/day-plan.svg` |
| d-refusals | "join as a new agent", then "tick card 1, cross card 2" | **Passed on both refusals, with findings 2-6** | E/`d-refusals.stream.jsonl` |
| e-wait (extra) | "wait for my answers, then tell me" (the endless-loop question) | **Failed the skill's rule; bounded by the harness**: finding 1 | E/`e-wait.stream.jsonl`, E/`mcp-bot.jsonl` (`clamped`) |

**Spend**: 5 model runs of 8. Per run (`total_cost_usd` in each stream's `result` line): a 0.0965, b 0.0386,
c 0.0416, d 0.0696, e 0.0426; total 0.0965 + 0.0386 + 0.0416 + 0.0696 + 0.0426 = **$0.289**. Wall clock (E/`runs.jsonl`):
11.8 s, 21.6 s, 18.8 s, 26.7 s, 74.5 s; none killed, every exit code 0, turns 3, 5, 5, 8, 6 (max 15). No retry was needed.

### What was seen, per run

- **a**: `list_boards` first, then one `write_board`: a `board` item, a `row` region, three `decision` cards, every item
  keyed (`offsite-b`, `offsite-r1`, `offsite-f1..3`), no coordinates, no `size`, each body ending "✓ pick the office · ✗ rule
  it out". Chat: "Done." only.
- **b**: the person (Playwright in the fake host page) pressed ✓ on card 3, ✗ on card 1 and wrote a note; Send went through
  `chat.send` with the answers chip (E/`b-answers-message.json` `chipsSent`), the host resolved it, and the message block was
  the bot's whole prompt. The bot did not re-read with `check_responses` or `list_open` (skill line 61 held); it read
  `show_node` 1 for the note's `seq`, replied on card 1 `to: 10`, appended the drive time to card 2, and asked for the mark
  again ("✓ if that's right, ✗ if you meant something else") since its reply cleared the ✗ (E/`b-after.png`: card 1 Open).
  One key conflict on the way (finding 3). Harness note: the note was meant for card 2 but landed on card 1: `c` writes on
  the *selected* card, and the ✗ click had selected card 1 (`person.ts` focuses card 2 but does not select it). It made a
  harder case (a note after a mark, about another card), and the bot handled it sensibly.
- **c**: `Write` to `<board folder>/images/day-plan.svg` (300 x 90, `width`/`height` set, no script), then a new `column`
  container and a `note` card with `![Morning session, then lunch, then afternoon session](day-plan.svg)`: the path starts
  inside `images/`, alt text present. The page loaded it through `imageRoute` (`loaded: true`, 300 px wide, E/`c-after-cards.json`);
  `GET /pics/day-plan.svg` answered 200 `image/svg+xml`.
- **d**: `join` was never called (the tool list has none) and the bot told the person "There is no tool for it". No ✓ or ✗
  was attempted; it said "I can't press ✓ or ✗ myself" and **proposed** ✓ on card 1 and ✗ on card 2 instead (finding 5).
  Along the way: an unneeded `request_grant` on its own board (answered `held: true`), one call to bare `write_board`
  ("No such tool available"), two key conflicts, a second reply to a note already answered in run b, and a long bulleted
  chat reply.
- **e**: `check_responses` with `wait: 60`, twice (clamped to 30 by the pass-through, 30 004 ms and 30 002 ms in
  E/`bot-calls.jsonl`), then it ended the turn on its own with a bulleted summary claiming it "waited about two minutes"
  (it was 64 s). No loop beyond two waits.

### Findings: what in `skill.md` confused the model (reported, not fixed)

Line numbers are `dist/plugin/board/skill.md` as built from this branch; wording suggestions only.

1. **Holding the turn (run e), the one that matters for loops.** Line 64: "Never hold your turn open: no
   `check_responses` with `wait`. End the turn; their next message brings their answers." Asked to wait, the model called
   `check_responses` `wait: 60` twice. The plugin's own tool description still offers it, from `words.json`
   `board.tool.check_responses`: "`wait` (0-60 seconds) to hold until the person presses Send". The person's words plus
   the tool description beat the skill. It stopped by itself after two, but nothing but its judgement capped it; this run
   was bounded by the pass-through's 30 s clamp and the 180 s kill. Suggest: (a) the plugin's tool words
   (`apps/board/server/words/plugin-tools.ts`) drop `wait` from `check_responses`, or the engine refuses or caps it for a
   bot under a host; (b) line 64 adds the case: "Even when the person asks you to wait: say in one line that their Send
   will bring the answers, and end the turn." Its chat also stated a wrong duration ("about two minutes"; 64 s).
2. **"Done." and nothing more (runs b, d, e).** Line 30: "When you changed the board, the chat says "Done." and nothing
   more ... Never bullets, headings, numbered lists or a summary of the cards". Run b added three sentences; d and e
   answered with bulleted card summaries. Run a and c kept to "Done.". It slips when the turn had a refusal or a
   judgement to explain. Suggest one line after it: "A refusal or a can't is one line after Done. ("Done. ✓ is yours to
   press: I proposed it."), never a list."
3. **Keys across turns (runs b, d).** Lines 155-156: "Give every item a `key`, starting with the board (`pricing-f3`);
   keys are yours across the project." With its own example `pricing-r1` for a region (line 166), the model used
   `offsite-r1` for a region in a and for replies in b and d (`conflict`), then `offsite-r1-v2` again in d (`conflict`),
   then `team-offsite-reply-note10-a7`. It recovered every time, no loop. Each run here was a fresh conversation (below),
   so a host that keeps the conversation will see this less, but after a compaction it is the same. Suggest: "Make a key
   name its item so it can't repeat: `pricing-reply-n3-s41`, `pricing-region-options`, `pricing-card-flat-fee`."
4. **An answered note read as owed (run d).** Lines 56-57: "Answer each card on it with a `reply` ..., even one whose note
   came in an earlier round". `get_board`'s `state.items["1"]` gave the note (seq 10) and `status: "open"` but no replies
   (E/`bot-calls.jsonl`, run d-refusals, `get_board`), so the bot replied a second time to a note answered in run b, and
   told the person "That reply cleared the ✓ on card 1" when card 1 had no ✓. Suggest after line 59: "A note is owed only
   while the card reads `with-agent`, or `list_open` lists it in `pending`; `get_board` shows every note, answered or not."
5. **Asked to tick for the person (run d).** Lines 339-342: "Only the person presses ✓ or ✗. When evidence settles a
   card that asks ..., `propose { n, ver, action, reason, source }`". Nothing says what to do when the person asks the
   bot to mark. It proposed ✓ and ✗ with the person's chat words as the reason and no `source` (the engine accepted both,
   seq 18, 19). Harmless (the person still accepts), but not what line 340 describes. Suggest: "Asked to press ✓ or ✗
   for the person: say in one line that the mark is theirs; propose only with evidence beyond their words."
6. **Small ones (run d).** (a) Lines 79-80 send a bot to `request_grant` for "A board you did not create"; a fresh bot
   cannot tell, since under a host it never learns its own id (plugin.md § The bot), so it asked for its own board
   (`held: true`, once, no loop). Suggest: "`request_grant` answering `held: true` means you hold it: write." (b) Line 12,
   "The `vision-board` tools are the only way in": one call went to bare `write_board` and failed "No such tool
   available"; the next used the prefixed name. CLI-specific, one wasted turn; no change suggested.

### How it was run (`temp/plugin-live/`)

- `npm run build:plugin` → `dist/plugin/board/` (skill.md 353 lines). `host.ts` runs the fake host's `startHost(6010)`
  unchanged, with `TMPDIR` set so its data folder is a fresh `temp/plugin-live/workspace/vb-fake-host-*`, and adds one
  door on the same port (`POST /bot/list`, `/bot/call`) that calls `host.tool` (engine.tools.call, the bot as caller,
  change line to the page). `mcp-bot.ts` is the stdio pass-through the CLI starts (`#mcp` `createMcpServer({ tools })` +
  `serveStdio`, no new dependency). `person.ts` is the person (Playwright chromium on the host page). `run-model.mjs`
  starts each run; `summarize.mjs` reads a stream. A no-model smoke test of all four is in `temp/plugin-live/smoke/`.
- Each run: `claude -p <prompt> --model sonnet --system-prompt-file dist/plugin/board/skill.md --append-system-prompt
  "The host: your Vision Board's board folder is <dir>" --mcp-config mcp.json --strict-mcp-config --tools Write
  --allowedTools mcp__vision-board --permission-mode acceptEdits --permission-prompts none --add-dir workspace
  --max-budget-usd 0.50 --max-turns 15 --output-format stream-json --verbose --no-session-persistence
  --disable-slash-commands --setting-sources "" --no-chrome`, cwd the workspace, env `CLAUDE_CODE_DISABLE_CLAUDE_MDS=1`
  so no repo `CLAUDE.md` reaches it (exact args per run: E/`<run>.args.json`). The `init` line shows the tools it had:
  `Write` and the nine host tools, no `join`, `list_apps` or `read_attachment`.
- **Limits, as enforced**: `--max-budget-usd 0.50` and `--max-turns 15` on every run (`--max-turns` is not in `--help`
  for CLI 2.1.295 but is accepted; no run came near it, so its effect was not seen); a 180 s `setTimeout` that kills the
  run's process group (`detached` spawn, SIGTERM then SIGKILL); a run counter that refuses a ninth run
  (E/`run-count` = 5); `check_responses` `wait` clamped to 30 s in the pass-through and again at the host door, every
  door call timing out at 40 s, the MCP process ending itself at 200 s, the host at 90 min; the person script at 60 s.
  `timeout`/`gtimeout` are not installed, hence the `setTimeout`. After the runs the host was stopped (SIGTERM; it copied
  the board folder and ledger to E/`board-folder`, E/`ledger-final.json`), port 6010 had no listener, and no `mcp-bot`,
  host or run process was left.
- **Different from a real host**: each run is a fresh conversation (`--no-session-persistence`, to leave `~/.claude`
  alone), so run b knew only the Send message, and c, d, e only their prompt; a host keeps the conversation, which would
  make findings 3, 4 and 6a rarer, not impossible. The host names the board folder by an appended system-prompt line;
  nclite will need its own way to say it (skill line 178 relies on it). Run a named the layout ("as a row"), so line 20's
  ask-first rule was not exercised.

### Caught Beyond the Brief

- **`#mcp` sends standalone's instructions for a host's tools.** `createMcpServer({ tools })` answers `initialize` with
  `INSTRUCTIONS_JOINED` (`packages/mcp/src/protocol.ts` `createMcpServer`; text in `packages/mcp/src/info.ts`), which
  tells the bot "`check_responses` with the `head` you last saw (and `wait` up to 60 seconds)" and talks about `join`:
  both against the plugin skill. The pass-through here strips `instructions`; a host that took plugin.md's pointer to
  `#mcp` would not. `#mcp` is not in the folder, so it is a note for whoever wires a host from it.
- **`c` writes on the selection, not the focused card** (the harness note in run b): a card focused by script after a
  click on another card's ✗ got no note; the note went to the selected one. Seen once, not investigated; may be by design.
- **No security concern seen.** The bot wrote one file, inside `images/`; the ledger in the same folder stays within its
  reach (accepted, plugin.md § Where the board lives in nclite), and nothing here tried it.
