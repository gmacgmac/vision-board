# VERIFY_01_plugin-verification: Verification

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

## Objective

As a newcomer with the built folder and the spec: does a host get a whole, working board, and does standalone behave exactly as before? Findings in `VERIFY_01_findings.md`; nothing is fixed here.

## Steps

1. Write a small host of your own from the spec alone. Where the spec fails you, that's a finding.
2. Use the board in it: every control, a card answered, Send, search, a dialog, narrow panes, two boards, unmount and mount again. Hostile host styles and keys.
3. Standalone against main before this set: anything different is a finding. Chat with a fake agent: chips, Send, zoom, attachments, approvals.
4. Bundle sizes, first paint in a host, a page with no chat. Does anything reach outside `root`? Does a listener survive `unmount`?
5. The doc audit (`cortex-docs`).

The live look (standalone built from the plugin folder, real Kiro on Sonnet, tiny) is the orchestrator's, after this.

## Validation

- [x] Each finding has the steps, what happened, what should, and blocking or not

## Implementation Notes

Findings: [VERIFY_01_findings.md](./VERIFY_01_findings.md). **2 blocking, 15 non-blocking.** Port 7000 up; nothing fixed; the throwaway checkout of `c220b78` removed and every server stopped. Scripts and screenshots stay in `temp/verify-plugin/` (git-ignored).

- **Step 1, a host from the spec alone.** Read `plugin.md` and the folder before any note or `tests/plugin/`. `temp/verify-plugin/server.mjs` and `page/`: plain `node:http`, a strict CSP, the folder copied outside the repo. It drew on the first run. Eight small guesses are F13, and one missing line is F2.
- **Step 2, using it.** Every control I could reach, by Playwright, a look at the screenshots light and dark. F1, F3, F5 to F11. The hostile host was run with and without `!important`; only the plain one is a finding, since nothing but a shadow root stands against `!important`.
- **Step 3, standalone against `c220b78`.** Each checkout's own build and server with the fake `claude`, through `startTestBoard` rather than `npm run board`, as the fake CLI needs it (the same server code). 64 screens compared in pixels, all prompts byte-identical. No finding. The server command differs from the brief's `VB_PORT`/`VB_PROJECT`; the folder and port were fixed through its options.
- **Step 4.** Sizes, first paint, a page with no chat, reach, and listeners from 14 open states with `EventTarget` and the observers wrapped, then a heap measure over 83 mounts. F2, F4, F15.
- **Step 5, the doc audit.** F14, F15. Otherwise clean.
- **Judged:** F2 blocking because it meets the brief's rule on the page's own words, though the fix may be two lines. F4 is the non-blocking one I'd do first. F9 non-blocking because the board works and `svg { display: none }` is extreme, though `svg` and `span` rules being unset is general.

**Verification:** `test:plugin` 51 passed, `npm test` 2187 and 14 passed, `verify`, `gen-api --check`, `check` clean. Not the page suite (orchestrator's). Not checked: see the findings' last section.

**Status**: Completed · **Completed**: 2026-10-31

## On Completion

Notes; your row; one LOG line (`[board-app] VERIFY_01: …` → this file, one line ending in a newline); the Return Contract with `REQUESTS`.
