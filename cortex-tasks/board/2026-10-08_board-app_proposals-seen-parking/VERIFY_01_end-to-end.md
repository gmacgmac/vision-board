# VERIFY_01_end-to-end: End-to-end check

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md) · **Who**: the
> orchestrator, by hand

## Objective

Prove the set works as the maintainer will use it: a real agent over real MCP, the real page.

## Steps

1. [x] Scratch project in the system temp folder; server on a free port; page in the browser
   pane. A throwaway stdio MCP caller (scratchpad) as the agent.
2. [x] Agent draws a board with 4 items. Person comments on two and Sends.
3. [x] Agent `append`s to one card and rewrites another: both show N UPDATES live; stepping shows
   "+ body" with the added text and "~ title"; selecting the other clears its tab.
4. [x] Agent proposes "drop" on one card and "ack" on another; the bar says 2 proposals. Agent
   appends to the ack card: that proposal shows OUT OF DATE, Accept disabled; over HTTP a stale
   accept is refused. Accept all applies the drop only and names the skipped one.
5. [x] Reject a fresh proposal: it clears; the card's status is unchanged.
6. [x] Move a card to Later: "Awaiting". Agent parks it: HANDOVER opens the bundle.
7. [x] Agent replies to a note: the reply shows under it.
8. [x] A past version from the version dropdown: no tabs act, nothing is marked seen.
9. [x] Keyboard only through one of each; light and dark look.
10. [x] Add the tracker row for content-change proposals and proposals from read-only agents;
    record any bugs found and their fixes here.

## Implementation Notes

**Status**: Completed 2026-10-08, by the orchestrator, by hand.

Scratch project and server (port 4801, stopped by PID) in the session scratchpad; a throwaway stdio
MCP caller (`vcall.mjs`, one kept agent) and an HTTP person caller (`pact.mjs`); the page in the
browser pane at 1024x768, dark then light.

- Steps 1-3: a 4-item board; comments on 1 and 2 and Send; the agent `append`ed to 1 (v2), redrew 2
  (v2) and replied to note 10. Both cards showed "1 UPDATE" live and the reply showed under the
  note. Stepping card 1 showed "v2 · 8 Oct, 14:44 · Verify agent", "+ body" and the added text,
  then "You're up to date" and the tab went; the card below moved down after the transition.
  Selecting card 2 wrote `seen {n: 2, ver: 2}` and its tab went.
- Step 4: proposals on 1 (drop) and 3 (ack), then an append on 3. The bar read "2 proposals from the
  agent · 1 out of date" with "Accept all (1)". Over HTTP an accept of the stale one was refused 422,
  "proposal: 3 changed after this was proposed; ask the agent to look again". Accept all listed the
  drop on 1 and, under "Not included", 3 with its reason; Apply dropped 1 ("Accepted 1 proposal").
- Step 5: card 3's box showed OUT OF DATE, the reason line and a disabled Accept, with OUT OF DATE
  and 1 UPDATE side by side; Reject wrote `reject {n: 3, proposal: 19}`, the bar went, the card
  stayed Open (and the reject counted as seeing it).
- Step 6: `later` on 4 showed "Awaiting"; the agent's park turned it into "Saved for later" with a
  HANDOVER tab; the box showed the four sections and the sources list, panned into view.
- Step 7: covered in step 3.
- Step 8: in v21 no tabs, no bar; selecting a card wrote nothing (ledger stayed at 28 lines).
- Step 9: keyboard: focus on a proposal tab, Enter opens the box with focus in it, Esc closes it and
  focus returns to the tab. Light theme looked right.
- Step 10: tracker N26 (other proposals) and N27 added.

**Bugs found**
1. Fixed: the stepper showed the added text as raw Markdown (`**declined**`). `stepMarkup`
   (`node-template.ts`) now renders each line with `renderMarkdown`; `.vb-step-line .vb-md-p` keeps
   the small size (`node-steps.css`). Failing test first: `node-updates.test.ts` "what the text
   gained reads as Markdown".
2. Not fixed, tracker N27: the floating selection bar (stage layer) draws over an open card box. A
   card's z-index can't lift it, since the bar sits above the whole world.
3. Noted, not changed: a refused act's top-level `detail` is the generic "does not fit the ledger";
   the plain reason is in `errors[0]`.

**Gates after the fix (all exit 0):** `npm test`, `npm run check`, `npm run verify` (0 warnings),
`npm run gen -- --check`, `npm run test:pages` (223 passed).
