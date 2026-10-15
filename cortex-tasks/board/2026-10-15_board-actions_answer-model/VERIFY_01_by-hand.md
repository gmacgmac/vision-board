# VERIFY_01_by-hand: By hand

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md)
> **Plan**: [PLAN.md](./PLAN.md)

---

## Objective

Prove the answer model with real agents: Claude Code over MCP and Kiro in the chat panel.

## Steps

1. [x] Scratch project in the system temp folder, its own board server (not 4466).
2. [x] Each agent draws a small board: a decision, a question, an action, a finding.
3. [x] On the board: ✓ the decision then clear it, ✗ the question, write a question as a note on the
   action, double-click ✓ on another card, Send.
4. [x] Check: the agent receives no answer for the cleared card and treats the
   note as a question (replies and asks again); ✓ the action before writing that note, and check
   the agent's answer clears it; the cleared card shows the update marker; the agent reads `cross`
   for the question and acts on what its card said ✗ meant; the finding shows no status; the header counts match.
5. [x] Ask each agent to consolidate a finished container: it proposes first and retires only after ✓;
   the retired cards open from the container's marker.
6. [x] Record findings in TASK-STATUS.md; a problem outside this task becomes a tracker row.

## Validation

- [x] Both agents pass steps 4 and 5, or each failure is recorded with an example.

## Implementation Notes

**Status**: Completed (2026-10-15)

**Set-up** (T_01's harness, reused). Two board servers, 4491 (Claude Code) and 4492 (Kiro), each
with `HOME` and `VB_PROJECT` in the system temp folder (`$TMPDIR/vb-verify01/`), `VB_KIRO_AGENT=0`;
stopped after. Each agent joined over HTTP (`POST /api/agents`); its secret went only into its
`vb` MCP server's environment (`VB_SERVER`, `VB_AGENT_SECRET`, `VB_PROJECT`), as the panel does.
- **Claude Code**: `claude` 2.1.301, `claude -p` with the panel's flags (`claude-args.ts`
  `buildClaudeArgs` less the gate hook): stream-json, `--session-id` then `--resume`,
  `--append-system-prompt-file skills/vision-board/SKILL.md`, `--mcp-config` (vb only)
  `--strict-mcp-config`, `--allowedTools mcp__vb__*`, `--model opus`. **Ran: Opus 5.5**
  (`modelUsage` `claude-opus-5-5` on every turn).
- **Kiro**: `kiro-cli` 2.24.0 `chat --no-interactive --trust-tools=@vb` (`--resume` after the first
  turn) as a workspace agent `vb-test` in the scratch project (prompt = the skill, tools `@vb` only,
  `model: claude-opus-5.5`). **Ran: Opus 5.5** (`~/.kiro/sessions/cli/<id>.json` records
  `claude-opus-5.5`).
- **The person**: every act through the board page itself, with the repo's Playwright chromium
  (Check/Cross buttons, the note bubble, the Send button), so each act carries the page's cookie and
  Origin and goes through the page's own `item-acts.ts` (the clear, the 400 ms guard). Each agent
  message was built by the panel's own `promptFor` / `roundOf` from the scratch ledger just before
  Send. No console error, warning or failed request in any page run.
- **Deviation (small)**: step 2's board had two decisions (five cards), so the double click had a
  card of its own (decision 3) while decision 2 took the ✓-then-clear.

**Step 2.** Both drew, in one `write_board` call, container "Launch" (`row`): 1 finding, 2 decision
"Ship 2.0 on Monday", 3 decision "Turn the new search on by default", 4 question "Who writes the
release post?", 5 action "Update the migration guide". Claude: "Done."; Kiro: "Done." plus a clause.

**Steps 3 and 4** (same acts on both boards). The page recorded `ack` 2, `reopen` 2 (second press
after 500 ms), `drop` 4, `ack` 5, `comment` 5 ("Does the guide also need a section on the renamed
config keys?"), and one `ack` 3 for the double click (the second press ignored). Before Send the
header read "1 open · 3 answered · 0 later"; finding 1 had no status word and none in its name; 3
read "checked", 4 "crossed" at full opacity, title not struck. The Send message, both agents:
`3 (decision): ✓` · `4 (question): ✗` · `5 (action): ✓: Does the guide…?` · `Still open: 2`, and
**no line for 2** (✓ then cleared). `check_responses` (read afterwards as each agent, `after` 9)
gives `check` 3, `cross` 4, `comment` 5, nothing for 2, no `ack`/`drop`/`means`.
- **Claude Code: pass.** `show_node` 5, then one `write_board`: an `append` on 5 (a "Renamed config
  keys" section) and a `reply` to the note ending "✓ if the guide's scope holds." Card 5 then read
  open, unmarked, footer "Open", tab "1 update", name "…, Open, 1 unseen update",
  `unseenAnswer` in `get_board`; selecting it on the page ended the tab. ✗ on 4: see problem 2.
  Slip: chat "Done." plus two sentences (problem 4).
- **Kiro: fail on "asks again"** (problem 1). It replied to the note with an answer, but ended "Your
  ✓ still stands." and said in the chat "Your ✓ on card 5 still counts." The board cleared it all
  the same (card 5 open, unmarked, "1 update", `unseenAnswer`); next turn Kiro corrected itself
  unasked. ✗ on 4: see problem 2. Chat: several lines (problem 4).
- **Both boards after the replies**: header "2 open · 2 answered · 0 later", container "2 of 4
  answered"; the finding never counted. Screenshots: `claude-2-after-reply.png`,
  `kiro-2-after-reply-dark.png`, `*-2-card5.png`, `*-2-card1-finding.png` (all looked at).

**Step 5.** The person ✓ 2 and ✓ 5 on the page and pressed Send ("Nothing left open").
- **Claude Code: pass.** One `decision` card 6 in "Launch" ("Sum up the launch cards in one
  card?", naming 1 to 5 and itself), no retire, "Done." After ✓ 6 and Send: one `write_board` with
  one summary card 7 (problem, decided, still to do) and `retire` 1 to 6, each its own key; "Done."
- **Kiro: fail on "proposes first"** (problem 3): no proposal card; it wrote in the chat only "If
  you want, I can … sum up the Launch row in one card." After the person's words "Yes, sum up the
  Launch row in one card.": one summary finding 6 and `retire` 1 to 5; "Done." It retired nothing
  before the person asked.
- **The marker, both**: "6 cards retired" (Claude) / "5 cards retired" (Kiro) opens a read-only
  past version (v24 / v8) showing the retired cards (`*-5-retired-version.png`). See problems 5, 6.

**Scenarios 22 and 23 with Claude Code (Opus 5.5, fresh sessions, fixtures drawn over HTTP by a
newly joined agent, the earlier round's ✓ and Send made on the page).**
- **22: pass.** Message exactly as the scenario (`2 (decision): ✓: What does the flag default to?`,
  `3 (decision): comment: Why not move it to 1.5?`, `Still open: 3`). `show_node` 2 and 3, one
  `write_board` with a `reply` to each note: 2 "…✓ if that holds, ✗ to have it on by default", 3
  "…✓ to keep it in 1.4, ✗ to move it to 1.5". `list_open`: 2 and 3 `open`, `unseen`; `get_board`
  `unseenAnswer` on both; nothing `pending`; no new card, no `propose`; "Done." Harness note: it also
  ran one read-only `Bash` (`ls`, `grep` in the scratch folder) although only `mcp__vb__*` was
  allowed; the person's own Claude settings let it through. The panel gates that tool with its hook,
  so this is the harness, not the product.
- **23: pass.** Turn 1: `show_node` 5, `get_board`, one `decision` card 8 in "Venue" ("Sum up the
  venue cards in one card?", replacing 1 to 5 and itself), nothing for "Travel", no retire, "Done."
  Turn 2 (✓ 8): one summary finding 9 (problem, decided, where it landed) and `retire` 1 to 5 and
  8, each its own key; "Travel" untouched; "Done."
- **Kiro, the same two for comparison** (Opus 5.5): both pass. 22: a reply to each note asking for
  the mark again ("✓ again if off-by-default works for you, ✗ if you want it on at launch"); chat
  "Done." plus one line. 23: proposal card, then summary and six retires after ✓; turn 1 chat
  "Done." plus two sentences.

**Page side of a cleared card** (step 4, looked at in light and dark): the card the agent's reply
cleared is unmarked (no lit button, `aria-pressed` false), footer "Open", the "1 update" tab under
it, name "Item 5, Action: …, Open, 1 unseen update"; the finding has no status word and no status in
its name; the header reads "N open · N answered · N later" and never "decided". Selecting the card
ends the tab.

**Problems found** (numbered for reply).
1. **Kiro said its reply left the ✓ standing** (skill; 1 of 2 Kiro runs of this case, 0 of 2
   Claude). Example: release-prep card 5, reply to note 14: "…I haven't checked the code for which
   keys changed. Your ✓ still stands." The board had cleared it. The skill already says the answer
   clears the card; no change proposed beyond watching it in the next skill runs.
2. **A question whose answer is words got ✓ and ✗, and ✗ was guessed** (skill; both agents). Both
   drew "Who writes the release post?" with "Name the author in a note", so the card gave ✗ no
   meaning; after ✗ both took it as "no release post for 2.0", said so in the chat, and wrote it into
   the summary card as decided. For the maintainer: T_01's optional Kinds line ("When ✓ and ✗ could
   read more than one way, say on the card what each does") would cover it; or a rule that an ask
   answered in words says what ✓ and ✗ do, or asks for a note instead.
3. **Kiro offered consolidation in the chat instead of a proposal card** (skill; 1 of 2 Kiro runs;
   it drew the card in scenario 23). Example: "If you want, I can … sum up the Launch row in one
   card." The board was unchanged.
4. **Chat words past "Done."** (skill, known from T_01): Claude 1 of 7 turns, Kiro 5 of 7.
5. **Proposed tracker row (outside this task, page): a narrow container's header crowds.** Problem:
   after consolidating, a container one or two cards wide breaks its title mid-word and truncates
   the "N cards retired" marker and the count. Example: "LAUNC / H" with the marker cut to "6…"
   (9 px wide) and "Claude Code chat …"; "VENU / E", "TRAVE / L", "0 of 1 a…"
   (`claude-4-container-head.png`, `s23-after.png`). Solution: let the header wrap whole words or
   take the width it needs above the cards, keeping the marker readable.
6. **Proposed tracker row (outside this task, page): the retired marker's version hides the answers
   given after it.** Problem: the marker opens the last version before the retire, which shows the
   cards' ✓ and ✗ as they were then. Example: Kiro's board, "5 cards retired" opens v8 (the first
   draw): "0 of 4 answered", every card Open, though all four were answered before the retire;
   Claude's scenario 23 opens v64 with the proposal still Open though its ✓ caused the retire.
   Solution: show the answers up to the retire line in that view.
7. **Confirmed, not new**: a reply on a card with a note and no mark (scenario 22, card 3) also shows
   "1 update" (FE_01's decision 2, still open for review).

**Not covered**: the panel's own chat adapters (the page's Chat with `claude`, and `kiro-cli acp`);
by instruction this reused T_01's harness. Installed `kiro-cli` is 2.24.0; `kiro.ts` names 2.28.0's
engine.

**Files**: this task file, TASK-STATUS.md (row and section), `cortex/LOG.md` (one line). Nothing
in product code, tests or the skill changed. Scratch in `$TMPDIR/vb-verify01/` (harness scripts,
ledgers, agent outputs, screenshots in `shots/`); both servers stopped, no process of mine left.
