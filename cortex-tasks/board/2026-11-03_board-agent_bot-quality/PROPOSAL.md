# Bot Quality: Overnight Proposal

> Points 393, 394. Everything is on branch `feat/bot-quality`. Main and your board on 4466 are untouched
> (main still d1fb7b7). Checkpoint tag: `checkpoint/before-bot-quality`. Nothing is pushed.

## In one line

The bot now follows its rules because its tools enforce them and its reads tell it the facts. A new eval
proves it: today's code passed 35 of 40 checks; the branch passes 80 of 80 (every scenario run twice).

## What changed (each behind a flag, on by default; off is the old behaviour)

| What | Why | Flag |
|---|---|---|
| A bot inside a host can't wait: `check_responses` has no `wait` for it, and a `wait` sent is refused with "end your turn" | The endless-loop risk. A rule in the tool can't be skipped; a sentence can | `botToolRules` |
| The server tells a host's bot the host's own instructions (no `join`, no wait) | It was sending standalone's, which offered the 60 s wait | `botToolRules` |
| An agent's read marks each note `owed` (yours to answer) or `answered` (with what answered it), and each board `held` | The bot answered notes twice and asked for boards it had: the facts were missing from what it read | `botToolRules` |
| A key clash says what the key holds and offers a free key | Fewer wasted calls | `botToolRules` |
| `c` writes on the card the keyboard is on; a ✓ or ✗ never pulls focus back | Point 394. The cause was a focus steal after ✓/✗, not the selection | `focusLeads` |
| Instructions v3.26: keys name their item; answer a note only while it's `owed`; asked to tick, say the mark is the person's; a "can't" is one line | Each line kept only where the eval showed it helped | none (text; `SKILL.md`) |
| `npm run eval:bot`: 8 scenarios, 40 checks, scored from what the bot did, hard limits in code | Instructions are code: now they're tested before they change | none (a tool) |

## The evidence

| Run | Checks passed | Runs | Spend |
|---|---|---|---|
| Today's code (baseline) | 35/40 | 8 | $0.55 |
| Tools fixed, old wording | 35/40 | 8 | $0.58 |
| Tools fixed, new wording | 37/40 | 8 | $0.54 |
| Answered mark added (3 scenarios × 3) | 50/51 | 9 | $0.66 |
| **Final: everything, each scenario twice** | **80/80** | 16 | $1.04 |

Reports: `tests/evals/bot/out/` (not in git). Whole night: at most $4.30 of the $10 cap; every run had its
$0.50 cap and 3-minute kill, and none was killed or came near a limit.

Checks on the final branch: unit 2232/2232, timing 14/14, plugin 79/79, verify, types and API all clean; pages
847/848. The one failure was a test that checked for a picture's request before the browser had sent it (a race in
the test: 8/8 alone at the checkpoint and on the branch); it now waits for the request, 48/48 after. Plugin had one
flake under the eval's load, then 79/79.

## Ways of working I'd change

1. **Instruction changes go through the eval.** Any change to `SKILL.md` or the plugin's instructions runs
   `npm run eval:bot` before it merges (about $1 for every scenario twice). It already caught three things
   reading never did: the wait offer in the server's text, a reply without `to`, and key reuse taught by our own
   example (`pricing-r1`).
2. **Rules live in the tools, facts in the reads, judgement in the words.** The night's biggest wins were
   tool changes (no wait, `answered`), not wording. When a bot slips, ask first what the tool or the read is
   missing.
3. **A new flag shouldn't touch the plugin's seam.** Every new flag changes `FlagName` in `plugin.d.ts`, so the
   seam hash had to be reset by hand twice tonight. Flags are additions by D-078's own rule; typing flag names
   as `string` in the seam would stop the churn.
4. **Agents slip into the wrong checkout.** Three times tonight an agent ran a command or an edit in `tidy` or
   the main checkout because the shell starts there; each was caught and undone, nothing was lost. A small
   script that makes a task's worktree (branch, dependencies link, ports) and a line in every brief would stop it.

## Decisions for you

- **395, keep it:** merge `feat/bot-quality` into main (your board then runs it; the bots read v3.26), or keep
  it on the branch for now. Recommendation: merge.
- **396, D-083** "The tools keep a bot's rules; the reads give it the facts", for `docs/decisions.md`. Draft in
  TOOLS_01's notes, with point 4 to name `answered` beside `owed` and `held` (TOOLS_02). Recommendation: append.
- **397, the seam number:** the tools' change adds an optional `instructions` to the engine's tools and makes
  `wait` refused for a host's bot. I judged that an addition (`SEAM` stays 1); a strict reading says 2. No host
  is built yet, so either costs nothing. Recommendation: stay 1.
- **398, flags out of the seam** (way of working 3). Recommendation: yes, as a small task.
- **399, the eval as a rule** (way of working 1): a line in the project rules, which are protected. Exact
  wording, for your yes: "Changing a bot's instructions (`skills/vision-board/SKILL.md`, the plugin's edits):
  `npm run eval:bot` passes before it merges." Recommendation: yes.
- **400, the worktree script** (way of working 4). Recommendation: yes, as a small task.

## Not covered

- Only Sonnet was measured (one Haiku probe, which found a harness bug). Not Kiro, not other models.
- The eval's host is our fake host, not nclite. nclite's own wiring is still the integration test (378).
- `SKILL.md` is shared: on merge, Kiro and Claude Code in the panel read v3.26 too. Nothing in it contradicts
  standalone, but only the plugin bot was evaluated.
- A sentence after "Done." still appears now and then (passed 2/2 tonight, failed in earlier runs). If a host
  shows only a turn's last message, it stops mattering: worth asking for nclite.

## How to try it, and how to undo it

- Try: say 395 yes and I fast-forward main and restart nothing (your board picks it up on its next start);
  or run the board from the branch on another port.
- Undo a part: `?flags=-focusLeads` on the page; `VB_FLAGS=-botToolRules` for the server.
- Undo all of it: main never moved, so do nothing; or after a merge, reset to `checkpoint/before-bot-quality`.

## The tasks

`PLAN.md`, `TASK-STATUS.md` and each task's notes here: EVAL_01, TOOLS_01, KEY_01, SKILL_01, TOOLS_02.
