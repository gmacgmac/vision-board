---
category: project-docs
type: tracker
status: active
created: 2026-09-30
last_updated: 2026-10-01
scope: The live queue for Vision Board, from founding rules to a board any agent session can use
keywords: [tracker, queue, roadmap]
---

# Vision Board — Tracker

> **A queue of open items.** This file is live state only. The history of what landed is the
> task files under `cortex-tasks/` plus `cortex/LOG.md`. Decisions belong in `docs/decisions.md`,
> architecture in `docs/`, detail in the task file. Keep it short — aim for under ~250 lines.

---

## How this file works

1. **Every item becomes part of a Cortex task.** Work items one at a time, or batch similar items
   into one task. The task's `tracker:` field names the rows, e.g.
   `tracker: cortex-tasks/tracker.md#U2`.
2. **On completion, delete the row** and its detail block. Never strike through or mark done.
3. **A row is removed only when a completed task references it.** The task and its LOG line are
   the record.
4. **A dropped item** (duplicate, won't do, no longer matters) is deleted with one LOG line as its
   record:
   `[[YYYY-MM-DD HH:MM]] [category] Dropped {ID}: {reason} → Notes: \`cortex-tasks/tracker.md\``
5. **IDs are stable and never reused.** The prefix is the bucket the item started in; an item that
   moves bucket keeps its ID. Cross-reference by ID and title.
6. **New items land in the bucket that matches**, not at the bottom.
7. **A problem found outside the current task becomes a row**: the problem and an example. Add a
   solution if known — "unknown" is a valid answer.
8. **A workaround is recorded when it is taken**, with how it ends.
9. **Every item gets the maintainer's explicit go before it starts** (project rule). "Proceed" on
   one item does not carry to the next.

**Buckets** answer *when does this hurt*, not *how hard is it*.

| Bucket | Prefix | Means |
|---|---|---|
| **Urgent** | U | Blocks the current milestone (board v3), loses data, or is the first thing a user sees fail |
| **Near Term** | N | Bites soon in real use |
| **Medium Term** | M | Real debt with a known shape; costs more the longer it waits |
| **Long Term** | L | Needs something else to exist first, or is a bet |
| **Parked** | — | Waiting on a gate: a proof, a validation, a decision. Keeps its original ID |
| **Workarounds** | W | Shortcuts taken on purpose, to resolve or ratify |

---

## Working style for a new chat

1. Read `.kiro/steering/vision-board-proj.md` (the rules) and `docs/principles.md` (why).
2. Replies are one numbered list whose numbers keep counting across headings, short enough to
   answer "1 ok, 4 skip". Long replies go on the board (`sessions/<id>/view-vN.json`).
3. Use Node 22.23.1 (`~/.nvm/versions/node/v22.23.1/bin`), never `/usr/local/bin/node` (W1).
4. Verify by running `npm test` and reading the exit code yourself, and look at UI changes in a
   browser before reporting them done.
5. Protected files (steering, `AGENTS.md`, `CLAUDE.md`, decisions, principles, tokens) change only
   with the maintainer's yes, proposed as exact wording.

---

## Status — 2026-10-01

The walking skeleton runs and the board has been dogfooded on the
`first-look` session (views v1 and v2). The framework interview settled D-005 and D-009 to D-015:
plain Svelte, our own canvas, the Studio component model and the APCA contrast tiers.
The founding decisions D-001 to D-007 are accepted. The
foundation is in: Cortex categories, a flag-only doc fence, D-016 module layers checked by
`npm run verify`, and a generated module map. Next: board v3 Stage 2 (U1).

---

## URGENT

| ID | Item | Why | Source |
|---|---|---|---|
| U1 | Board v3 | **Problem:** notes can't be edited, there is no lasso or chat panel, and replies are pasted by hand. **Example:** first-look v2 items 14–26. **Solution:** the approved 7-stage plan, reordered 2026-10-02 (U3 first, then `<vb-node>`). | Maintainer, 2026-10-01 · `cortex-tasks/board/2026-10-01_board-v3/TASK-STATUS.md` |
| U3 | Node ledger and board API | **Problem:** "47" can't be traced across chats or compactions, and nothing makes the agent answer every flagged item. **Example:** a parked item picked up a week later in a new chat. **Solution:** per-project ledger, one API (HTTP, MCP, `vb`), proposals, seen badges, parking bundles (D-017 to D-021 drafted). | Maintainer, 2026-10-02 · `cortex-tasks/board/2026-10-02_board-node-ledger/PLAN.md` |

## NEAR TERM

| ID | Item | Why | Source |
|---|---|---|---|
| N1 | Contrast gate for the three APCA tiers | **Problem:** token colours are hand-picked and unchecked. **Example:** `packages/tokens/src/tokens.css` TODO. **Solution:** port Studio's contrast check, tiered per D-009. | HANDOVER gap 13 |
| N2 | JSON Schema for the view and transcript | **Problem:** rule 6 needs versioned schemas, and today it's a TypeScript validator only. **Example:** `packages/format/src/validate.ts`. **Solution:** schema files, with docs generated from them. | Rule 6 |
| N3 | Page tests decision | **Problem:** rule 13 page tests need Playwright and axe-core, which aren't decided yet. **Example:** D-014 leaves them out. **Solution:** a decision entry plus a `test:pages` script, as in Studio. | D-014 |
| N5 | Install Prettier | **Problem:** D-007 names Prettier as the formatter, and it isn't installed. **Example:** D-014 lists five packages, Prettier isn't one. **Solution:** pin it, add it to `dependencies.md`, add a `format` check to `verify`. | D-007 |
| N6 | Dark theme cards unreadable | **Problem:** in dark theme the cards stay white and their titles and body text almost vanish. **Example:** roadmap session, Theme: dark (same before and after the Svelte move). **Solution:** fix the card surface and ink tokens for dark, checked against the APCA tiers; fold into Stage 2's styling step. | Browser check, 2026-10-01 |

## MEDIUM TERM

| ID | Item | Why | Source |
|---|---|---|---|
| M1 | Versions, change highlights, Confirm these, Approve | **Problem:** you re-read the whole board each version. **Example:** Architect's v1/v2/v3 with Changed and New badges. **Solution:** port the behaviour, not the code. | `docs/vision.md` |
| M2 | Connectors avoid cards | **Problem:** some lines hook around cards or cross them. **Example:** first-look v1 item 6. **Solution:** obstacle-aware routing in `packages/layout/src/route.ts`. | Board review 2026-10-01 |
| M3 | Generated pattern index | **Problem:** "does this pattern exist?" has no generated answer yet. **Example:** D-006. **Solution:** generate `docs/patterns/` from each `pattern.json`. | D-006 |

## LONG TERM

| ID | Item | Why | Source |
|---|---|---|---|
| L1 | More layout modes: tree, timeline, matrix, layers, text | **Problem:** the vision lists nine modes and five exist. **Example:** `docs/vision.md` § Layout modes. **Solution:** add each once one container is excellent (v2 item 22). | `docs/vision.md` |
| L2 | Share patterns with Studio and the Uplynk architecture repo | **Problem:** ideas proven here need to reach Uplynk. **Example:** `<vb-node>` for the architecture diagrams. **Solution:** extract into a shared package once a pattern is stable in both. | Maintainer, 2026-10-01 |
| L3 | Hosted version | **Problem:** it may become a product. **Example:** maintainer, framework interview. **Solution:** add SvelteKit (D-012) and swap `packages/agent` for a hosted connection. | D-012 |

## PARKED

| ID | Item | Waiting on | Source |
|---|---|---|---|
| — | — | Nothing parked | — |

---

## WORKAROUNDS

| ID | Shortcut | Why taken | How it ends |
|---|---|---|---|
| W1 | Agents put the nvm Node 22.23.1 path first on every command | `/usr/local/bin/node` is 22.14 from the nodejs.org installer and can't run `.ts` | Maintainer removes the old install (sudo commands in chat, 2026-10-01) |
| W3 | Board replies pasted into chat | No `vb wait` or chat panel yet | Board v3 Stages 4 and 6 |
