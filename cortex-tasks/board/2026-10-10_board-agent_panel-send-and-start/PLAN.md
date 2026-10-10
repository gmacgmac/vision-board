---
task_name: Chat panel - Send hands over the answers, first board from the chat
created: 2026-10-10
status: in-progress
categories: [board-agent, board-app, board-actions]
tracker: cortex-tasks/tracker.md#N30,N31
---

# Chat panel: Send hands over the answers, first board from the chat — Plan

> **From**: maintainer, 2026-10-10 (chat 470, 474, 482, 485) · **Go**: given (474A yes, 474B ok,
> 474C skill only, 474D ok, 482, 485 "sounds good")

## Problems (U13 VERIFY_01)

1. Send records the answers but a chat-panel agent does nothing until the person also types.
2. In a folder with no boards the panel says "Open a board to talk about it" (`chat-panel.ts`
   `NO_BOARD`); chat sessions are kept per board (`start_chat` needs a board, `chat.ts`).
3. Kiro posts 3-4 interim messages per turn.
4. Kiro read ✗ on a yes/no question as "dropped" rather than "No".
5. The model picker says "Opus" / "Sonnet" (CLI aliases), not which version.

## Rulings (maintainer; do not reopen)

1. **Send hands over the answers** (474A, 485): with a chat-panel session on the board, Send posts
   one message to it: "The person updated the board:" then the responses in card order, each with
   its number and kind, e.g. "2 (question): No", "5, 7, 8 (finding, risk, note): comment: …",
   "6 (finding): saved for later"; plus where the agent has read up to (the `head`), so it doesn't
   fetch the same answers again. It reuses the numbered reply text (`packages/actions/src/reply.ts`
   `replyText`), not a second writer. While the agent is mid-turn the message waits and goes when
   the turn ends. With no panel session, Send is as today (outside agents read `check_responses`).
2. **First board from the chat** (474B): the panel works in a folder with no boards; the agent is
   told no board is open and may create one; the page jumps to it when drawn.
3. **Kiro's chatter: the skill only** (474C); the panel is not changed for it.
4. **Plain words to the agent** (474D): a response reaches the agent with the word for its card's
   kind: "yes" / "no" on a question, "done" on an action (✓), as data in `check_responses`, in the
   reply text and in the Send message.
5. **Model versions** (482): the picker names exact models, labelled "Opus 5.5" and "Sonnet 5.5"
   (claude-opus-5-5, claude-sonnet-5-5, 1M context as today), after checking the CLI accepts them.

## Tasks

| ID | What | Model |
|---|---|---|
| BE_01 | Contract and server: ruling 4 (data), ruling 1 (Send message, queued while busy), ruling 2 (a session with no board that attaches to the first board its agent creates) | Opus 5.5 |
| FE_01 | Page: Send with a panel session, the waiting state, the panel in an empty folder and the jump, model labels | Opus 5.5 |
| T_01 | Skill: quiet until a one-line summary in the panel; ✓/✗ words; the Send message's shape | Opus 5.5 |
| VERIFY_01 | By hand with Claude and Kiro: empty folder → first board from the chat; answers; one Send click; Kiro quiet; ✗ read as No | Orchestrator |

Gates after each task (the orchestrator, one after another). If a task can't go green alone
because the next one depends on it, it stops and says so (as U13 did), and the gates run after the
next.
