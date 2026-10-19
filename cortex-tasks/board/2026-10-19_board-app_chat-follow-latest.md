---
task_name: Chat Follows the Latest Unless the Person Scrolls Away
created: 2026-10-19
completed: 2026-10-19
status: completed
categories: [board-app]
type: implementation
model: standard
skills: [cortex-architecture, cortex-docs]
tracker:
---

# Task: Chat Follows the Latest Unless the Person Scrolls Away

> **Go**: given (executed 2026-10-19). Agreed in chat 2026-10-19 (points 12, 15, 15E).

---

## Problem Statement

The chat panel loses the latest message. When the agent starts answering, the reply grows below
the visible part of the log, under the composer; sometimes the person's own sent message doesn't
show either; and opening the panel shows the top of the whole history (seen: `scrollTop` 0 of
11,477px). `ChatFeed.show` (`packages/chat/src/feed/chat-feed.ts`) decides whether to follow by
measuring, before each redraw, whether the log is within `NEAR_BOTTOM` (48px) of its end. Anything
that changes size after that (the composer's line or chips, the Working line, a bar the Svelte shell
adds a tick later) leaves the log more than 48px from the end, and from then on it stops following
as if the person had scrolled away. `[INFERENCE]`: the follow logic alone stays pinned when fed a
growing reply (tested in the page 2026-10-19); the cause is a size change outside `show`, not yet
caught live. The `connectedCallback` scroll runs while the panel is closed, so opening it starts at the top.

**The rule (maintainer):** following the latest is the default. Only the person's own scrolling
away from the latest turns it off: wheel or trackpad, dragging the scrollbar, or Page Up / Home /
arrow keys in the log. Nothing the page does counts: Working, chips from a board selection,
approvals, a growing reply, the composer resizing. Back at the bottom, or sending a message, turns
following on again. While off, a "Jump to latest" button shows.

---

## Steps

1. **Failing tests first** (rule 13): in `tests/pages/chat-panel.spec.ts` (or a new
   `chat-follow.spec.ts` on `tests/pages/chat-server.ts`): (a) a streamed reply stays in view while
   the composer grows by 80px mid-reply; (b) changing the board selection (chips) mid-reply keeps
   it pinned; (c) opening the panel shows the latest; (d) wheel up stops following, a new chunk
   doesn't move the view, "Jump to latest" shows; (e) sending a message pins it again;
   (f) scrolling back to the bottom by hand pins it again. Unit tests for the pure part in
   `packages/chat/tests/feed-core.test.ts`.
2. **Follow state** in `ChatFeed`: a `following` flag, true by default. Set false only from
   person input on the log: `wheel` with `deltaY < 0`, `pointerdown` on the scrollbar followed by
   `scroll`, `touchmove`, `keydown` (PageUp, Home, ArrowUp, Space+Shift) when the log has focus —
   and only if the log is then off the bottom. Set true on `scroll` that reaches the bottom (within
   a few px) and on send (the panel calls a `follow()` method; `chat-panel.ts` send path).
   Programmatic scrolls never change it. Keep the decision pure where possible (`feed-core.ts`).
3. **Stay pinned**: a `ResizeObserver` on the log and on its content (one observer; rows added
   observed as they are drawn) re-pins to the bottom while `following`. `show()` pins after drawing
   when `following`, no longer measuring `NEAR_BOTTOM` first. Becoming visible (panel opens: the
   observer sees the size change from 0) pins too, so the panel opens at the latest.
4. **Jump to latest**: a small button over the log's bottom edge while not following, in the chat
   package's tokens (`chat.css` `--_*`), all control states, labelled, keyboard reachable, hidden
   while following; pressing it pins and sets following. Respects reduced motion (no smooth scroll
   under it).
5. **Gallery**: the chat section (`apps/board/src/gallery/chat-section.ts`) shows the button state.
6. **Docs**: `docs/specification/chat.md` § The panel — the follow rule in one paragraph; update
   `packages/chat/src/feed/pattern.json` states. Run the `cortex-docs` audit on what changed.

---

## Files Involved

| File | Purpose |
|------|---------|
| `packages/chat/src/feed/chat-feed.ts` | `following`, input listeners, `ResizeObserver`, `follow()`, pin in `show` |
| `packages/chat/src/feed/feed-core.ts` | Pure follow decisions (input kind → follow on/off) |
| `packages/chat/src/feed/feed-template.ts`, `feed.css` | Jump to latest button and its states |
| `packages/chat/src/feed/pattern.json` | Pattern states |
| `apps/board/src/board/chat-panel.ts` | Call `feed.follow()` when the person sends |
| `apps/board/src/gallery/chat-section.ts` | Gallery state |
| `tests/pages/chat-panel.spec.ts` or `tests/pages/chat-follow.spec.ts` | Page tests (a)-(f) |
| `packages/chat/tests/feed-core.test.ts` | Unit tests |
| `docs/specification/chat.md` | The rule |

---

## Constraints

- If deviation is needed, stop and ask the maintainer — no silent breaking changes.
- No PII in examples or fixtures. No git commits during execution.
- The maintainer may have a board open: don't restart their server; page tests use their own.
- Tokens only; APCA tiers (rule 3) for the button, light and dark.

---

## Success Criteria

- [x] Page tests (a)-(f) failed before the change and pass after
- [~] `npm test` passes; the chat page specs pass; `npm run verify` fails on the page-weight budget alone (see Notes); full `test:pages` not run (shared build with sibling tasks)
- [ ] Checked by hand in the real board with a live agent reply (left for the maintainer, see Notes)

---

## Implementation Notes

**Done (2026-10-19).**

1. **Tests first.** `tests/pages/chat-follow.spec.ts` (a)-(f) plus keys, the button by keyboard and a test through the board's own panel (`chat-server.ts`, fake `claude`: three turns in a short viewport, scroll away, send, close and reopen). (a), (b), (c) failed before the change (gaps of 88px, 229px and 2274px from the end); (d)-(f) and the rest could not run (no button yet). Unit tests in `packages/chat/tests/feed-core.test.ts` (`atBottom`, `leavesLatest`, `followAfterScroll`) failed on the missing exports. All pass after.
2. **Change.** `feed-core.ts`: the pure decisions. `chat-feed.ts` (`ChatFeed`): `following` (default on), `follow()`, one `ResizeObserver` on the log and its rows (`resized`, `pin`), `show()` pins when following instead of measuring `NEAR_BOTTOM` (removed), `connectedCallback` no longer scrolls while hidden (the panel opening is seen by the observer and follows). `feed-template.ts` / `feed.css`: the Jump to latest button on the log's bottom edge, the chat package's `--_*` tokens, `.chat-btn` states. `chat-panel.ts` `send` calls `feed.follow()`. Gallery state `scrolled-away` (`chat-section.ts`, `chat.spec.ts`, chat screenshots updated).
3. **Two things found while testing, both fixed and held by the page tests.** (i) The browser can scroll on the compositor before a passive wheel handler runs, so the position at the wheel proves nothing: a scroll within 400ms of the person's wheel or key counts as theirs (`PERSON_MS`). (ii) The first step of a smooth scroll up from the end is within 4px of the end and would have turned following back on, and a scroll event still on its way from the page's own pin must not undo the person's key: `followAfterScroll` turns on only when the view moves down to the end, and `awayFrom` ignores a scroll that has not moved.
4. **Deviation to rule on: page weight.** `npm run verify` fails: the board page is 151.7 KB gzip against the 150 KB budget (rule 15, `docs/specification/performance.md`). Measured on a clean checkout of HEAD, the page is 149.87 KB; this task alone adds 0.75 KB (150.62 KB), so it crosses the budget on its own, and the sibling tasks in the working tree add more. Not changed here (the budget and lazy-loading the chat are the maintainer's call). The chat is bundled in the first page load (`chat-rules` chunk).
5. **Not done: checked by hand with a live agent reply.** Not done on the maintainer's running board (port 4466); left for the maintainer. The page tests drive the feed with long states and the board's own panel with the fake agent.
6. **Notes for the maintainer.** The log cannot tell a page-made scroll from the person's when neither wheel nor key nor drag preceded it, so a scroll made by anything else (find-in-page, selection drag outside the log) never turns following off; this follows the rule as written. Page Up in the headless test browser scrolls the log by one page with smooth scrolling, as in a real one. Docs: `docs/specification/chat.md` § The panel (one paragraph, each claim with its symbol and test), `packages/chat/README.md`, `packages/chat/src/feed/pattern.json`.

---

## On Completion

Set `status: completed` and `completed:`; append one LOG line to `cortex/LOG.md`:

```
[[YYYY-MM-DD HH:MM]] [board-app] Chat follows the latest unless the person scrolls away → Task: [[cortex-tasks/board/2026-10-19_board-app_chat-follow-latest.md]]
```
