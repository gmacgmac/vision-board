---
task_name: Reveal Of A Hidden Card Flake
created: 2026-11-02
completed:
status: pending
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

_To be completed by the agent: cause, can a person hit it, fix, proof._
