---
category: board-ui
type: handover
status: active
created: 2026-11-11
branch: spike/stage-apps
scope: Stage apps spike — what was built, how to pick it up on another machine, and the agreed plan for the app window and its chat drawer
skills: [cortex-architecture, vision-board]
---

# Handover: stage apps spike, and the app window plan

Read this first, then `.kiro/steering/vision-board-proj.md` and `docs/principles.md` as the project
rules ask. Everything below marked **decided** is the maintainer's word from the conversation of
2026-11-10/11. Everything marked **open** still needs the maintainer's answer.

## 1. Where the work is

| Thing | Where |
|---|---|
| Branch | `spike/stage-apps`, cut from `main` at `e2b8ed9` |
| Commits | One spike commit on that branch (local only; nothing pushed to `github` or `gitlab`) |
| Worktree | `.claude/worktrees/stage-apps` inside the repo folder (ignored by `.git/info/exclude`) |
| This file | `cortex-tasks/board/2026-11-11_board-ui_app-window-handover/HANDOVER.md`, on the branch |
| Results board | Ledger `vision-board-upgrade`, board `board-upgrade` (15 cards; cards 7 to 11 are decisions) |
| Proof app | `skills/vision-board/examples/apps/mission-control/` on the branch; a copy in `.visionboard/vision-board-upgrade/apps/mission-control/` |

`main` was not touched by the spike. In the main checkout only board data changed:
`.visionboard/vision-board-upgrade/` (its ledger, `apps/`, `images/spike/`), uncommitted.

## 2. Picking it up on the other machine

The repo folder is synced by Dropbox, `.git` included, so the branch and its commit arrive with the
sync. Git worktrees do not survive that: a worktree stores absolute paths, and the other machine's
home folder differs (this repo already lists stale worktrees from `/Users/dev/...`).

1. Let Dropbox finish syncing on both machines before running git on either. Never run git on
   both at once: two machines writing `.git` produces "conflicted copy" files.
2. In the repo folder, check the branch arrived:
   `git log --oneline -2 spike/stage-apps`
3. Reconnect the worktree (its files synced as plain files; only the link is wrong):
   `git worktree repair .claude/worktrees/stage-apps`
   then `git -C .claude/worktrees/stage-apps status` should say `On branch spike/stage-apps`.
4. If repair fails, make a fresh worktree at a new path instead (the branch has everything):
   `git worktree prune` then `git worktree add .claude/worktrees/app-window spike/stage-apps`
5. Dependencies: the worktree's `node_modules` is a relative link to the repo's own
   (`../../../node_modules`). If the repo's `node_modules` is missing or was built for another
   machine: `npm ci --ignore-scripts` in the repo folder (project rule: install scripts off).
6. Node 22.18 or newer (the spike ran on 24.22).

`temp/` is git-ignored, so the demo ledger and screenshots are not on the branch. Dropbox may still
carry them inside the worktree folder; if not, section 4 rebuilds the demo in a minute.

## 3. What the spike built

Two flags in `packages/format/src/flags.ts`, both on by default on this branch: `appStage` and
`cardDetails`.

| Behaviour | Flag | Where (file, symbol) |
|---|---|---|
| **Open** on an app card: the panel leaves the card and fills the page in the top layer (the popover API), under a bar with the app's name and **Back to card**. Same sandboxed frame, never reloaded. Esc returns. | `appStage` | `packages/ui/src/app-frame/vb-app-frame.ts` (`stage`, `unstage`, `bar`, `told`); `app-frame.css` (`vb-app-frame[data-stage]`); `packages/ui/src/node/node-template.ts` (`appName`: the Open button, `data-app-act="stage"`); `apps/board/src/board/apps/app-cards.ts` (`press`) |
| Panel to board: `vision-board/note` `{ text }` (at most 2000 characters). The board writes it as the person's `comment` act on the app's card, through the one sender. | `appStage` | `packages/format/src/apps.ts` (`PANEL_NOTE`, `PANEL_NOTE_CHARS`); `app-frame-core.ts` (`note`); `app-cards.ts` (`note`) |
| Board to panel: `vision-board/notifications/reply` `{ seq, text }`, one per agent reply on the app's card; a panel that starts again is told them all, oldest first. | `appStage` | `packages/format/src/apps.ts` (`HOST_REPLY`); `vb-app-frame.ts` (`tell`); `app-cards.ts` (`tellReplies`); `apps/board/src/board/controller.ts` (the `replies` and `ver` it hands `createAppCards`) |
| Detail behind a disclosure triangle in a card's Markdown: a line `+++ Label` opens, a line `+++` closes. The card is measured again on toggle. | `cardDetails` | `packages/ui/src/markdown/render.ts` (`splitDetails`, `renderMarkdown`); `markdown.css` (`.vb-md-details`); `apps/board/src/board/cards/card-images.ts` (the `toggle` listener); `apps/board/src/board/host.ts` (`markdownOf`) |
| A panel may play video and audio from the manifest's `resourceDomains` (`media-src`). | none | `apps/board/server/apps/panel.ts` (`panelCsp`) |
| The proof app: live-event mission control, panel only, feeds simulated in the panel (no tools, no keys, no network). Uses the note, the reply, saved state and Esc. | | `skills/vision-board/examples/apps/mission-control/` (`app.json`, `panel.html`) |

Also changed, because contract tests require it: two rows in `docs/specification/apps.md`
(§ The panel protocol) and one expected list in `packages/format/tests/apps.test.ts`. New words are
in `packages/ui/src/words/app-frame.ts`. One line in `cortex/LOG.md`.

Nothing in the sandbox was loosened: the frame is still `sandbox="allow-scripts"` with an opaque
origin, tools still need the person's Allow, the ledger and action layer are unchanged.

### How it was checked

- `npm run verify`: ok. `npm run check`: 0 errors. `npm test`: 2452 passed, 0 failed.
- `npm run test:pages` (full suite, 10.5 minutes): 990 passed, **13 failed**, 10 did not run. The
  failures are app card and gallery specs: `app-fit`, `app-gallery`, `app-states` (the window look),
  `card-history` (the smallest app card's footer), `chat-attach-gallery`, `gallery`, `host-styles`,
  `size`. Likely cause: the new Open button in the app card's footer. Not gone through one by one.
  The plan in section 5 moves Open out of the footer, so fix these after that, not before.
- By hand, with Playwright (`check.mjs` beside this file), light and dark: open and close the
  detail, Open, pick a feed, Raise (the note lands on the card), Esc (the panel still holds its
  feeds), and an agent reply showing inside the app.
- **Not checked:** WebKit (the popover top layer), keyboard and screen reader on the stage (focus is
  not held inside it), whether a panel stuck in a loop can freeze the board. No gallery entries and
  no page specs were written for the new behaviour.

## 4. Running the demo again

From the worktree. Never use port 4466: it is the maintainer's board.

```bash
npm run build
mkdir -p temp/stage-demo/.visionboard/main/apps
cp -R skills/vision-board/examples/apps/mission-control temp/stage-demo/.visionboard/main/apps/
VB_PORT=4520 VB_EDIT=1 VB_PROJECT=temp/stage-demo node apps/board/server.ts
```

In a second terminal, draw the demo board (the CLI must name the same folder, or it answers
`wrong-folder`):

```bash
export VB_SERVER=http://localhost:4520 VB_PROJECT=$PWD/temp/stage-demo
node packages/cli/bin/vb.ts join --label stage-demo        # prints a secret
node packages/cli/bin/vb.ts write-board --board stage-demo --secret <secret> \
  --json-body cortex-tasks/board/2026-11-11_board-ui_app-window-handover/demo-board.json
```

Then open `http://localhost:4520/?board=stage-demo`. `node <this folder>/check.mjs` drives it and
writes screenshots to `temp/stage-check/` (make that folder first).

Two things learned the hard way:
- The desktop app's browser pane cannot screenshot or click inside a sandboxed frame. Use
  Playwright (`page.frameLocator('vb-app-frame iframe')`) to look at a panel.
- `npm run board` always opens read-only; `VB_EDIT=1` (or `--edit`) opens it for editing. A restart
  without it drops Editing. That is by design, not a bug.

## 5. The plan from here

### What the maintainer said (decided)

- **Liked:** the approach, the zoom to full screen, and the mission control app.
- **Disliked:** how the app card itself looks, and notes drawn inside it under the app (they change
  the card's look and force scrolling).
- **An app card becomes a window.** One thin title bar at the top, like a macOS or Tauri window,
  and nothing else of the board's: no coloured border, no footer. Everything under the bar is the
  app's, for the building agent to design freely.
- **The title bar holds the controls:** Open, the flag, and an arrow that shows and hides a chat
  drawer. Later (save for later) goes from app cards.
- **The conversation is a drawer on the app's right.** Opened, it is a normal chat thread that
  scrolls, at a comfortable chat width, about this one app and its data. Show and hide is a must.
- **Two ways to send in the drawer:** Raise (as today: kept until Send to agent), and a Live mode
  where each message goes straight to the bot and its answer comes back.
- **Freedom first, safety kept.** The sandbox stays; no new guardrails that get in the way of use.
- **Apps are not going into nclite this way.** nclite will have its own kinds of artifact. This
  board is for mission control, planning and architecture; nclite's is for planning and organising.
  So app work targets the standalone board only: no plugin contract work for apps.
- **Drag to resize: not wanted now.**
- **Compact nodes already exist;** only the detail behind a triangle was missing (built, section 3).

The inline mock-up shown in the chat (a window with a title bar and a drawer with a Raise / Live
switch) was accepted as a **wireframe of the idea only. Its visual design is not the direction.**
The first job is real design mock-ups for the maintainer to choose from.

### How it fits what is built (the assistant's reading, to confirm)

- The drawer can be a new view of the same record: the person's notes and the agent's replies on the
  app card in the ledger, which is what the spike's channel already writes. Then only where they are
  drawn changes.
- Each message could carry what was selected in the app at that moment, supplied by the app.
- On the stage, the drawer should come along, which also ends "the stage covers the chat".
- Live needs a bot attached to the board (the Kiro chat panel in the standalone app). It should be a
  thread of that chat scoped to the card, not a second chat system.

### Open, for the maintainer

1. On the board, does an open drawer push the cards on its right aside, or float over them?
2. Cards 7 to 11 on `board-upgrade` (not read back; the board was off when this was written):
   an app writing a note without a confirm, the stage covering the whole page, `+++` or a `detail`
   field, one list for media hosts, and whether to build properly next. Several are overtaken by
   the drawer plan: say so on the board when answering.
3. The flag: the maintainer finds it confusing (it reads as a bookmark). A wider question than app
   cards; parked.
4. Icons and logos on cards (card 12): the maintainer's idea, not built.
5. Dropping Later from app cards changes "every card takes a note or Later": it needs a decision
   entry in `docs/decisions.md` (protected: propose the text and wait for the yes).

### Suggested order

1. **Design mock-ups** of the app window and the drawer (closed, open, on the stage; light and
   dark), for the maintainer to pick a direction. Ask before building.
2. **Plan and task.** Read `docs/principles.md`, consult the `cortex-architecture` skill, write the
   Cortex task set. The contract changes first: the app card's controls, the drawer's messages, any
   new panel message for the app's context.
3. **The window look:** title bar, Open and Allow / Allowed into it, footer and border gone.
4. **The drawer:** show and hide, the thread drawn from the card's notes and replies, Raise.
5. **Live mode,** once 4 is right.
6. **Tests and gallery:** redo the 13 failing page specs and their screenshots, add gallery
   entries and page specs for the stage, the drawer and the detail triangle, check WebKit, hold
   focus inside the stage.
7. Later: a stream from server to panel for real feeds (Uplynk, Zixi; keys in `.env` through the
   app's tools), icons, the flag.

The spike is a spike: when the work is planned properly, decide per piece whether to keep its code
or rebuild it to the principles. `packages/ui/src/app-frame/vb-app-frame.ts` is now over 300 lines
(`npm run verify` warns).

## 6. Working with the board from a new chat

- The agent that drew `board-upgrade` joined on the first machine; its secret is not in the repo.
  A new chat calls `join` itself, then `request_grant` with `board: "board-upgrade"` and waits for
  the maintainer's yes on the board, or draws a new board of its own.
- The board must have this repo folder open and the `vision-board-upgrade` ledger selected, in
  Editing. A `wrong-folder` or `read-only` answer means stop and tell the maintainer.
- The maintainer's reply rules: numbered points that keep counting, short, the question last. The
  last number used in the first conversation was 47.
