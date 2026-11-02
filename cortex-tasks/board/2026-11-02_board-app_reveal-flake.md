---
task_name: Reveal Of A Hidden Card Flake
created: 2026-11-02
completed: 2026-11-02
status: completed
categories: [board-app]
type: implementation
model: strong
persona: Test reliability engineer — a flaky test is either a race in the product a person could hit, or a test that doesn't wait for what it asserts; find which, prove it, fix that one.
skills: [cortex-architecture]
tracker:
---

# Task: Reveal Of A Hidden Card Flake

## Problem Statement

`tests/plugin/view-gives.spec.ts` "reveal of what is not on the board says so through notify, and takes
no focus" fails now and then under load (seen at 8d8be60 and today): after ✓ on card 1, H, and
`reveal({ n: 1 })`, the last notice is "1 ✓", not the "hidden" notice, within 5 s. Suspect: H is
pressed before the ✓ lands, so card 1 isn't hidden yet. That may be a test that doesn't wait, or a
product race a person could hit (✓ then H quickly). The maintainer asked to research it and fix it if
there is a real issue.

## Steps

1. Reproduce: run the spec under load (`--repeat-each 10`, 3 workers) and read a failing trace.
2. Find the cause in the code (how ✓ lands, how H decides what is hidden: a mode that follows new
   answers, or a one-off over what is answered now). Say in the notes whether a person can hit it.
3. A product race: failing test first (unit or page), then fix it in the product. A test-only race:
   make the test wait for the state it relies on, with a comment saying why.
4. Prove it: the spec `--repeat-each 20` under load passes; unit tests and the plugin suite pass; any
   page spec you touch passes. All at `nice -n 15`, at most 3 workers.

## Constraints

- Work only in the worktree you are given (branch `feat/reveal-flake`). No commits, no git history.
- Ports: `VB_TEST_PORT=5210` (plugin), `5310` (pages), never 4466 or 4600–5199.
- No protected files. Don't write `cortex/LOG.md` or `cortex/AUDITED.md`: the orchestrator logs.
- STOP and report if the fix needs a seam or ledger change.

## Implementation Notes

**Cause: a test that doesn't wait.** The ✓ goes through `createItemActs` (`apps/board/src/board/cards/item-acts.ts`)
→ `sender.record` → `attempt` (`apps/board/src/board/sender.ts`): POST, then the stored line is applied and drawn,
then the toast "1 ✓". H (`toggleHide`, `apps/board/src/board/controller.ts`) turns a mode on: `hiddenSet` works
the answered cards out of `S.data` at every draw, so it follows answers that land later. `revealCard` asks
`go.why(n)`, which reads what is drawn now. The spec pressed H and called `reveal({ n: 1 })` without waiting for
the ✓ to land; under load the POST was still on its way, card 1 was still open and drawn, so reveal rightly went
to it (no notice), and the "1 ✓" toast came after: the last notice, as reported.

**Can a person hit it? No, not as a fault.** ✓ then H quickly: when the ✓ lands, card 1 hides anyway (the mode
follows it), the same end state as H after the ✓. A reveal in that gap goes to a card that really is open on the
board at that moment. Focus ends on the stage either way (a hidden card gives its focus to the stage in `redraw`).

**Proof.** No failure in 10 runs unloaded (`--repeat-each 10`, 3 workers). A throwaway copy of the steps in
`temp/reveal-flake/` holding the act's POST 800 ms (`page.route`) fails every time with the reported message
(`Received string: "1 ✓"`), and card 1 is hidden once the ✓ lands; the same copy waiting for the ✓ first passes.

**Fix (test only).** `tests/plugin/view-gives.spec.ts` "reveal of what is not on the board…": waits for card 1's
✓ button to read `aria-pressed="true"` before pressing H, with a comment saying why.

**Verified** (all `nice -n 15`, 3 workers, `VB_TEST_PORT=5210`): `view-gives.spec.ts --repeat-each 20`: 300 passed;
`npm run test:plugin`: 78 passed; `npm test`: 2199 + 14 passed; `npm run verify`: ok. No page spec touched.
