# VERIFY_01_end-to-end: End-to-end check

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Who**: the orchestrator, by hand

## Steps

1. [x] Scratch project and server; the board in the browser pane; the real `claude`.
2. [x] Open the panel, start a session, ask for a board on a topic: words in the feed, change chip
   zooms to the new cards, NEW tabs appear.
3. [x] Comment on two cards, select one, send a message: chips in the composer, the agent replies
   and appends; the updates show.
4. [x] Ask for a file edit: the approval card; Deny leaves the file; Allow once writes it.
5. [x] Reload the page and restart the server: the session resumes. New session: no memory.
6. [x] Stop mid-turn. Past version: composer disabled.
7. [x] Two skill scenarios from `skills/vision-board/scenarios.md`.
8. [x] Kiro: one round, if its login works.
9. [x] `packages/chat` and `packages/agent` import nothing from this repo (verify's LAYERS).

## Implementation Notes

**Status**: Completed 2026-10-09 by the orchestrator, by hand (two rounds).

Round 1 (scratch server on port 4804, `?flags=chatPanel`, browser pane at 1024x768):
- Claude: the first message failed with "API Error: Rate limit reached" (the subscription's limit, not ours); the error state showed.
- Kiro (kiro-cli 2.28.0, ACP v2): drew 5 agenda cards and 3 questions on a person-made board; words in the feed; a "Wrote on Team offsite" chip. Chips: a person note and a selected card went into the composer and onto the message; Kiro updated card 6 from the note with a reply under it and appended a line to card 2 ("1 UPDATE"). File approval card: path, preview, countdown, Allow once / for this session / Deny. Deny: no file, the agent said so. Allow once: `offsite.md` written.
- Not yet run: Stop mid-turn, past version, the two skill scenarios, Claude end to end (rate limit).

Bugs (FIX_01):
1. A message sent right after confirming "New session" is lost: its Send act is recorded, but the message never reaches the new session (it finished starting 3 s later) and the feed resets.
2. Kiro's board write reaches the chat with `cards: []` and no `head`, so its chip says "Those cards are no longer on the board". The adapter doesn't read the write's result from Kiro's tool-call update.
3. After a server restart and a reload, the panel attaches to the older, replaced session (the picker shows Claude) and a send gets 409, though `list_chats` lists the Kiro session first.
4. After a server restart the feed is empty (events live in memory, BE_03 choice 2) with no word why; the agent still remembers.
5. A turn error shows twice: as the agent's text and as the error line.
6. At the default width the agent and model pickers are cut ("Claude", "Defa...").
7. A board the person made and opened while empty shows NEW on every card of the agent's first drawing; the maintainer's ruling (263) is that a freshly drawn board shows no NEW.

Round 2 (2026-10-09, after FIX_01; scratch server on port 4805; the page driven by script because the
browser pane was hidden):
- Claude first answered "API Error: Rate limit reached" again. Cause: two `claude` programs are
  installed; the server spawned the first on PATH, `/usr/local/bin/claude` (an old npm install,
  2.1.87), which reports the default model and `sonnet[1m]` as a rate limit (0 ms, no API call).
  The current one, `~/.local/bin/claude` (2.1.295), answers every model. With it first on PATH:
- Scenario 1 (12 findings, panel): Claude (Sonnet 1M) drew 13 cards in 3 grid containers, no links
  asked for, no NEW on the first drawing (bug 7 fixed). Its chat summary ran several paragraphs,
  not one line: skill evaluation.
- After a server restart and reload the panel attached to the newest session (bug 3 fixed); a
  turn error showed once (bug 5 fixed).
- Stop mid-turn: "Stopped.", no board CLI left running, Stop greyed afterwards.
- Past version: the composer is disabled.
- Scenario 3 (extend a card): Claude appended one sentence to card 1; its chip ("Drew 1 card on
  Code review") zoomed to card 1 and selected it, which cleared its update tab.

Open after round 2 (not blocking): which `claude` the server runs (FIX_02 proposed: a
`VB_CLAUDE_BIN` setting and a clear refusal when the found CLI is too old); the chip says "Drew"
for an append; the agent's chat words are long (skill).
