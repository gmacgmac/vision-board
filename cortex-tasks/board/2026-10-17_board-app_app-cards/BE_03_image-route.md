# BE_03_image-route: Image route and contract

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

---

## Objective

Serve the project's images safely and say so in the contract, so FE_03 can render them.

## Context

PLAN.md rulings 19-21, 24 and § Goal state line 11. Runs in wave 3 beside FE_02 (page only); you
touch the server's image route, the format package's limits, tests and docs. BE_02 has landed: reuse
its path-safety helpers if it made them shared (read its notes); otherwise follow `server/static.ts`
`resolveStatic`.

## Inputs

- **Files to create**: `packages/format/src/images.ts` (`IMAGE_LIMITS`: types png, jpeg, webp, gif
  with their magic bytes and content types, max 8 MB, depth 8, the segment pattern; `imagePathProblem(path)`
  → a reason or nothing, **the one path check** both the server and the Markdown renderer use;
  exported from the format front door), `apps/board/server/images.ts` (the route: resolve, check, stat,
  ETag, 304, magic-byte check, stream), `docs/specification/images.md` (folder, subfolders, path rules,
  types and limits, the route and its headers, updates by ETag on select/open, the zoomed view in one
  paragraph pointing at `components.md`), tests `apps/board/tests/images.test.ts` (unit for
  `imagePathProblem`, API for the route) with fixture images generated in the test (tiny valid png,
  jpeg, webp, gif buffers; an svg; a text file named `.png`; an oversized file made sparse).
- **Files to modify**: `apps/board/server/app.ts` (`GET /board-images/<path>` before static; HEAD
  too), `docs/decisions.md` (D-048 verbatim from PLAN.md), `docs/specification/api.md` (a short section
  "Images in cards (D-048)": the route is not an API operation, like the app panel route).
  Not `apps/board/README.md` (FE_02 edits it in this wave; FE_03 adds the image line).
- **Patterns to follow**: `server/static.ts`, `server/problem.ts`, BE_02's panel route wiring.
- **Shared artifacts to reuse**: none new beyond BE_02's.
- **Skills**: `cortex-architecture` (one path check in one place, imported by both sides) ·
  `cortex-docs` (images.md, api.md, decisions).

## Steps

1. [ ] Tests first, each seen failing: every refused path of § Goal state line 11; every type
   accepted by extension and bytes; svg and a fake png refused (415); over 8 MB refused (413); 404 for
   missing; `ETag` present and a matching `If-None-Match` → 304; `Cache-Control: no-cache`;
   `nosniff`; Host guard applies; nothing outside `.visionboard/images/` is ever read (assert with a
   symlink pointing outside: refused).
2. [ ] Build `images.ts` (format), then the route.
3. [ ] D-048, images.md, api.md section.
4. [ ] Gates one after another: `npm run check`, `npm test`, `npm run verify`,
   `node scripts/gen-api.mjs --check`, `npm run build`. **Not** `npm run test:pages` (FE_02 runs
   page tests in this wave).

## Validation

- [ ] Gates above exit 0; every safety case has a test named in your notes.

## Constraints

- Touch nothing under `apps/board/src/` (FE_02) or `packages/ui/` (FE_03 next). No git commits.
  Deviation: TASK-STATUS.md instruction 5.

## Implementation Notes

**Status**: Pending

## On Completion

Fill the notes; update your row and section in TASK-STATUS.md; append one LOG line:
`[[YYYY-MM-DD HH:MM]] [board-security] BE_03: <what you did> → Task: [[cortex-tasks/board/2026-10-17_board-app_app-cards/BE_03_image-route.md]]`
