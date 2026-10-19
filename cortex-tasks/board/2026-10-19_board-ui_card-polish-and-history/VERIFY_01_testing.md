# VERIFY_01_testing: Final verification and doc audit

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md)  
> **Plan**: [PLAN.md](./PLAN.md)

---

## Objective

Prove every PLAN.md success criterion with evidence, audit the docs this set touched, and give the
maintainer screenshots to approve the `appTitle` flag by eye.

---

## Context

**Read every task's notes in TASK-STATUS.md before starting.** Added 2026-10-19: also verify
FIX_01 (no ring on click, ring on Tab), AGENT_01 (skill v3.9 text and scenarios 29 and 32 read
true), FE_04 (window look, name in the footer, title off — this replaces step 6's appTitle
screenshots with wide and narrow app cards), and the two single tasks that ran beside the set:
`cortex-tasks/board/2026-10-19_board-app_chat-follow-latest.md` and
`2026-10-19_board-app_lazy-load-chat-panel.md`. The page budget is now 200 KB (maintainer, 21A).
Run `npm run map` if `modules.md` is out of date. Don't restart the maintainer's own
board server; use the page-test servers.

---

## Inputs

- **Files to reference**: PLAN.md § Success Criteria; `tests/pages/app-cards.spec.ts`,
  `app-states.spec.ts`, `notes.spec.ts`, `note-polish.spec.ts`, `card-history.spec.ts`,
  `zoom-and-lasso.spec.ts`, `apps/board/tests/api-flag.test.ts`
- **Skills**: `cortex-docs` (doc audit) — load before starting

---

## Steps

1. [x] Run `npm test`, `npm run test:pages`, `npm run verify`; read the exit codes yourself.
2. [x] Walk each success criterion in a browser (gallery and a fixture board), light and dark;
   record the evidence (test name or screenshot) beside each in TASK-STATUS.md.
3. [x] Targeted checks: the app card doesn't move across all eight states; Allow → Allowed ▾ →
   Stop app → Allow; Z on one app card 95%, on two cards 75%; notes hidden survive reload; an agent
   read (`get_board`, `read_ledger`) has no `notes-hide` and no flag; the history box shows no note
   text.
4. [x] Contrast: APCA on every new pair (rule 3 tiers), light and dark; report any pair under its bar.
5. [x] Doc audit with `cortex-docs`: `docs/specification/components.md` (§ App card, § Notes beside
   cards, § Feature flags, the footer and popovers), `docs/specification/api.md` (new marks),
   `packages/format/README.md` (format 18). Fix claims made untrue.
6. [x] Screenshots for the maintainer: an app card with `appTitle` on and off, zoomed near and
   far. Leave the flag's default for the maintainer's call.

---

## Validation

- [~] Every success criterion ticked with evidence (7 of 8; the page-suite criterion has one failure, not from this set)
- [x] Doc audit done; issues listed in notes

---

## Constraints

- If deviation is needed, stop and ask the maintainer — no silent breaking changes.
- No PII in examples or fixtures.
- No git commits during execution.
- Protected files (steering, `docs/decisions.md`, `docs/principles.md`, tokens): propose the exact change and wait.
- Update this file's Implementation Notes on completion.

---

## Implementation Notes

**Status**: Completed  
**Completed**: 2026-10-19 16:10  

Full evidence is in [TASK-STATUS.md](./TASK-STATUS.md) § VERIFY_01 (numbered 1 to 8); scratch scripts and screenshots in `temp/v01/` (`walk.ts`, `apca.ts`, `agent-reads.test.ts`, `doc-claims.mjs`) and `temp/fe04/`.

### Changes Made
- Ran `npm test` (exit 0), `npm run check` (exit 0), `npm run verify` (ok, two length warnings), the full `npm run test:pages` under the lock (560 pass, 1 fail, 6 not run).
- Walked the criteria in a browser light and dark against my own server (4491), re-measured six APCA pairs, checked agent reads for private marks, audited the docs with `cortex-docs`.
- Ticked PLAN.md's success criteria (7 of 8; the last `[~]`), filled TASK-STATUS.md. No code, test, baseline or doc edited.

### Issues & Resolutions
- **`chat-context.spec.ts:139` fails** (and the 6 serial tests after it do not run): a race between the spec's `c` key and the lazy chat chunk taking the composer focus. Passes on a clean HEAD. Caused by the lazy-load task, not this set. Left for the maintainer (fix in the spec's `open()` and/or the panel not taking focus the person has moved).
- **`board.spec.ts` screenshot (light/dark)**: pre-existing and spec-order dependent (same pixel diff on HEAD alone and here; passes in the full suite). Baseline not regenerated.
- Scenarios 29 and 32 (skill v3.9) are still only read through, not run with live agents (AGENT_01's own caveat).
- The maintainer's `vite build --watch` (board:watch) shares `apps/board/dist` with the page tests' `npm run build`; it did not disturb the run but could.
- Doc audit: no claim found untrue; nothing edited.

### Deviations from Plan
- None. Step 6 (appTitle on/off screenshots) was replaced by FE_04's wide and narrow app card screenshots, as the task's Context says.

---

## On Completion

1. Fill in Implementation Notes above; set **Status** to `Completed`.
2. Update this task's row in [TASK-STATUS.md](./TASK-STATUS.md) — your row only.
3. Append **your own** LOG entry to `cortex/LOG.md` — one line, terminated with a newline, append-only:

   ```
   [[YYYY-MM-DD HH:MM]] [board-ui] VERIFY_01: [what you did] → Task: [[cortex-tasks/board/2026-10-19_board-ui_card-polish-and-history/VERIFY_01_testing.md]]
   ```

   Cite files by path + symbol, never by line number. Don't write the set's entry or to `AUDITED.md`.
