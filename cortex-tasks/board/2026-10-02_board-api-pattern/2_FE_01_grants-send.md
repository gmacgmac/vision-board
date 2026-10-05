# 2_FE_01_grants-send: The person's side of agent access, and Send

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md) (step 2) ·
> **Decisions**: D-018, D-024, D-027 · **Contract**: `docs/specification/api.md` points 16,
> 20, 23-26 · **Model**: Opus 5.5

## Objective

On the board, the person sees each agent's request for a container and allows or refuses it with
one click, sees who holds each container, can remove an agent's access, and has a Send button
that tells the agents "I'm done, over to you". All through the existing act path.

## Context

- Repo `/Users/dev/Dropbox (Personal)/Developer/web-apps/vision-board`, branch `board-v3`; Node
  22.23.1 via nvm. Done: the API with grants, `send`, the person cookie (2_BE_05); `get_board`;
  `show_container` gives a container's holders. The page talks to the server only through
  `apps/board/src/board/io.ts` (over `packages/client`).
- Read first: `docs/specification/components.md` (the element pattern, Feature flags, Node size),
  `apps/board/src/board/*` (controller, render, io, size), `packages/ui/src/region/*`,
  `packages/actions/src/registry.ts` (labels for grant, deny, revoke, send),
  `prototypes/board-v3-design/README.md` and mockup 05 (the container frame and its top line),
  `tests/pages/*`. The look is D-024; tokens only; every state of rule 4.
- This is a first, plain version for the maintainer to judge in the morning; keep it quiet and
  consistent with the existing header and frames rather than inventing a new visual language.

## Steps

1. **Data**: `get_board` already carries what the page draws; if it lacks open grant requests
   (with agent label, container, reason, `seq`) or each region's holders (agent labels), add them
   to the fold read in `packages/actions/src/reads.ts`, the `get-board-response` schema and
   `openapi.json` (schema, then spec, then code; run `npm run gen`), keeping the drift tests green.
2. **Send**: a "Send to agent" button in the board header, using the accent button style. States:
   idle, hover, focus, pressed, sending (disabled with a small spinner), sent (a brief "Sent"
   confirmation), error (the problem's detail). Sends `act` `send` with the board.
3. **Requests**: when any request is open, a compact strip under the header lists each one:
   "<agent label> asks to write in <container title>" and the reason, with Allow and Refuse.
   Refuse opens a one-line optional note field. Allow sends `grant { request }`; Refuse sends
   `deny { request, text? }`. The strip disappears when no request is open. Keyboard reachable,
   labelled, `role="region"` with a heading; live-region announcement when a new request arrives.
4. **Holders**: each container frame's top line shows its holders' labels in the muted label style
   after the count (for example "· Pricing chat"); hovering or focusing a label shows "Remove
   access", which sends `revoke { holder, board, region }` after a confirm step (needs
   confirmation, rule 8). The creator has no remove control.
5. Behind the `agentAccess` feature flag, default on (`FLAGS` in `packages/format/src/flags.ts`).
6. Gallery: a section showing the strip with two requests, a refusing note open, a frame with two
   holders, and the Send button in each state, dark and light.

## Tests (write them first)

Page tests against a fixture ledger that has a joined agent, an open request and a granted holder:
Allow removes the request and adds the holder; Refuse with a note; Remove access with its confirm;
Send records a `send` act (read back through `read_ledger`); keyboard-only path for each; axe on
the board and the new gallery section; screenshots for the new gallery section, looked at before
they are stored; existing screenshots unchanged.

## Done when

- `npm test`, `npm run check`, `npm run verify`, `npm run test:pages` all exit 0 (read the exit
  status).
- Report: files changed, screenshots looked at (paths), every existing test changed and why, and
  any design choice you made that the maintainer should look at. Do not commit. Do not edit
  `docs/decisions.md`, steering, `AGENTS.md`, `CLAUDE.md`, `docs/principles.md` or
  `packages/tokens`. Files over 50 lines: create with the first section, then append in chunks.
