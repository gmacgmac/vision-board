---
category: project-docs
type: tracker
status: active
created: 2026-09-30
last_updated: 2026-10-01
scope: The live queue for Vision Board, from founding rules to a board any agent session can use
---

# Vision Board — Tracker

> **The one queue.** This file is the live state. The history of what landed is the task files
> under `cortex-tasks/` plus `cortex/LOG.md`. Decisions belong in `docs/decisions.md`,
> architecture in `docs/`, detail in the task file. Aim for under ~250 lines.

---

## How this file works

1. **One item at a time.** Pick an ID, talk it through, write it up as a Cortex task, execute it,
   verify by execution.
2. **On completion, delete the row**, the table line and any detail block. The task file and the
   LOG entry are the trace.
3. **IDs are stable and never reused.** The prefix says where the item started: `U` urgent,
   `N` near term, `M` medium term, `L` long term, `W` workaround. An item that changes bucket keeps
   its ID.
4. **History is never rewritten.** Task files and LOG entries keep their old references.
5. **New items land in the bucket that matches**, not at the bottom.
6. **Every item gets the maintainer's explicit go before it starts.** "Proceed" on one item does
   not carry to the next.
7. **A problem found outside the task** is filed as a row: problem, example, solution, one
   sentence each.
8. **A workaround is recorded when it is taken**, in Workarounds, with how it ends.
9. **Close-out** (the orchestrator): delete the row, rewrite Status, write the LOG line.

**Buckets.** The question is *when does this hurt*, not *how hard is it*:

| Bucket | Means |
|---|---|
| **Urgent** | Blocks the current milestone (board v3), loses data, or is the first thing a user sees fail |
| **Near Term** | Bites in the first fortnight of real use |
| **Medium Term** | Real debt with a known shape; costs more the longer it waits |
| **Long Term** | Needs something else to exist first, or is a product bet |
| **Parked** | Waiting on a gate: a proof, a validation pass, a maintainer decision |

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

The walking skeleton runs, with 28 tests passing, and the board has been dogfooded on the
`first-look` session (views v1 and v2). The framework interview settled D-005 and D-009 to D-015:
plain Svelte, our own canvas, the Studio component model and the APCA contrast tiers. The board
v3 plan is approved. Next: finish the foundation (U2), compact, then board v3 Stage 2.

---

## URGENT

| ID | Item | Why | Source |
|---|---|---|---|
| U1 | Board v3 | **Problem:** notes can't be edited, there is no lasso or chat panel, and replies are pasted by hand. **Example:** first-look v2 items 14–26. **Solution:** the approved 7-stage plan. | Maintainer, 2026-10-01 · `cortex-tasks/board/2026-10-01_board-v3/TASK-STATUS.md` |
| U2 | Foundation before Stage 2 | **Problem:** no Cortex categories, no import-boundary check, no module map. **Example:** tasks can't be categorised, and wrong-way imports would go unnoticed. **Solution:** Cortex setup, one decision entry for `packages/agent`, `packages/cli` and `skills/`, fixed README sections, `scripts/verify.mjs` plus a generated module map. | Maintainer, 2026-10-01 |

## NEAR TERM

| ID | Item | Why | Source |
|---|---|---|---|
| N1 | Contrast gate for the three APCA tiers | **Problem:** token colours are hand-picked and unchecked. **Example:** `packages/tokens/src/tokens.css` TODO. **Solution:** port Studio's contrast check, tiered per D-009. | HANDOVER gap 13 |
| N2 | JSON Schema for the view and transcript | **Problem:** rule 6 needs versioned schemas, and today it's a TypeScript validator only. **Example:** `packages/format/src/validate.ts`. **Solution:** schema files, with docs generated from them. | Rule 6 |
| N3 | Page tests decision | **Problem:** rule 13 page tests need Playwright and axe-core, which aren't decided yet. **Example:** D-014 leaves them out. **Solution:** a decision entry plus a `test:pages` script, as in Studio. | D-014 |

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
| N4 | Accept D-001 to D-004 and D-006 to D-007 | Maintainer review; all still Proposed | `docs/decisions.md` |

---

## WORKAROUNDS — shortcuts taken on purpose, to resolve or ratify

| ID | Shortcut | Why taken | How it ends |
|---|---|---|---|
| W1 | Agents put the nvm Node 22.23.1 path first on every command | `/usr/local/bin/node` is 22.14 from the nodejs.org installer and can't run `.ts` | Maintainer removes the old install (sudo commands in chat, 2026-10-01) |
| W2 | Gardener told "flag only" in a `REGISTRY.md` note | Cortex has no `docs.flag` tier yet | `docs.flag` lands in Cortex (`temp/cortex-upstream-handover.md`) |
| W3 | Board replies pasted into chat | No `vb wait` or chat panel yet | Board v3 Stages 4 and 6 |
