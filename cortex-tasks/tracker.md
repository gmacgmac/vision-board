---
category: project-docs
type: tracker
status: active
created: 2026-09-30
last_updated: 2026-10-07
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
3. Use Node 22.18 or newer, which runs the `.ts` files directly (`/usr/local/bin/node` is 24.14).
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
| U1 | Board v3: the last two items | **Problem:** the board v3 plan's stages 1-6 are built and in use; two items remain. **Example:** a decision drawn as a flow of options; a final check of the whole v3 plan. **Solution:** item 7, a decision flow mode (incremental layout), and item 8, the plan's verification. | Maintainer, 2026-10-01 · `cortex-tasks/board/2026-10-01_board-v3/TASK-STATUS.md` |

## NEAR TERM

| ID | Item | Why | Source |
|---|---|---|---|
| N1 | Contrast gate for the three APCA tiers | **Problem:** token colours are hand-picked and unchecked. **Example:** `packages/tokens/src/tokens.css` TODO. **Solution:** port Studio's contrast check, tiered per D-009. | HANDOVER gap 13 |
| N2 | JSON Schema for the view and transcript | **Problem:** rule 6 needs versioned schemas, and today it's a TypeScript validator only. **Example:** `packages/format/src/validate.ts`. **Solution:** schema files, with docs generated from them. Done as U4 step 1 (D-022). | Rule 6 |
| N5 | Install Prettier | **Problem:** D-007 names Prettier as the formatter, and it isn't installed. **Example:** D-014 lists five packages, Prettier isn't one. **Solution:** pin it, add it to `dependencies.md`, add a `format` check to `verify`. | D-007 |
| N9 | Board settings instead of address flags | **Problem:** feature flags are switched by adding `?flags=` to the address, which a person won't know or remember. **Example:** card sizes need `?flags=nodeSize`. **Solution:** a settings panel on the board for flags and board preferences, saved per person; design to be discussed. Include two switches from D-032: hide the dot grid, and a very light blur behind cards (off by default). | Maintainer, 2026-10-05 |
| N10 | Size control crowds the card's top-right corner | **Problem:** the S/M/L control (D-030, option A) and the note pin share the card's top-right border, so it looks bunched. **Example:** a card with a note on `?flags=nodeSize`. **Solution:** unknown; review the control's place by eye once notes beside cards (2e) are in. | Maintainer, 2026-10-05 |
| N11 | The person edits a card's text | **Problem:** only the agent can change a card's text; the person can only ask for a change in a note. **Example:** fixing a wrong word in a finding without a round trip. **Solution:** a person edit becomes a new version of the node in the ledger (D-017, D-018), shown like any other version; design to be discussed. Notes stay append-only: an edited note shows its latest text, earlier text kept in history (chat 664). When the agent next reads the board, the change must reach it wrapped in a short message saying what the person changed and from which version; the agent skill (rule 17) explains how to treat it (chat 718). | Maintainer, 2026-10-05 |
| N12 | Performance budgets enforced | **Problem:** rule 15's budgets are mostly unchecked, and the page re-fetches and re-measures the whole board on every change. **Example:** `controller.ts` `watch` calls `openBoard`; `relayout` measures every card. **Solution:** `docs/specification/performance.md`: incremental updates, per-container layout, measure only changed cards, skip off-screen cards, ledger checkpoint; **Built 2026-10-05 (N12_FE_01): incremental updates, per-container layout, counting and timing tests; follow-up N15.** a 1,000-card page test, a page test that changes 50 cards (and 1) and counts that only those cards and their containers were redrawn, and a page-weight check, before Stage 3. | Maintainer, 2026-10-05 |
| N14 | Remove and purge a sent note | **Problem:** a sent note can't be taken out of history, and the ledger only ever adds lines (D-017), so a hidden note's text stays on disk. **Example:** a note holding something that shouldn't reach AI models in future chats; the board outlives any one chat and becomes context for new ones. **Solution:** Remove hides a sent note from the board and every agent read; Purge also blanks its stored text, after a confirm, recording who and when. Purge is the one exception to append-only, so it needs a decision entry first. It can't recall text an agent already read in its own chat (delete that chat). Purge must also blank the text in `read_ledger`, which today returns every raw line to any agent, including a note's earlier wording and removed notes. 2e leaves the seam. | Maintainer, 2026-10-05 (742-745) |
| N15 | Opening a board reads the whole project ledger | **Problem:** since N12 the page builds its state from the raw ledger, 500 lines per call, so opening a board costs about 200 calls on a 100,000-event project; JavaScript work per batch is still across all cards (only the page's drawing work is proportional). **Example:** a project a year old. **Solution:** open from a server-folded snapshot at a `seq` (the server already folds; checkpoint, performance.md 7), then apply lines after it; drop the page's copy of `getBoard` (`board-data.ts`) once the server shares it. Measure first with a generated 100,000-event project. | N12_FE_01, 2026-10-05 |
| N16 | Read a chosen list of cards in one call | **Problem:** an agent checking several cards before it changes them needs one `show_node` per card, or the whole `get_board`. **Example:** verify cards 12, 15 and 31 before a redraw. **Solution:** one read taking several numbers (contract first, api.md); until then `get_board` covers it. | Maintainer, 2026-10-06 (959, 997) |
| N23 | Rewind to a version | **Problem:** a past version can only be viewed. **Solution:** a Rewind to this version action; design to be discussed (append-only ledger). | Maintainer, 2026-10-07 (154) |
| N26 | Other proposals: content changes, and agents without write access | **Problem:** a proposal can only acknowledge or drop a card. **Example:** an agent that may read a board but not write on it suggests a change to a card. **Solution:** the card proposal box (Stage 5, `bindCardPopover`) carries the new kinds; needs a contract change and a permissions row. | Maintainer, 2026-10-08 (220) |
| N27 | Selection bar covers an open card box | **Problem:** the floating selection bar draws above an open proposal or handover box, hiding its top line. **Solution:** hide or move the bar while a card box is open. | VERIFY, Stage 5, 2026-10-08 |
| N28 | Launcher and desktop app | **Problem:** starting the board means typing `npm run board` in this repo. **Example:** opening the board without a terminal. **Solution:** a launcher on a fixed port with Launch/Stop/Open, a registry of running boards so `vb-mcp` finds its board by folder, a small app built per computer (chat 398, 402, 403). Paused by the maintainer until U12 is in use. | Maintainer, 2026-10-09 |
| N38 | Agents draw a container per area with links between them | **Problem:** in skill v2.5 runs the model drew one container per area with 7-8 links between containers instead of lanes or a phase flow; it also sets `size` on every card and ends with long chat words. **Example:** batch 3 T_01 runs (scenario 17). **Solution:** a firmer skill rule (named areas with handoffs: lanes or a phase flow), or `show_layout` reporting links that leave the container; test against scenario 17. | VERIFY, 2026-10-11 |
| N43 | The "N selected" pill covers content | **Problem:** the floating selection pill draws over what is under it. **Example:** a container's count, and a card's title in a past view (review-polish VERIFY_01, item 16). **Solution:** unknown; move the pill clear of the selection, or keep it out of the board area. | Maintainer, 2026-10-16 (186) |

## MEDIUM TERM

| ID | Item | Why | Source |
|---|---|---|---|
| M1 | Versions, change highlights, Confirm these, Approve | **Problem:** you re-read the whole board each version. **Example:** Architect's v1/v2/v3 with Changed and New badges. **Solution:** port the behaviour, not the code. | `docs/vision.md` |
| M3 | Generated pattern index | **Problem:** "does this pattern exist?" has no generated answer yet. **Example:** D-006. **Solution:** generate `docs/patterns/` from each `pattern.json`. | D-006 |
| M4 | A scroll that reaches a card's end pans the board | **Problem:** scrolling a card's text with a trackpad or wheel, the same gesture carries on into panning the board once the text reaches its end, so the board swipes away. **Example:** a long note scrolled hard to the bottom. **Solution:** a scroll gesture that started in a card stays in it; only the next gesture pans (gesture boundaries from a gap in wheel events, trackpad momentum included). Paused 2026-10-16: harder to get right than it looks, and ⌘ + drag already pans from anywhere. | Maintainer, 2026-10-16 (193) |

## LONG TERM

| ID | Item | Why | Source |
|---|---|---|---|
| L1 | More layout modes: tree, timeline, matrix, layers, text | **Problem:** the vision lists nine modes and five exist. **Example:** `docs/vision.md` § Layout modes. **Solution:** add each once one container is excellent (v2 item 22). | `docs/vision.md` |
| L2 | Share patterns with Studio and the Uplynk architecture repo | **Problem:** ideas proven here need to reach Uplynk. **Example:** `<vb-node>` for the architecture diagrams. **Solution:** extract into a shared package once a pattern is stable in both. | Maintainer, 2026-10-01 |
| L3 | Hosted version | **Problem:** it may become a product. **Example:** maintainer, framework interview. **Solution:** add SvelteKit (D-012) and swap `packages/agent` for a hosted connection. | D-012 |
| L4 | Expand a long card into a modal | **Problem:** a card with a lot of text grows too tall. **Example:** a finding with a long evidence list. **Solution:** a max card height from a token with a "Show more" control first; a modal that shows the full content later. | Maintainer, 2026-10-02 |
| L5 | Self-host Architect's fonts | **Problem:** Figtree, Bricolage Grotesque and IBM Plex Mono load from Google, which rule 18 forbids, so the board uses system fonts. **Example:** mockup 01b. **Solution:** a decision entry, then bundle the OFL-licensed font files. | D-024, 2026-10-02 |
| L6 | One board views a second ledger | **Problem:** a board shows one folder's ledger only. **Example:** looking at another repo's board, copying a card across, then closing it. **Solution:** unknown; needs U12 first. | Maintainer, 2026-10-09 (407A) |

## PARKED

| ID | Item | Waiting on | Source |
|---|---|---|---|
| — | — | Nothing parked | — |

---

## WORKAROUNDS

| ID | Shortcut | Why taken | How it ends |
|---|---|---|---|
| — | — | No workarounds in place | — |
