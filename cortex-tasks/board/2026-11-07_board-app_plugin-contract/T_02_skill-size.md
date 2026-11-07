# T_02_skill-size: Skill Description and Size

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md)  
> **Plan**: [PLAN.md](./PLAN.md)

---

## Objective

Give the skill a one-line description that tells a bot when to use the board, and cut the plugin's `skill.md` toward
nclite's 8 KiB default, moving per-tool detail into the tool descriptions, with live `npm run eval:bot` passing.

---

## Context

PLAN Decision 10. The plugin's `skill.md` is SKILL.md through `apps/board/plugin/skill.ts` `skillFor` and the edits in
`apps/board/plugin/words/skill-edits.ts` (each `from` must occur exactly once). nclite will move to progressive
disclosure (only name and description ride every turn), so the description is the most important line. With
`singleAgent` on (BE_02), the plugin bot needs no grant talk: `request_grant` answers `held`. Prompts are code: run the
scenarios before and after. **Read previous task notes in TASK-STATUS.md before starting.**

---

## Inputs

- **Files to modify**: as TASK-STATUS File Ownership, T_02 row.
- **Files to reference**: `apps/board/tests/plugin-skill.test.ts`, `tests/evals/bot/` (`run.ts`, `limits.ts`,
  `scenarios/`), `.kiro/steering/vision-board-proj.md` "Bot instructions".
- **Skills**: `cortex-architecture`.

---

## Steps

1. [x] Baseline: `npm run eval:bot -- --dry`, then a live run with the defaults (`--max-usd 3`); record cost and
   result. Run the evals with the flags the plugin will have (`--flags singleAgent` and whatever nclite sets; see
   `PLUGIN_POLICIES` in nclite `engine/plugins/policies.ts`, read-only, and add `-followOtherWriters`).
2. [x] The description: one line, when to use the board, valid for standalone and plugin (the plugin edit may shorten
   it). Keep the standalone skill's meaning.
3. [x] Slim the plugin skill: cut what a plugin bot never needs (grant requests under `singleAgent`, repetition,
   worked detail about one tool, which moves into that tool's description in the tool table; `npm run gen` for
   generated outputs). Prefer plugin-only edits; change SKILL.md itself only where the cut is true for standalone too,
   and then run `--standalone` evals as well.
4. [x] Re-run live evals after each meaningful cut. Stop at 8 KiB or at the smallest size that passes, and report the
   size, the cost, and anything an eval caught.

---

## Validation

- [x] `apps/board/tests/plugin-skill.test.ts` and `npm test` pass; `npm run build:plugin` writes the new `skill.md`.
- [x] Live `npm run eval:bot` passes (plugin; `--standalone` too if SKILL.md changed). `VB_TEST_PORT=9800`, eval port
      `--port 6080`.

---

## Implementation Notes

_To be completed by agent after task completion._

**Status**: Completed  
**Completed**: 2026-11-07 (Opus 5.5)

### Changes Made
- **The description** (`skills/vision-board/SKILL.md` front matter, v3.32 in `status`): one line, what the board is and
  when to use it, 487 → 363 characters. Standalone keeps "or its chat panel" and "or an app you build"; the plugin's two
  edits take them out.
- **The plugin skill** (`apps/board/plugin/words/skill-edits.ts`): one edit per section, in the standalone skill's
  order, each `to` the section cut to what a host's bot under `singleAgent` needs (`INTRO`, `CONVERSATION`, `RUNNING`,
  `STARTING`, `ACCESS`, `LAYOUT`, `WRITING`, `IMAGES`, `KINDS`, `ANSWERS`, `RETIRING`, `ANSWERING`); Another ledger,
  Changing a card (into Answering), Reading the person's answers (`check_responses` detail is its description; `list_open`
  is in Answering), Saved for later (into the answers' Later) and Apps cut. Gone for the plugin bot: grant requests and
  waiting on them (`request_grant` answers `held`), `wrong-folder` (standalone only, `server/caller-folder.ts`), the
  creator rule, the worked `write_board` example (one wrapped item kept), the layout table, the `show_layout` reading
  guide, the check_responses reading rules, the board id rule, the flag, a new direction. The sentences the tests hold as
  "the standalone skill's own" are kept word for word. A section the standalone skill gains still flows through.
- **Per-tool detail into the tool table**: `show_layout`'s description (`packages/format/schema/openapi.json`, `npm run gen`)
  now says when to redraw (a quarter of the links crossing: cut the non-steps; empty cells outnumbering cards: one `flow`
  by phase), in place of the skill's "Check a flow" section. Fitted to the tool list's size budget
  (`packages/mcp/tests/tools.test.ts`, 32,046 of 32,050) by dropping "`write_board` does not return it."
- **Test** (`apps/board/tests/plugin-skill.test.ts`): the description keeps pictures, not apps; the drift test replaces
  the intro's anchor (the Apps heading has no edit now); every tool but `request_grant` is named in the skill (under
  `singleAgent` it answers `held`; its description and the instructions carry it).
- **Eval harness** (`tests/evals/bot/host.ts`): with `singleAgent` on, the host asks no sign-up (`POST agents` is not
  called) and passes its own id, `bot-0123456789abcdef` (nclite's derived shape, which the ledger's pattern refuses), so
  every plugin run proves the engine needs, checks and stores no id. Off, as before.

### Sizes and evals
- Flags on every plugin run: `--flags singleAgent,-followOtherWriters,botToolRules` (nclite's board row sets
  `engineFlags: { botToolRules: true }`; `viewSettings` are the view's). Port 6080, `VB_TEST_PORT=9800`. Reports under
  `temp/t02/live*/report.md`.
- Dry, plugin flags: 75/75, $0.
- **Baseline, 27,641 B**: 74/75, $0.8613 (where-cards-stand/done-only: a recap after "Done.").
- **11,206 B**: 73/75, $0.4751 (where-cards-stand/done-only: narration; new-card-number/reply-names-new-card: "number 4").
- **Standalone** (SKILL.md's description, show_layout's first wording): 19/19, $0.3394.
- **8,180 B**: 74/75, $0.4891 (summary-card/done-only: narration). Its send-round pass was by chance: the reply named ✓
  for another card and asked nothing (found on reading the calls).
- 8,187 B (quiet rule bolded), summary-card + where-cards-stand + new-card-number ×2: 42/42, $0.2465.
- 8,187 B full: 72/75, $0.4136 (send-round: `list_open` re-read and no ask again; new-card-number: number guessed in the
  same call). Fixes: the ask-again made unconditional on a card that asks; "never guess its number in text in the same
  call" restored; the grant line dropped.
- 8,136 B, send-round + new-card-number ×2: 23/26, $0.1251; 8,187 B ×3: 37/39, $0.2085 (new-card-number/done-only ×2:
  "I'll add the card now…"). Fix: the quiet rule's three examples restored ("I'll add the card first").
- 8,183 B, those three ×2: 42/42, $0.2016; full: 74/75, $0.4378 (two-turns: reply with no `to`). Fix: `show_node`
  "before you `reply` (its `to`)".
- 8,176 B, two-turns + send-round ×2: 21/24, $0.1619 (two-turns: a note after a ✗ answered in chat, "Nothing is waiting
  on me"). Fix: "though its card isn't on that line", and answers on the board, never only in the chat.
- 8,178 B, two-turns ×3: 18/18, $0.1378.
- **Final, 8,178 B (≤ 8,192)**: full 75/75, $0.4280; again 75/75, $0.4293.
- **Spend in all: $4.96** over 14 live invocations (cap $10). Each run costs about half the baseline's ($0.033 against
  $0.066 mean).

### Issues & Resolutions
- The eval reads `dist/plugin/board/skill.md` at each run's start and builds once per invocation: no build while a run is
  going (the engine bundle is self-contained, so editing sources was safe).
- What each eval caught, and what came back: the quiet rule's examples, the unconditional ask-again, "never guess in the
  same call", the note `to` read before the reply, and "a note after a mark is owed though its card isn't on that line".
  Each was a sentence the first cut had shortened; each failed a check until it was back.
- `npm test` 2435/2435 + timing 14/14; `npm run test:plugin` 103/103; `npm run verify` ok; gen `--check` current;
  `npm run build:plugin` writes the 8,178 B `skill.md`.

### Caught Beyond the Brief
- **The checks miss some re-reads and asks.** send-round's `no-re-read` counts `check_responses` and `list_open` only;
  every baseline run re-read with `get_board`. `asks-again` passes on any ✓ or ✗ in the reply text, so a reply that names
  another card's ✓ passes (seen at 8,180 B). Neither is loosened or tightened here: scenario changes are not this task's.
- **The standalone skill's `status` line is about 6 KB of version history** in the front matter, riding every
  standalone turn (and any host that loads front matter). Worth moving to `skills/vision-board/NOTES.md`.
- **The MCP instructions (1.5 KB) and `write_board`'s description still speak of grants and `needs-grant`** to a host's
  bot that, under `singleAgent`, never meets one; `write_board` also still offers `app` cards (the board row has
  `appCards: false`). A `singleAgent` edit set beside `ruleEdits` would need `apps/board/server/engine/tools.ts`.
- **nclite's board row has `skillBytes: 28672`**: the plugin skill now fits the 8 KiB default, so the row can drop it.

### Deviations from Plan
- `request_grant` is no longer named in the plugin skill (the test now exempts it, with why). Decision 10 says cut grant
  requests under `singleAgent`; a host that leaves the flag off still has the tool, its description and the instructions.
- `docs/specification/plugin.md` § The bot "Words differ per host" now undersells the cut (it says "less what a bot under a
  host doesn't have"); not my file: REQUEST.

---

## On Completion

1. Fill in Implementation Notes; set **Status** to `Completed`.
2. Update this task's row in TASK-STATUS.md (your row only).
3. Append your own LOG line to `cortex/LOG.md` (one line, newline-terminated, append-only), category `[board-agent]`,
   trail `→ Task: [[cortex-tasks/board/2026-11-07_board-app_plugin-contract/T_02_skill-size.md]]`.
