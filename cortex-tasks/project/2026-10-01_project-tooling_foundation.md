---
created: 2026-10-01
completed: 2026-10-01
status: completed
categories: [project-tooling, project-docs]
type: implementation
tracker: cortex-tasks/tracker.md#U2
---

# Task: Foundation before board v3 Stage 2

Approved by the maintainer in chat on 2026-10-01 ("Yes, on 14 - 18"), after a foundation
review: folder hierarchy, modularity, future-proofing, and knowing what is where.

## Steps

1. Cortex setup: PROFILE §2 categories (`board-*`, `project-*`), REGISTRY paths, a flag-only doc
   fence (`docs.flag`), deep scan off.
2. Tracker rewritten as the Cortex v3.3 queue; HANDOVER.md archived.
3. D-016: module layers, front doors, new folders (`packages/agent`, `packages/cli`, `skills/`,
   `scripts/`).
4. Front doors: `src/index.ts` added to `format` and `ui`, and every cross-module import
   rewritten to use one.
5. `scripts/verify.mjs` (zero dependencies) with tests in `scripts/verify.test.mjs`; `npm run
   verify` and `npm run map`; generated `docs/specification/modules.md`.
6. Package and app READMEs get "Depends on / Used by / Public API" sections; root README layout
   and status updated.

## Out of scope

- Editing the protected steering file. Its "Where things live" rows are proposed in chat for the
  maintainer's yes.

## Outcome

`npm test` passes 33/33 and `npm run verify` passes, with one warning: `apps/board/public/src/main.ts`
is 360 lines, which Stage 2 removes. The interim `temp/smoke.ts` "bad Host" check is a false
failure: Node's `fetch` cannot override the `Host` header. `curl -H "Host: evil.com"` gets the
correct 403.
