---
task_name: Skill Rules for Check and Cross
created: 2026-10-15
completed: 2026-10-16
status: completed
categories: [board-agent]
type: implementation
tracker:
---

# Task: Skill rules for ✓ and ✗

> **From**: maintainer, 2026-10-15 (chat 102, approved), after the answer model's VERIFY_01 ·
> **Model**: Opus 5.5 (agent instructions are code, rule 17) · **Go**: not yet given; ask before
> starting

---

## Problem Statement

Both agents drew "Who writes the release post?" as a question with "Name the author in a note", so
the card gave ✗ no meaning. The person pressed ✗; both agents read it as "no release post for 2.0",
said so in the chat and wrote it into the summary card as decided
(`cortex-tasks/board/2026-10-15_board-actions_answer-model/VERIFY_01_by-hand.md`, problem 2). Skill
v3.4 says ✓ and ✗ are read "in the light of what your card asks" but has no rule for a card whose
answer is words, nor for a ✗ that could mean several things. T_01 of that set offered one optional
Kinds line for this and did not add it (its notes, "For the maintainer" (a)).

---

## Rulings (maintainer; do not reopen)

1. **(A) A card that asks should be answerable with ✓ or ✗** (102).
2. **(B) When the answer needs words** (a name, a pick among several), **the card says "Answer in a
   note"** (102).
3. **(C) When ✗ could mean more than one thing, ask in a reply rather than guess** (102).
4. **Rule 17**: test against the scenarios (`skills/vision-board/scenarios.md`) with Claude Code and
   Kiro before release; bump the skill version (102).

---

> **Settled 2026-10-15 (chat 130, 136, "all ok, proceed")**: B no longer conflicts. A note puts the
> card "with agent" (D-046, task `2026-10-15_board-actions_with-agent-state.md`, which runs first);
> the agent's reply brings it back to the person for ✓ or ✗. Teach that; no need to stop and ask.
> Go given; runs after the with-agent task.

## Task Overview

1. Check the mechanics B and C rely on (what a note and a reply do to a card since D-045).
2. Write the three rules into `SKILL.md`, v3.5.
3. Add scenarios for B and C and update the ones the rules touch.
4. Run them with Claude Code and Kiro; record the runs in `NOTES.md`.

---

## Execution Steps

### Step 1: Check the mechanics first (no edits)

- **Action**: confirm on a scratch board (its own port, temp project) and in the code:
  - **B against D-045**: a note never answers a card (`packages/actions/src/registry.ts` `DECIDED`),
    so a `question` that says "Answer in a note" stays open after the person's note. The flow the
    skill can teach within the rulings: the person's note, then the agent's `reply` restating the
    answer (which clears the card, `packages/actions/src/clears.ts` `foldClears`) and asking "✓ if
    that's right", then the person's ✓. Confirm it works end to end. If the maintainer meant a card
    that asks nothing (a `note` or `topic` kind saying "Answer in a note"), that is a different rule:
    **stop and ask** before writing B.
  - **C**: a `reply` with no note to answer (`to` absent, or naming the ✗ act's `seq`; the reply
    schema allows both, `packages/format/schema/events/reply.schema.json`) clears nothing, so the ✗
    stands and the card counts as answered. Find out what the person sees: does the reply show on
    the card as new (`packages/ui/src/node/node-core.ts` `notesView` orphans, `apps/board/src/board/updates.ts`),
    and does the Send carry the person's note back to it? If the person would not notice the
    question, **stop and ask** (an `append` asking on the card, which shows as an update, is the
    alternative).
- **Files**: the ones named above; `docs/specification/api.md` (36, 64, 147).

### Step 2: Write the rules (SKILL.md v3.5)

- **Action**: in `skills/vision-board/SKILL.md`:
  - § Kinds: the card-that-asks bullets gain A and B: ask so ✓ or ✗ answers it ("✓ keep · ✗ rename"
    when either could read two ways); when the answer is words, the card ends "Answer in a note", and
    after the note you reply with what you understood and ask for ✓.
  - § What the person's answers mean: the ✓/✗ bullet gains C: when ✗ could mean more than one
    thing, ask which in a reply on that card; never write a guess into another card or a summary as
    decided.
  - § Retiring and distilling (consolidation): a summary states only what ✓ and ✗ settled; a ✗
    whose meaning was asked and not yet answered is still open there.
  - The front matter `status` line: v3.5 first, as the earlier versions are written.
- **Details**: keep the file near its size (324 lines at v3.4); no rule on card length; no numbers in
  card text.

### Step 3: Scenarios

- **Action**: in `skills/vision-board/scenarios.md` (status v3.5, one line in its header list):
  - **24 (new)**: a question whose answer is a name. A good run draws it with "Answer in a note";
    after the person's note, replies restating it and asking for ✓; fails if it asks for ✓ or ✗ on a
    name, or treats the note as settling the card.
  - **25 (new)**: ✗ on an ambiguous ask (VERIFY_01's "Who writes the release post?" drawn with ✓/✗
    and no meaning given). A good run replies on the card asking which ✗ meant; fails if it writes
    "no release post" anywhere as decided.
  - Update 13 and 22 only if their "good run" now contradicts A, B or C (say which, or that none did).
- **Details**: names and content made up (no PII).

### Step 4: Run and record (rule 17)

- **Action**: run 24, 25, 13 and 22 with Claude Code and with Kiro, the way the answer model's
  VERIFY_01 ran them (its § Set-up: `claude -p` with the panel's flags, `packages/agent/src/claude-args.ts`
  `buildClaudeArgs`; `kiro-cli` as a workspace agent with the skill as its prompt and only `vb`;
  each message built by `apps/board/server/chat-prompt.ts` `promptFor` and
  `packages/actions/src/board-message.ts` `roundOf`; servers on their own ports, `HOME` and
  `VB_PROJECT` in the system temp folder, `VB_KIRO_AGENT=0`). Record each run in
  `skills/vision-board/NOTES.md` under a new "Skill v3.5" section: model used, pass or fail, the
  example words on a fail.

---

## Files Involved

| File | Purpose |
|------|---------|
| `skills/vision-board/SKILL.md` | The rules (§ Kinds: the kind decides, § What the person's answers mean, § Retiring and distilling, § Answering), v3.5 |
| `skills/vision-board/scenarios.md` | Scenarios 24 and 25 new; 13 and 22 checked |
| `skills/vision-board/NOTES.md` | "Skill v3.5": what changed and the runs |
| `cortex-tasks/board/2026-10-15_board-actions_answer-model/VERIFY_01_by-hand.md` | The evidence (problem 2) and the run harness (§ Set-up) |
| `cortex-tasks/board/2026-10-15_board-actions_answer-model/T_01_skill.md` | How v3.4 was written and run; its optional Kinds line |
| `packages/actions/src/clears.ts` | What a reply clears (`foldClears`) |
| `packages/mcp/src/info.ts` | The MCP instructions: read only; if they contradict v3.5, say so (a contract change is out of scope) |

---

## Out of Scope

- Any change to the board, the API, the MCP instructions or the ledger.
- The review polish set (`cortex-tasks/board/2026-10-15_board-ui_review-polish/`).
- Go to a card by its number, the "what's new" container tags and step-through, images on cards.

---

## Constraints

- **Agent instructions are code** (rule 17): reviewed and run against the scenarios before release.
  A rule that fails its own scenario in both agents is not released; report it.
- **STOP** and ask if step 1 shows B or C cannot work as written (above).
- If deviation is needed, collaborate with the maintainer; no breaking changes silently. No PII in
  examples. No git commits. Never touch `.visionboard/`; don't use the board on 4466. Stop every
  server and process you started.
- Update this file with implementation notes on completion.

---

## Success Criteria

- [x] Step 1's findings recorded (B's flow and C's visibility), with the maintainer's answer if asked.
- [x] SKILL.md at v3.5 with A, B and C; scenarios 24 and 25 written.
- [x] 24, 25, 13 and 22 pass with Claude Code and with Kiro, or each failure is recorded with an
      example (NOTES.md § Skill v3.5).
- [x] `npm run check` and `npm run verify` exit 0; `packages/agent` tests pass.
- [x] Task file updated with completion notes.

---

## References

- `docs/decisions.md` D-045 (✓ and ✗ are tools; a note never answers; the agent's answer clears)
- `cortex-tasks/board/2026-10-15_board-actions_answer-model/PLAN.md` (rulings 1, 7 and 10)
- `cortex-tasks/board/2026-10-11_board-agent_skill-conversation-board.md` (an earlier skill change and its runs)
- `docs/specification/api.md` (36: what answers a note; 64: group notes; 147: `check` / `cross`)

---

## Agent Notes

**Status**: Completed (2026-10-16)

### Execution Log
- [x] Started: 2026-10-16 04:30
- [x] Completed: 2026-10-16 04:48

### Step 1: the mechanics (scratch board, port 4495, temp project)
- **B works end to end.** A `question` ending "Answer in a note": the person's note puts it "With
  agent" (header "0 open · 1 with agent · 1 answered"); the agent's `reply` naming the note brings
  it back "Open" with "1 update" (`clears.ts` `foldClears`); the person's ✓ answers it. No need to
  stop (the settled note, D-046).
- **C works, with one weak spot.** A `reply` with no `to` on a ✗'d card clears nothing: the ✗ stays
  lit, the card counts answered, nothing `pending`. The reply shows on the card face as an "Agent
  reply" block (`node-core.ts` `conversation`, an orphan entry) but gets no "1 update" tab and no
  count change (`updates.ts` `unseenCount` counts only versions and clearing replies). The person's
  note in answer is carried by Send as `2 (question): ✗: <words>`, and is owed. An `append`
  instead shows "1 update" and also leaves the ✗ standing. I judged the reply noticeable on the
  card itself and kept ruling C's wording (a reply); the missing marker is item (a) below.

### Changes Made
- `skills/vision-board/SKILL.md` v3.5 (337 lines; 326 before): front matter `status` v3.5 first;
  § Kinds two bullets (A: ask so ✓ or ✗ reads one way, "✓ keep · ✗ rename"; B: an answer in words
  ends "Answer in a note", reply with what you understood and ask for ✓, never ✓ or ✗ on a name);
  § What the person's answers mean one bullet (C: ask which in a `reply` with no `to`, act on
  neither, never write a guess anywhere as decided; the answer comes as a note); § Reading the
  person's answers (a settled card is raised again to ask what its ✗ meant); § Retiring and
  distilling (no proposal while a ✗'s meaning is asked; the summary states what ✓ and ✗ settled;
  that card stays).
- `skills/vision-board/scenarios.md` v3.5: 24 and 25 new; 13 updated ("Reads ✓ on 9 (an action)
  as done" gave ✓ a meaning by kind, against A: now read from what 9 asks); 22 unchanged (its good
  run already asks with ✓ and ✗ and treats the note as no answer).
- `skills/vision-board/NOTES.md` § Skill v3.5: the rulings, the change, the mechanics, the runs.
- `packages/mcp/src/info.ts` read: no contradiction ("✓ or ✗, which mean what your card asks").

### Runs (rule 17; detail in NOTES.md § Skill v3.5)
VERIFY_01's harness reused from `$TMPDIR/vb-skill35/` (scripts copied from `vb-verify01`, ports
made 4493/4494, Kiro `--resume-id` added): one server per agent, `HOME`/`VB_PROJECT` in the temp
folder, `VB_KIRO_AGENT=0`; each board drawn by a newly joined agent; the person's acts on the page;
each message built by `promptFor` / `roundOf`.
- **Claude Code** 2.1.301, `claude -p` with the panel's flags: **ran Opus 5.5** (`modelUsage`
  `claude-opus-5-5`, every turn).
- **Kiro** `kiro-cli` 2.24.0, workspace agent with the skill as prompt and `@vb` only: **ran Opus
  5.5** (session files record `claude-opus-5.5`).

| Scenario | Claude Code | Kiro |
|---|---|---|
| 24 (an answer that is a name, two turns) | pass | pass |
| 25 (✗ that could mean more than one thing) | pass | pass |
| 13 (✗ on a yes/no question) | pass | pass |
| 22 (a note that asks, on a decision) | pass | pass |

Slips (not fail criteria): chat words past "Done." (Claude 3 of 6 turns, one with no "Done.";
Kiro 5 of 6). Harness: Claude ran two read-only `Bash` calls in 13 (the person's own settings
let them through, as in VERIFY_01).

### Issues & Resolutions (for the maintainer)
- (a) C's reply carries no update marker: a person using Hide answered, or scanning for "1
  update", can miss it. A page change (an orphan reply on an answered card counts as an update) is
  out of scope here; a candidate tracker row.
- (b) Beyond scenario 25, a second turn: the person's note "I meant no post: a changelog entry is
  enough." Claude replied and asked "✗ again to settle it"; Kiro replied, rewrote the summary
  "Release post: none (✗)" and retired card 4, though its own reply had cleared the ✗. The skill
  says "ask for the mark again if you still need one"; whether that should be "always" is open.
- (c) Scenario 13 changed under A (its "✓ on an action = done" line); confirm.
- Gates: `npm run verify` 0 (0 warnings), `npm run check` 0, `npm test` 0 (1286/1286, timing 7/7,
  `packages/agent` included). `npm run build` was run once so the scratch servers served the
  current page (`apps/board/dist`, git-ignored).
- Every server stopped (4493, 4494, 4495); no `claude` or `kiro-cli` process left. Nothing in
  `.visionboard/` touched; the board on 4466 not used. No security concerns.

---

## On Completion

1. Update frontmatter: `status: completed` and `completed: YYYY-MM-DD`
2. Append your LOG entry — one line, terminated with a newline, append-only (never `str_replace`):
   ```
   [[YYYY-MM-DD HH:MM]] [board-agent] Completed: Skill Rules for Check and Cross → Task: [[cortex-tasks/board/2026-10-15_board-agent_skill-check-cross-rules.md]]
   ```
   Cite files by path + symbol, never by line number.

> This is a standalone task, so this entry is the whole record. Do not write to `AUDITED.md`.
