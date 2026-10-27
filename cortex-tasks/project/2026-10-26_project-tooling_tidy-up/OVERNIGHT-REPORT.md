# Overnight report: the tidy-up, Waves 2 to 8

> Kept current as the run goes. Run on the first Mac, in this worktree (the move to another machine
> was cancelled; `HANDOVER-overnight.md` is kept as the run's rules). The maintainer delegated the
> calls that come up (2026-10-27): each one made is listed under Decisions taken, for review.

## Waves

| Wave | Tasks | Status | Commit · tag | Gates |
|---|---|---|---|---|
| 1 | FIX_01, FIX_02 | Done (before tonight) | c2f6110 · `tidy/wave-1` | green |
| — | Principles 286, set refined | Done | e9218f8 | verify ok |
| 2 | ARCH_01 | Run 1 blocked at step 1 (below); Run 2 running | | Baseline before: 1626 unit tests pass, verify ok |

## Decisions taken (for the maintainer's review)

- **D-059, one package scope** (ARCH_01 Run 1 blocked on it). A `#name` resolves against the
  importer's nearest `package.json`, so `apps/board/package.json` hid the root `imports` map from every
  file in the app (Node, Vite and svelte-check all failed). Folded it into the root: same dependencies
  at the same exact versions, workspaces dropped, lockfile regenerated offline with scripts off
  (`npm install --ignore-scripts --offline`, nothing new fetched). Fits point 224 (modules, not npm
  packages). This touched protected files under your delegation: `docs/decisions.md` (D-059 appended),
  `docs/principles.md` § Dependencies are a cost (the "npm workspaces" line).

## Requests routed

- ARCH_01-R1 (fold the scope), ARCH_01-R2 (decision entry): done by the orchestrator, D-059.

## Caught beyond the brief

None yet.

## To look at by eye (light and dark)

None yet.

## Points for the maintainer

Numbering continues from 287.
