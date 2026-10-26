# FIX_02_proposal-on-retired-card: A Proposal On A Retired Card Ends

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

---

## Objective

Retiring a card ends any proposal still standing on it, and the page can never send an accept the
server will refuse or get stuck after a refusal.

## Context

Maintainer, chat 2026-10-26 (points 276-280). Seen in `~/ai/nclite/.visionboard/ledger.jsonl`, board
`container-security`: the agent proposed ✓ on card 203 (seq 902, `ver` 3), then retired it with 14
others while consolidating (seq 911). The proposal stayed open in the person's bar. Accepting sent
`{action: 'ack', n, proposal}` with no `ver` (the page reads `ver` from the board, and the card was
gone: `apps/board/src/board/proposal-flow.ts` `ver(n)`, `proposals.ts` `proposalAct`), the server
refused it ("`ver` is required"), and the bar kept the row until a reload.

Cause: `packages/actions/src/proposals.ts` `standing` counts a proposal open unless it was decided or
the card has a newer version. Retiring the card does neither.

This is a bug fix inside the tidy-up's no-new-features rule. It shares Wave 1 with FIX_01; touch only
your files (TASK-STATUS File Ownership).

## Inputs

- **Files to modify**: `packages/actions/src/retire.ts` (`foldRetire`), `packages/actions/src/proposals.ts`
  (`endProposal`, `standing`), `packages/actions/src/conditions.ts` (the `proposal.open` /
  `proposal.stale` `endsWhen` words), `apps/board/src/board/proposal-flow.ts`,
  `apps/board/src/board/proposals.ts`, their tests (`packages/actions/tests/`, `apps/board/tests/`), a
  page spec for proposals, `docs/specification/api.md` (where it says how a proposal ends).
- **Files to reference**: `packages/format/schema/api/common.schema.json` (a proposal's `outcome`:
  `accepted`, `rejected`, `closed`); `packages/actions/src/fold.ts` (306 lines: do not grow it).
- **Skills**: `cortex-architecture`, `cortex-docs`.

## Steps

1. [ ] **Failing tests first**: unit (propose on a card, retire it, the proposal is no longer standing
   and the card's conditions show no `proposal.open`); page (the same through the API on your port: the
   bar shows no row after the retire, and no request without `ver` is sent).
2. [ ] **Fold**: `foldRetire` ends every undecided proposal on each retired card with `endProposal`.
   Use the existing outcome `closed` (an answer the person did not give), so no schema changes. If
   `closed` would mislead an agent reading it, STOP and propose a new outcome (a schema change).
3. [ ] **Page guard**: an accept for a card the page can't find a version for is never sent; the row is
   dropped. After any refused answer the bar works its rows out again (`proposal-flow.ts` refresh), so
   nothing stays stuck.
4. [ ] Update the `endsWhen` words and `docs/specification/api.md` (how a proposal ends: also when its
   card is retired).

## Validation

- [ ] The new tests failed first and pass; the proposals specs pass on your port
- [ ] `npm test`, `npm run verify`, `npm run check`; no screenshot changes

---

## Implementation Notes

_To be completed by agent after task completion. Re-run? Add a `### Run N` block; never overwrite._

**Status**: Pending  
**Completed**: YYYY-MM-DD HH:MM  

### Changes Made
- 

### Issues & Resolutions
- 

### Caught Beyond the Brief
- None

### Deviations from Plan
- None

---

## On Completion

1. Fill in Implementation Notes; set **Status** to `Completed`.
2. Update this task's row in [TASK-STATUS.md](./TASK-STATUS.md) — your row only.
3. Append your own LOG entry to `cortex/LOG.md` — one line ending in a newline, append-only:
   `[[YYYY-MM-DD HH:MM]] [board-actions] FIX_02: what you did → Task: [[cortex-tasks/project/2026-10-26_project-tooling_tidy-up/FIX_02_proposal-on-retired-card.md]]`
4. Return the `cortex-task-exe` Return Contract, with `REQUESTS` for anything outside your files.
   Never write the set entry or `AUDITED.md`. No commits.
