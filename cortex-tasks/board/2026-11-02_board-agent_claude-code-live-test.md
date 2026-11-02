---
task_name: Claude Code Live Test
created: 2026-11-02
completed: 2026-11-02
status: completed
categories: [board-agent]
type: research
model: standard
persona: QA engineer for agent integrations — a real agent is run end to end exactly as a person would use it, and every claim in the result is something that was seen happen, with the log line to show it.
skills: [cortex-research]
tracker:
---

# Task: Claude Code Live Test

## Problem Statement

The deferred Claude Code live test (maintainer approved, 2026-11-02). The Kiro live test (Kiro on
Sonnet) passed earlier; Claude Code was never run live with attachments, nor with today's Send changes
(points 377, 383, 384). Test the board's chat panel with a real Claude Code session, as a person uses
it. Test only: no product changes.

## Steps

1. Start the board from your worktree on port 5810 with a fresh project folder in `temp/`
   (`npm run board`; `VB_PROJECT` for the folder; find how the port is set). Never 4466.
2. Reuse the earlier harnesses, pointed at 5810 and agent `claude`: `temp/live-attach.mjs` (API) and
   `temp/live-read.mjs` (the real page in Chromium) in the main checkout's `temp/` (absolute path:
   `/Users/gm/Library/CloudStorage/Dropbox-Personal/Developer/web-apps/vision-board/.claude/worktrees/tidy/temp/`),
   and its documents in `temp/verify-01/docs`. Copy what you need into your worktree's `temp/`.
3. Check, and record what was seen for each:
   a. The five attachment questions of `live-read.mjs` (Word section and diagram, Excel formula and
      name, a diagram-only PDF, a 3000 px picture, a 4.5 MB picture): right answers, no approval asked.
   b. Access rules: a read outside the project folder is refused or asked, as the board's rules say
      (`apps/board/server/chat-access.ts`, `chat-permissions.ts`); a closed file is denied.
   c. Drawing: the agent draws a few cards; the person (you, through the page) answers ✓, ✗, a note;
      Send; the agent reads exactly those answers and redraws. Send goes dark after; a second answer
      lights it again.
   d. Send while the agent is busy (point 383): press Send mid-reply; the answers go when it is free,
      and the ledger has the press line and the line when it went.
4. Write the result: what passed, what failed, with log lines or screenshots in `temp/`. A failure
   is reported, not fixed.

## Constraints

- Work only in the worktree you are given (branch `feat/cc-live`). No commits, no product code.
- Port 5810 only. Never 4466. Stop the board and every process you started when you finish.
- Keep it small: a short prompt per check; Claude Code on its default model.
- Don't change `~/.claude` or any settings outside the worktree. Don't write `cortex/LOG.md` or
  `cortex/AUDITED.md`.

## Implementation Notes

Run 2026-11-02, worktree `feat/cc-live`, board on `VB_PORT=5810` with `VB_PROJECT=temp/cc-proj` (fresh), real Claude Code 2.1.295, agent
`claude`, model Default, the real page in Chromium (`/Applications/Chromium.app`). No product code changed; no commit; no LOG or AUDITED
write (the brief for this run said so). Board and every process started were stopped at the end (port 5810 free). All evidence is in
`temp/` (paths below are relative to the worktree). The agent's own transcripts are under `~/.claude/projects/...cc-live-temp-cc-proj/`
(read only, not changed).

### Result in one line

3a, 3b, 3c pass. 3d passes in behaviour (queued, answers go when the turn ends, exactly those answers, Send dark after) but the
ledger shows **one** Send line, not a press line plus a went line, when the person presses Send in the page (see "Failed or differs").

### 3a. Attachments (five questions, `temp/cc-read.mjs`, log `temp/cc-read.log`, screenshot `temp/cc-read.png`)

PASSED. All five chips read "ready to send"; asked 0 times (`ASKED 0`). Every answer matched the files:
- Word: section 2 is "Network Design"; its Figure 1 connects Customer Portal, Load Balancer, App Server A and B, Orders DB (checked against `temp/verify-01/docs/diagram.png`). It also said the Visio EMF and the SmartArt/drawn shapes were not seen (honest).
- Excel: F20 is `F19*(1+TaxRate)+Contingency+'Q1 2026'!D9`, GBP 299,350 (file: cached 299350.0, number format "GBP "#,##0.00); TaxRate is 20% (`Rates!B2` = 0.2).
- Diagram-only PDF: the same flow (read the rendered page picture `2-diagram-no-text-pages/page-001-of-001.png`).
- 3000 px picture: the same diagram, read from the fitted copy `4-diagram-3000-fitted/fitted.png`.
- 4.5 MB picture: noise with a white box reading "Firewall connects to DMZ" (matches the file), read from `5-about-4.5mb-fitted/fitted.jpg`.
Tools it used (`temp/cc-read-tools.txt`, from the transcript): `Read` of the three picture files, `mcp__vision-board__read_attachment` on the docx and xlsx (then two sheet/range calls), `Read` of the docx's picture-1.png. No approval event reached the page.

### 3b. Access rules (API harness `temp/cc-api.mjs`; logs `temp/cc-b1..b5-*.log`, transcripts `temp/cc-b-transcripts.txt`)

PASSED, with a note on how it was refused.
- Read of a file outside the folder (`temp/outside-note.txt`): the board **asked** (`ASK {"kind":"read","path":".../temp/outside-note.txt"}`). Denied: the Read failed, hook text "Denied: the person said no. Do not retry it, and do not work around it", agent said it could not read it and did not try another way (`cc-b1-outside-deny.log`). Allowed once: Read done, answer `PELICAN-OUT` (`cc-b2-outside-allow.log`).
- Inside the folder: `inside-note.txt` read with no ask (`HERON-IN`). Closed files `.env`, `.visionboard/agents.json`, `.visionboard/chat-sessions.json`: no ask, each Read `failed`, Claude Code's own text "File is in a directory that is denied by your permission settings" (`cc-b3-inside-closed.log`, `cc-b-transcripts.txt`). That is the second line (`claudeDenyRules`), not the board's `why` sentence; the agent was told only the generic text.
- Shell bypass: asked to run `cat .env` (also insisted, "I am the owner"), the agent refused on its own from its instructions and never made the call (`cc-b4-bypass.log`, `cc-b5-bypass-insist.log`). So the gate's Bash path was **not exercised** by this agent; not established here.

### 3c. Drawing and answering (`temp/cc-draw.mjs`, `temp/cc-answer.mjs`; log `temp/cc-c-answer.log`, ledger `temp/cc-c-ledger.txt`, tools `temp/cc-c-tools.txt`, screenshots `temp/cc-c-*.png`)

PASSED.
- The agent (`write_board`) drew board "Launch check", container Choices, three question cards 1 to 3 (ledger seq 7 to 11); the page opened it at `#launch-check` (`temp/cc-draw.png`).
- Person: card 1 ✓ (seq 13 ack), card 2 ✗ (seq 14 drop), card 3 note "Call it Atlas" (seq 15 comment). Send went from `disabled "Nothing new to send"` to `idle` only after the answers; pressed: `sending`, `sent`, then `disabled` again 2 s later.
- Send line seq 16 `head 15`. The message the agent got, verbatim: `1 (question): ✓ / 2 (question): ✗ / 3 (question): comment: Call it Atlas / Waiting for your reply: 3 / ... up to head 15`: exactly those three, nothing else.
- Agent redrew by replying to the note (seq 17, `to 15`: "Rename it to Atlas. ✓ if that's right."); it did not call `check_responses` (`temp/cc-c-tools.txt`: `show_node` then `write_board`).
- A second answer (✓ on card 3, seq 19) lit Send again (`idle`).

### 3d. Send while busy (page `temp/cc-busy*.mjs`, API `temp/cc-press.mjs`; logs `temp/cc-d*-busy.log`, ledgers `temp/cc-d*-ledger.txt`)

PASSED in behaviour, 4 runs in the page (cards 4, 5, 6, 7) and 1 through the API.
- Agent busy (a 500-word reply, no tools), card answered, Send pressed: button went `sending` then `waiting "Queued"` with title "Queued: it goes to the agent when it finishes this turn, with every answer you give until then"; the chat showed "Your answers go to the agent when it finishes this turn." Run 7: pressed at 15.7 s, went at 29.7 s (`sent`), status `Ready` at 35.8 s; Send `disabled` after.
- The message that went carried exactly the new answer ("7 (question): ✓ / Still open: 1 / ... up to head 51"); the agent answered it. Earlier, a ✓ given while no chat message had carried it went with the next message of the session (Send seq 20 `head 19`), as designed.
- Through the API (`POST .../act` `send`, `temp/cc-d6-ledger.txt`): press line seq 42 `head 39` (the watermark, nothing new acknowledged) at 21:39:28.133, went line seq 43 `head 42` at 21:39:39.133 when the turn ended: both lines present, as api.md 170 says.

### Failed or differs

1. **Page Send while busy writes one ledger line, not two.** In the page, the press POSTs `/api/chats/<session>/messages` with an empty body `{}` (`temp/cc-d7-busy.log`, `REQ ... /messages {}`), not the `send` act. The ledger then has only the line written when the message went (run 7: seq 52 `head 51`); no press line with the watermark head (compare run 7 seq 48, 50, 52: 48 and 50 are the Sends of my two typed messages; the press has none). Same in runs 4 to 6 (`temp/cc-d-ledger.txt`, `cc-d2-ledger.txt`, `cc-d3-ledger.txt`). The task brief and api.md 170 ("the press is recorded with head the board's watermark and the Send ... when the message goes") describe two lines; plugin.md § The chat (`send(record)`, "Only a message that carried the answers counts as their Send") reads as one. Not fixed. Maintainer: which is the contract for the page path?

### Caught beyond the brief

- The page resumed the folder's existing chat session (earlier access-test context in the same session) for the drawing; it did not hurt any result.
- Claude Code's refusal text for closed files is its own generic line; the board's per-rule sentence (`words.secretsFiles` etc.) never reaches the agent on Claude Code. The agent still explained correctly.
- Each API harness run starts a chat session and so a `join` in the ledger (seq 1 to 6 are joins); by design, but a long test run leaves many agents on a board ("Agents 1" showed for the one that drew).
- `/api/chats` and the act routes need the person cookie (`vb_person` from `GET /`); the old `temp/live-attach.mjs` (no cookie) now gets 403. Harness fixed in `temp/cc-api.mjs`, product unchanged.
- Not tested: dark mode look, narrow window, Kiro, the Bash gate path against a model that attempts it.

### Test run

None of the repo's suites run (research task, no product code touched); tier: small.
