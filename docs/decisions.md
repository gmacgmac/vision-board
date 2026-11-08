---
category: project-decisions
last_updated: 2026-10-04
status: active
scope: The decision register for Vision Board — one entry per decision, appended in order
keywords: [decisions, register, adr, governance]
---

# Decision register

**How to read it.** One entry per decision, oldest first. *Accepted* entries are binding: when
code disagrees with one, the code is wrong. *Proposed* entries are open for review. Don't read
the whole file: list the entries with `grep "^## D-" docs/decisions.md`, then read the ones that
apply. The reasoning behind the rules is in [principles.md](principles.md).

**How to add to it.** Plan the decision as a Cortex task first. Then append the next number at
the end, without rewriting the file: date, status, the decision, why, the main alternative
rejected, and the task link. Never edit an Accepted entry; append a new one and mark the old one
`Superseded by D-NNN`. The work log (`cortex/LOG.md`) is not a decision record: it is pruned.

---

## D-001 Plan before you build
- **Date**: 2026-09-30 · **Status**: Accepted 2026-10-01 · **From**: Studio D-008
- **Decision**: All work beyond a trivial fix starts as a plan and goes through a Cortex task.
  Decisions are recorded here, not in `cortex/LOG.md`.
- **Why**: The plan keeps the thinking, the task keeps what was done, so the project stays
  traceable. The log is pruned, so it cannot hold decisions.
- **Alternative rejected**: Unplanned coding with decisions left in chat history.
- **Task**: none yet (founding set).

## D-002 Protected project instructions
- **Date**: 2026-09-30 · **Status**: Accepted 2026-10-01 · **From**: Studio D-007
- **Decision**: `.kiro/steering/vision-board-proj.md` is the one set of project rules; Kiro loads
  it, `CLAUDE.md` imports it, `AGENTS.md` points to it. It, `docs/principles.md`, this register
  and the design tokens change only with the maintainer's yes (GitHub `CODEOWNERS` once hosted).
- **Why**: Every person and agent follows the same rules, and no agent quietly rewrites them.
- **Alternative rejected**: Separate rule files per agent tool, which drift apart.
- **Task**: none yet (founding set).

## D-003 One action layer
- **Date**: 2026-09-30 · **Status**: Accepted 2026-10-01 · **From**: Studio D-003
- **Decision**: Every board action is a typed action with inputs, a needs-human flag and a
  transcript record. Buttons, shortcuts and agents call the same actions; decisions on items
  are the person's.
- **Why**: One path means one place to check who may act and one complete record.
- **Alternative rejected**: Buttons writing files directly and a separate agent tool surface.
- **Task**: none yet (founding set).

## D-004 The file formats are the contract
- **Date**: 2026-09-30 · **Status**: Accepted 2026-10-01 · **From**: Studio D-004, D-005 (adapted)
- **Decision**: The view file and transcript have versioned JSON Schemas in `packages/format/`;
  types, validator, fixtures and docs come from them. Fixture boards in the exact schema drive the
  gallery and tests.
- **Why**: The agent and the board agree on one machine-checked shape, and a fixture board and a
  live session run the same code.
- **Alternative rejected**: A loosely described format checked only by the UI.
- **Task**: none yet (founding set).

## D-005 Components: core, template, element, page
- **Date**: 2026-09-30 · **Status**: Accepted 2026-10-01 (refined by D-015) · **From**: Studio D-002, D-009 draft
- **Decision**: Each pattern has a framework-free core, one template for live and server render,
  and a plain web component; the framework only arranges pages. Anything shared is a web component.
- **Why**: Keeps the framework replaceable and makes patterns shareable with Studio. Studio's
  spike measured plain elements at 2.4 KB gzip against 16.9 KB (Svelte-compiled) and 29.7 KB
  (Vue-compiled).
- **Alternative rejected**: Framework-only components, unusable outside this app.
- **Task**: none yet (founding set).

## D-006 Generated pattern index
- **Date**: 2026-09-30 · **Status**: Accepted 2026-10-01 · **From**: Studio D-006
- **Decision**: The pattern index, with states, is generated from each pattern's `pattern.json`,
  never written by hand.
- **Why**: A generated index is always true, so duplicated components get caught.
- **Alternative rejected**: A hand-maintained catalogue, which drifts.
- **Task**: none yet (founding set).

## D-007 Dependency policy
- **Date**: 2026-09-30 · **Status**: Accepted 2026-10-01 · **From**: Studio D-010 draft
- **Decision**: Build small things ourselves. Exact versions, install scripts off, every
  dependency in `docs/specification/dependencies.md`. npm workspaces. No lint framework: our own
  checks in `scripts/verify.mjs` plus Prettier; Node's built-in test runner.
- **Why**: Every package is code we run and review for years.
- **Alternative rejected**: ESLint, Vitest and pnpm: more to review for work our scripts do.
- **Task**: none yet (founding set).

## D-008 Two contrast gates
- **Date**: 2026-09-30 · **Status**: Superseded by D-009 · **From**: Studio D-011 draft
- **Decision**: Every token pair passes WCAG 2 AA (text 4.5:1, UI 3:1) and APCA (text Lc 60, UI
  Lc 30) in light and dark; colours are `light-dark()` values. Needs Chrome/Edge 123, Firefox 120,
  Safari 17.5 or later.
- **Why**: APCA catches text that passes WCAG 2 yet reads poorly on dark.
- **Alternative rejected**: WCAG 2 alone.
- **Task**: none yet (founding set).

## D-009 APCA contrast in three tiers
- **Date**: 2026-10-01 · **Status**: Accepted · **From**: maintainer ruling, 2026-10-01 (shared with sibling apps)
- **Decision**: Text contrast is APCA only, in three tiers, light and dark, measured with APCA-W3
  0.0.98G-4g: Lc 60 or more for reading text (body, muted, white on a button fill); Lc 45 or more
  for short coloured labels (links, headings, status words, inline code); Lc 30 or more for
  decoration (icons, focus rings, connectors). Body text (`--text`) carries no hue in any palette.
  A pair under its bar is reported, never shipped quietly. The maintainer may overrule a tier by
  eye; each overrule is recorded as a new decision. Supersedes D-008.
- **Why**: One Lc 60 bar for every pair proved too strict for short coloured labels in sibling
  apps, and WCAG 2 contrast passes saturated colours on dark that still read poorly.
- **Alternative rejected**: D-008, WCAG 2 AA plus a single APCA bar.
- **Task**: none (maintainer ruling in chat).

## D-010 The board talks to the agent through kiro-cli
- **Date**: 2026-10-01 · **Status**: Superseded by D-036 · **From**: maintainer, first-look v2 item 25
- **Decision**: The board has one chat, in a panel on the right, powered by kiro-cli (`kiro-cli
  acp`) running on the maintainer's subscription. The agent updates the board through a tool call
  that writes a validated view. Its final text appears in the chat. The person's notes enter the
  chat input as chips that refer to nodes, and Send hands the round back. The board-launched agent
  gets the narrowest tool set that can write views. `vb wait` stays as the path for an agent
  already running in another session.
- **Why**: One conversation flows on the right while answers happen in context on the board. No
  copy-paste and no "go read it" step. Architect proved the shape with its side panel.
- **Alternative rejected**: the agent in the person's own chat session as the only driver, with
  the person pasting replies (vision.md v1, "Dropped: the app running Claude itself").
- **Task**: [[cortex-tasks/board/2026-10-01_board-v3/PLAN.md]]

## D-011 Containers are threads
- **Date**: 2026-10-01 · **Status**: Accepted · **From**: maintainer, first-look v2 items 20, 21
- **Decision**: Every node lives in a container (region), and a container is a thread of the
  conversation. The person can drag a container to move it, and drag items from one container to
  another, for example into the built-in Later container. Both moves are transcript records, so
  the agent's view still holds no coordinates. There is no freeform mode for now.
- **Why**: Containers give multi-threading and parking for free, and keep layout per container.
- **Alternative rejected**: a freeform mode with loose cards and no containers.
- **Task**: [[cortex-tasks/board/2026-10-01_board-v3/PLAN.md]]

## D-012 Plain Svelte for the app, SvelteKit later if needed
- **Date**: 2026-10-01 · **Status**: Accepted · **From**: maintainer, framework interview
- **Decision**: The board app is Svelte 5 built with Vite. No SvelteKit: our own Node server
  keeps serving the board's data and the kiro-cli connection. Add SvelteKit if a hosted version
  needs its routing, server routes or deployment adapters. The agent connection sits behind one
  module, so hosting it elsewhere swaps that module and nothing else.
- **Why**: Everything runs client-side plus one local server today, and Svelte components move
  into SvelteKit unchanged. Svelte matches Uplynk Studio.
- **Alternative rejected**: SvelteKit now, which brings routing and a server layer we don't use yet.
- **Task**: [[cortex-tasks/board/2026-10-01_board-v3/PLAN.md]]

## D-013 Our own canvas and layout engine, no node-graph library
- **Date**: 2026-10-01 · **Status**: Accepted · **From**: maintainer, framework interview
- **Decision**: We keep the hand-rolled canvas and layout engine and use no node-graph library
  (React Flow, Svelte Flow). A node type declares its outline (any shape: card, trapezoid,
  chevron, circle) and its ports (any number, on any side). The engine routes connectors to those
  ports and clips each line to the outline, and draws them in a layer beneath the nodes. Links stay
  a separate list in the view, because one link belongs to two nodes.
- **Why**: Full control of shapes, ports and layering with no framework to work around. The
  layout engine is the product's core. MIT-licensed libraries may still be read for techniques,
  with credit, but not copied wholesale.
- **Alternative rejected**: Svelte Flow (xyflow, MIT). It's capable, but the maintainer found
  its component model, port rules and layering confining in past projects.
- **Task**: [[cortex-tasks/board/2026-10-01_board-v3/PLAN.md]]

## D-014 First dependencies
- **Date**: 2026-10-01 · **Status**: Accepted · **From**: maintainer, framework interview
- **Decision**: svelte 5.57.1, vite 8.3.1, @sveltejs/vite-plugin-svelte 7.3.1, typescript 6.0.3,
  svelte-check 4.7.6. These are Uplynk Studio's exact versions. TypeScript stays on 6 because
  svelte-check 4.7.6 supports only 5 and 6. Exact pins, install scripts off, and each package is
  recorded in `docs/specification/dependencies.md` when it is installed. Browser page tests
  (Playwright, axe-core) need their own decision.
- **Why**: The smallest set for D-012. Same versions as Studio, so patterns move without
  friction.
- **Alternative rejected**: TypeScript 7.0.2, which svelte-check doesn't support yet.
- **Task**: [[cortex-tasks/board/2026-10-01_board-v3/PLAN.md]]

## D-015 One wrapper per pattern, driven by type definitions
- **Date**: 2026-10-01 · **Status**: Accepted · **From**: maintainer, framework interview
- **Decision**: Refines D-005, which follows Uplynk Studio's component model (framework-free core,
  template, plain web component; Svelte only arranges the app). Each pattern has one generic
  element: `<vb-node>`, `<vb-link>`, `<vb-region>`. A node type is a definition in one registry
  (outline, ports, fields, actions, state tokens), and the element renders whichever type it is
  given. A new type adds a definition, not a new element. A type that needs unusual content
  supplies only a body template.
- **Why**: An agent learns three patterns once. The same elements work in Studio, the Uplynk
  architecture repo or any framework.
- **Alternative rejected**: Svelte components draw the nodes (Option B), which would tie every
  shared pattern to Svelte.
- **Task**: [[cortex-tasks/board/2026-10-01_board-v3/PLAN.md]]

## D-016 Module layers, front doors and new folders
- **Date**: 2026-10-01 · **Status**: Accepted · **From**: maintainer, foundation review (tracker U2)
- **Decision**: Dependencies point one way. `format` and `tokens` depend on nothing; `actions`
  and `layout` on `format`; `ui` on `format`, `actions` and `tokens`; `agent` on `format` and
  `actions`; `cli` on `format`, `actions` and `agent`. Apps may use any package, and nothing
  imports an app. A cross-module import goes only through the target's front door
  (`packages/<name>/src/index.ts`). `scripts/verify.mjs` enforces this (`LAYERS`), along with
  file length, exact versions and the dependency register, and generates
  `docs/specification/modules.md` from the real imports. New folders: `packages/agent/` (the
  kiro-cli connection behind one interface, D-010/D-012), `packages/cli/` (the `vb` command),
  `skills/` (agent instructions handed to other sessions, rule 17) and `scripts/` (repo checks).
- **Why**: The structure stays true as more agents work in the repo, and anyone can see what
  depends on what without reading code. One module per swap point keeps hosting and framework
  changes local.
- **Alternative rejected**: Conventions only, with no check. They drift as soon as an agent
  takes a shortcut.
- **Task**: [[cortex-tasks/project/2026-10-01_project-tooling_foundation.md]]

## D-017 Project ledger and node identity
- **Date**: 2026-10-02 · **Status**: Accepted · **From**: maintainer, node ledger design (tracker U3)
- **Decision**: Node numbers are assigned by the server, per project, once, and never reused. A
  project is any folder holding a `.visionboard/` data folder; git is not required. The
  container is a property of the node, never part of its ID. History is an append-only JSON
  Lines ledger, one readable event per line, written only through the single I/O layer, with
  current state folded from it on load and writes applied one at a time by the server.
- **Why**: "47" must mean one thing across chats, compactions and agents, and the record must
  stay readable and diffable.
- **Alternative rejected**: Container-prefixed IDs (they change on every move); per-board
  numbers (renumbering later would repoint old references); SQLite now (not readable or
  diffable; stays a swap behind the I/O layer).
- **Task**: [[cortex-tasks/board/2026-10-02_board-node-ledger/PLAN.md]]

## D-018 Versions, lifecycle, proposals and seen
- **Date**: 2026-10-02 · **Status**: Accepted · **From**: maintainer, node ledger design (tracker U3)
- **Decision**: Every agent update to a node is a new version. Only a person's click closes an
  item (acknowledged, dropped, decided); commented, needs context and parked mean the agent
  owes a response. Agents propose changes, and the person accepts all, rejects all or decides
  node by node; a proposal made against an older version cannot be accepted. A node shows its
  unseen versions until the person steps through them. Seen is tracked per person, with one
  person for now, and the agent is not told about people when there is only one.
- **Why**: Keeps rule 8 while letting the agent do the legwork, and the agent never assumes a
  change was read.
- **Alternative rejected**: Letting a chat instruction close items directly (an agent deciding
  for the person).
- **Task**: [[cortex-tasks/board/2026-10-02_board-node-ledger/PLAN.md]]

## D-019 One board API
- **Date**: 2026-10-02 · **Status**: Accepted · **From**: maintainer, node ledger design (tracker U3)
- **Decision**: HTTP on the local server, an MCP server and the `vb` command are three doors to
  one API (`check`, `write`, `show N [--linked]`, `open`, `propose`, `park`). Writes are per
  node and streamable; each node is answered on its own, nodes appear on the board as they pass
  validation, and every write ends with the pending items the agent has not answered. It
  informs, it never fails the write. Every call names its agent. The agent-facing surface stays
  minimal: optional fields are omitted when they do not apply, so the agent carries no
  configuration it does not need.
- **Why**: Any agent, any tool, many agents at once, with feedback instead of silent file edits,
  at the smallest context cost.
- **Alternative rejected**: Agents hand-editing JSON files; all-or-nothing writes.
- **Task**: [[cortex-tasks/board/2026-10-02_board-node-ledger/PLAN.md]]

## D-020 Parking bundles and branching
- **Date**: 2026-10-02 · **Status**: Accepted · **From**: maintainer, node ledger design (tracker U3)
- **Decision**: Parking an item obliges the agent to write a handover bundle (situation,
  background, assessment, recommendation, sources); the item stays pending until it is written.
  Branching from an item starts a new board or chat carrying only that item's bundle and its
  linked items' bundles.
- **Why**: Context survives a week and a new chat without forking a whole conversation.
- **Alternative rejected**: Forking the full conversation.
- **Task**: [[cortex-tasks/board/2026-10-02_board-node-ledger/PLAN.md]]

## D-021 Decision flow layout mode
- **Date**: 2026-10-02 · **Status**: Accepted · **From**: maintainer, node ledger design (tracker U3)
- **Decision**: A layout mode that draws one item's ledger history as a timeline: the request,
  key points, each version, the person's decision with its time, the work done and short notes.
  It reads the ledger and ships behind a feature flag (rule 12).
- **Why**: A lasting, readable record of how a decision was reached.
- **Alternative rejected**: Reconstructing decisions from chat history.
- **Task**: [[cortex-tasks/board/2026-10-02_board-node-ledger/PLAN.md]]

## D-022 JSON Schema validation with ajv; the API contract lives in packages/format
- **Date**: 2026-10-02 · **Status**: Superseded by D-026 · **From**: maintainer, API pattern (tracker U4)
- **Decision**: Formats and the API are defined as JSON Schema 2020-12 and OpenAPI 3.1 in
  `packages/format/schema/`. They are checked with `ajv` (pinned exact, MIT), used only in tests and
  in the I/O layer's validator. Routes, MCP tools, `vb` commands and the API docs are generated
  from or tested against the spec (rule 6, `docs/specification/api.md`).
- **Why**: One source for every contract, and drift fails a test. A full schema validator is
  exactly where a homemade one hides bugs.
- **Alternative rejected**: Our own validator for the whole standard; a separate `packages/api`
  (the spec is a contract, and contracts live in `packages/format`).
- **Task**: [[cortex-tasks/board/2026-10-02_board-api-pattern/PLAN.md]]

## D-023 Our own Markdown renderer, a fixed subset
- **Date**: 2026-10-02 · **Status**: Accepted · **From**: maintainer, card design (01b)
- **Decision**: Node bodies, notes, replies and parking bundles are Markdown. One renderer of our
  own, in `packages/ui`, supports paragraphs, bold, italic, strikethrough, inline code, links,
  bulleted and numbered lists, `###` subheaders (drawn as small labels), `>` quotes (drawn as the
  embedded callout) and short code blocks. Anything else renders as plain text; raw HTML is always
  escaped. Its tests use the CommonMark specification's examples for every construct it supports.
- **Why**: We own every line and render the same everywhere; the standard's examples give us its
  accuracy without its code.
- **Alternative rejected**: `markdown-it` as a dependency, or a fork of it (about 5,000 lines and a
  plugin system to cut down, with no upstream fixes once forked).
- **Task**: [[cortex-tasks/board/2026-10-01_board-v3/PLAN.md]]

## D-024 Architect's look is the board's look
- **Date**: 2026-10-02 · **Status**: Accepted · **From**: maintainer, mockup 01b
- **Decision**: The board takes Uplynk Architect's palette and card recipe
  (`prototypes/board-v3-design/architect-extract/`): dark-first ground with a dot grid, family-tinted cards, pink accent.
  Cards have no icon tile and grow to fit their content; the number, kind (also the drag handle),
  note pin and NEW or CHANGED sit in gaps on the card border; the kind icon, state and quick
  actions sit in a footer. Selection is the card's own colour at full strength. Containers are open
  frames in their own colour with the label in the top line. Kinds map to Architect families:
  question blue, finding teal, decision pink, risk orange, action amber, topic violet. Every colour
  still passes its APCA tier (D-009) before it ships; fonts stay system fonts until a
  self-hosting decision (rule 18).
- **Why**: The maintainer judged it by eye against Architect; it puts the space into content.
- **Alternative rejected**: The previous pastel tokens with a blue accent; icon tiles in card heads.
- **Task**: [[cortex-tasks/board/2026-10-01_board-v3/PLAN.md]]

## D-025 Page tests with Playwright and axe-core
- **Date**: 2026-10-04 · **Status**: Accepted · **From**: maintainer (tracker N3)
- **Decision**: Page tests (rule 13) run in Playwright through `@playwright/test` 1.63.0, with
  `axe-core` 4.13.0 injected into each page for accessibility checks, the same pair and versions
  as Uplynk Studio. They run as `npm run test:pages`, separate from `npm test`, against a board
  served from a fixture ledger. Exact pins, install scripts off, both in the dependency register.
- **Why**: A unit test can't see a console error, a failed request, an accessibility violation or
  a visual change; matching Studio keeps patterns shareable.
- **Alternative rejected**: A DOM emulator (jsdom, happy-dom) in `npm test`: it has no layout, so
  it can't check placement, contrast or screenshots.
- **Task**: [[cortex-tasks/board/2026-10-01_board-v3/2a_FE_03_page-tests.md]]

## D-026 OpenAPI 3.2 for the API contract (replaces D-022)
- **Date**: 2026-10-04 · **Status**: Superseded by D-031 · **From**: maintainer, U4 step 1 research
- **Decision**: As D-022, with OpenAPI 3.2 in place of 3.1. Formats and the API are defined as
  JSON Schema 2020-12 and OpenAPI 3.2 in `packages/format/schema/`, checked with `ajv` (pinned
  exact, MIT), used only in tests and in the I/O layer's validator. Routes, MCP tools, `vb`
  commands and the API docs are generated from or tested against the spec (rule 6,
  `docs/specification/api.md`).
- **Why**: 3.2 is the first version that describes streamed responses, one result per line, which
  batch writes and change feeds need. It has been out a year and had its first patch release.
- **Alternative rejected**: Staying on 3.1 because a TypeScript type generator can't read 3.2 yet;
  our types are hand-written and tested against the schemas, so nothing here depends on one.
- **Task**: [[cortex-tasks/board/2026-10-02_board-api-pattern/PLAN.md]]

## D-027 Agent identity and write grants
- **Date**: 2026-10-05 · **Status**: Accepted · **From**: maintainer (chat 549-553, 557), U4 contract
- **Decision**: Any agent can read any board. To write, an agent joins and gets its own id and
  secret, and sends the secret on every write. Each write names its container (a region, D-011).
  The agent that creates a container holds it; any other agent must ask, and only the person's
  approval on the board grants it. Grants, requests and revocations are ledger events, folded like
  everything else; the server keeps only a hash of each secret. The board page writes as the person
  with a token only the page receives, so an agent cannot act as the person by mistake (rule 8).
  The rules are in `docs/specification/api.md` § Callers.
- **Why**: Every write is attributable to one agent and can be refused or revoked per agent and
  per container. MCP 2026-07-28 has no sessions, so identity has to travel with each call.
- **Alternative rejected**: One shared secret per container (writes from its holders look alike,
  and revoking one agent means changing the secret for all); trusting the MCP client's own
  approval prompt or `clientInfo` (self-reported, and absent in some clients).
- **Task**: [[cortex-tasks/board/2026-10-02_board-api-pattern/PLAN.md]]

## D-028 Our own MCP server, no SDK
- **Date**: 2026-10-05 · **Status**: Accepted · **From**: maintainer (chat 558), U4 contract
- **Decision**: `packages/mcp` is our own small stdio MCP server, calling the board's HTTP API
  through `packages/client` (D-029). It speaks MCP 2026-07-28 and answers the legacy `initialize` handshake for older clients.
  Its tools are generated from the `x-agent` operations in `openapi.json` by our own script.
- **Why**: The stateless 2026-07-28 protocol needs only a handful of methods over JSON-RPC, and we
  already validate with `ajv` (D-026). The official SDK would add `zod` and two packages for that.
- **Alternative rejected**: `@modelcontextprotocol/server` 2.x (kept as the fallback if the
  protocol work proves larger than expected); third-party OpenAPI-to-MCP generators (they mirror
  the whole API, which agent-tool guidance advises against).
- **Task**: [[cortex-tasks/board/2026-10-02_board-api-pattern/PLAN.md]]

## D-029 `packages/client` and `packages/mcp`
- **Date**: 2026-10-05 · **Status**: Accepted · **From**: maintainer (chat 557), U4 contract review
- **Decision**: Two new packages, adding to D-016. `packages/client` is the one module that calls
  the board server (rule 7), used by the board page, `vb` and the MCP server; it reads a route
  table generated from `openapi.json`. Layers: `format`. `packages/mcp` is the MCP server
  (D-028). Layers: `format`, `client`. `cli` gains `client`.
- **Why**: Three callers of one API share one caller module instead of three. `packages/agent`
  already has a job (the kiro-cli connection, D-016), and one package per swap point keeps it.
- **Alternative rejected**: The MCP server inside `packages/agent` (two jobs in one package);
  separate HTTP code in the page, `vb` and MCP (three copies of the same calls).
- **Task**: [[cortex-tasks/board/2026-10-02_board-api-pattern/PLAN.md]]

## D-030 Three card widths, picked by content or by hand
- **Date**: 2026-10-05 · **Status**: Accepted · **From**: maintainer (chat 489, 559; U7), mockup 07 option A
- **Decision**: Cards come in three widths, `s`, `m` and `l` (280, 360 and 464px, as tokens).
  Layout picks one from the body's length, code blocks and list length. The agent may suggest
  one, and the person's pick, made from a small control in the card's top-right corner, wins
  and is recorded as a `size` act. The rules are in `docs/specification/components.md` § Node size.
- **Why**: Long cards in a narrow fixed width are uncomfortable to read; three set widths keep
  boards tidy and the same board always draws the same way.
- **Alternative rejected**: Free resizing by dragging (a width in the ledger, and every card a
  different size); one fixed width.
- **Task**: [[cortex-tasks/board/2026-10-01_board-v3/PLAN.md]]

## D-031 OpenAPI 3.2, restated without streamed writes (replaces D-026)
- **Date**: 2026-10-05 · **Status**: Accepted · **From**: maintainer (chat 647, 661)
- **Decision**: D-026's decision stands unchanged. Only its reason is corrected: writes answer
  once per batch, with a result per item, and are never streamed (`docs/specification/api.md` 44).
- **Why**: 3.2 is the first version that describes streamed responses, which the ledger read
  (JSON Lines) and the live-update stream (`watch_board`, server-sent events) need. The contract
  review cut streamed write replies: a stream can't keep "a bad request writes nothing", has no
  place for the batch summary, and neither MCP nor `vb` could show it line by line.
- **Alternative rejected**: Leaving D-026's reason as written, which names streamed batch writes.
- **Task**: [[cortex-tasks/board/2026-10-02_board-api-pattern/PLAN.md]]

## D-032 Connectors behind see-through cards; settings for the grid and blur
- **Date**: 2026-10-06 · **Status**: Accepted · **From**: maintainer (board items 31, 50; chat)
- **Decision**: Connectors draw behind container frames and cards. Cards are 30% see-through
  (`--vb-card-fill`, 70% opaque; 40% and 25% were tried first), so a connector behind a card shows faintly; the focused card's
  connectors draw above the cards. The dot grid may show through cards. Board settings (tracker
  N9) get two switches: hide the dot grid, and a very light blur behind cards for readability
  (off by default). Behind the `wireLayers` flag, on by default.
- **Why**: Lines drawn over cards cut through the text, and lines hidden under solid cards lose
  how cards connect. Subtle see-through keeps both readable.
- **Alternative rejected**: A canvas-coloured plate under each card to hide the dots
  (`wirePlates`, tried 2026-10-06); blur on by default, which costs drawing time on large boards
  (rule 15).
- **Task**: [[cortex-tasks/board/2026-10-06_board-ui_wire-layers.md]] (written once the work lands)

## D-033 Awareness tables: references, permissions, conditions
- **Date**: 2026-10-07 · **Status**: Accepted · **From**: maintainer (chat 176-207), after nclite and Uplynk Studio
- **Decision**: What belongs to what, who may write what, and what needs attention are each one
  typed table in `packages/actions`, derived from the folded ledger and read alike by the server,
  the page and agents. A new kind without a row is a type error; every row has a test. A check
  needed in more than one place is a row, never a local check.
- **Why**: The same facts were worked out in several places and drifted.
- **Alternative rejected**: Leaving each check where it is used; nclite's stored notices table
  (the ledger is already the history).
- **Task**: [[cortex-tasks/board/2026-10-07_board-actions_awareness-tables/PLAN.md]]

## D-034 Board access, then container access (replaces D-027's open container creation)
- **Date**: 2026-10-07 · **Status**: Accepted · **From**: maintainer (chat 170C-171, 206, 208)
- **Decision**: An agent writes to a board only if it created the board or the person granted it.
  On such a board it creates and edits its own containers; another agent's container still needs
  that container's grant. Among agents, only a board's creator changes its title and summary; the
  person can rename any board. Grants attach to the agent's one secret.
- **Why**: A board is a topic; nothing on it can be deleted yet, so a stray write is permanent.
- **Alternative rejected**: Container grants only (any agent writes to any board).
- **Task**: [[cortex-tasks/board/2026-10-07_board-actions_awareness-tables/PLAN.md]]

## D-035 Short muted detail lines take the label bar
- **Date**: 2026-10-08 · **Status**: Accepted · **From**: maintainer, Stage 5 verify (266)
- **Decision**: A short line of supporting detail in muted text (a source and time, a count, an
  author beside a title) is measured at the label tier, APCA Lc 45 or more; longer muted text
  stays at Lc 60. `--vb-ink-subtle` stays as it is (dark Lc 48.8 on a card).
- **Why**: The maintainer judged it readable by eye in use.
- **Alternative rejected**: Raising the dark value to `#b6b6be` (Lc 61.9).
- **Task**: [[cortex-tasks/board/2026-10-08_board-app_stage5-follow-ups/PLAN.md]]

## D-036 The chat panel drives CLI agents through our own adapters (replaces D-010)
- **Date**: 2026-10-08 · **Status**: Accepted · **From**: maintainer (chat 279-313)
- **Decision**: The board's chat panel drives a CLI agent through one adapter interface in
  `packages/agent`, shaped after the Agent Client Protocol: Claude CLI first (one process per
  message, stream-json, session resume), then Kiro CLI (ACP), others later. The CLI keeps its own
  tools and settings; the board adds the vb MCP server and a pause before file edits and shell
  commands that asks the person, as nclite gates its tools. No adapter packages. The chat record
  is the CLI's own transcript, not the ledger.
- **Why**: A native chat beside the board with the agents the person already uses, in a shape
  that moves into nclite as a chat mode.
- **Alternative rejected**: kiro-cli only with the narrowest tool set (D-010); the Claude ACP
  adapter package (near-daily releases, bundles its own CLI).
- **Task**: [[cortex-tasks/board/2026-10-08_board-agent_chat-panel/PLAN.md]]

## D-037 `packages/chat`; the chat and agent packages stand alone
- **Date**: 2026-10-08 · **Status**: Accepted · **From**: maintainer (chat 313)
- **Decision**: A new package, `packages/chat`: the chat panel's framework-free core and plain web
  components, styled only through `--chat-*` custom properties that each host maps to its
  tokens. `packages/chat` and `packages/agent` import nothing from this repo (their D-016 layers
  become empty); the board app holds the bridge between chat and board.
- **Why**: The panel is built to become nclite's vision board chat mode.
- **Alternative rejected**: Building the panel inside `apps/board`, which would tie it to the
  board.
- **Task**: [[cortex-tasks/board/2026-10-08_board-agent_chat-panel/PLAN.md]]

## D-038 The open folder changes at run time; the recent list lives in home
- **Date**: 2026-10-10 · **Status**: Accepted · **From**: maintainer (chat 400A, 408A, 445)
- **Decision**: The board server opens one project folder at a time and can switch it in place
  (`open_project`, person only, folders under the home folder only, resolved with realpath, never
  home itself): the new folder's lock first, then chats stop, live streams end, the old lock goes.
  Recent folders are a per-person setting in `~/.visionboard/recent.json`; at start `VB_PROJECT`
  wins, then the last folder opened, then the repo.
- **Why**: The maintainer works across repos and should not restart the server with an env
  variable to change folder.
- **Alternative rejected**: One server per folder on its own port (several servers to start and
  track); a recent list inside a repo (it is personal, not the project's).
- **Task**: [[cortex-tasks/board/2026-10-09_board-app_open-folder.md]]

## D-039 Agents say which folder they work in
- **Date**: 2026-10-10 · **Status**: Accepted · **From**: maintainer (chat 435-436, 446)
- **Decision**: Every agent operation takes an optional `VB-Project` header (the agent's folder);
  the server refuses a call for another folder, and a secret known to a recent folder's agents,
  with `wrong-folder` (409) naming both folders, never "join again". The `vb` MCP and the `vb` CLI
  send the header (`VB_PROJECT`, else the nearest project at or above the working folder); `join`
  and `list_boards` name the open folder.
- **Why**: Once the board can switch folder (D-038), an agent left behind would join the new
  folder and draw its work there, or read another project's card 12 as its own.
- **Alternative rejected**: One agents file across folders (an identity would follow the person
  into every repo); refusing only writes (reads would still mislead).
- **Task**: [[cortex-tasks/board/2026-10-10_board-security_folder-mismatch.md]]

## D-040 The kind decides what needs an answer; every node is numbered
- **Date**: 2026-10-10 · **Status**: Accepted · **From**: maintainer (chat 416-455, 471)
- **Decision**: A card's kind decides whether it asks for an answer: `question`, `decision` and
  `action` offer acknowledge, drop, comment, more context and later, and are counted and owed until
  answered (✓, ✗ or a comment decides; more context keeps it open); every other kind offers
  comment, more context and later and never blocks. Every node shows its number. The node event's
  `item` mark is removed in ledger v11 (refused on new writes, ignored on older lines). This
  supersedes the part of D-017 that gave numbers only to items. The `everyNode` flag off can't
  restore the old look, since the old mark is gone; accepted, as no old boards need it.
- **Why**: The board is a threaded conversation: the person must be able to answer any card, and
  one rule by kind is simpler and more predictable for agents than a separate mark.
- **Alternative rejected**: The agent's `item` mark deciding (one more thing for the agent to get
  wrong); per-kind action lists (a finding couldn't be dropped or a topic commented).
- **Task**: [[cortex-tasks/board/2026-10-10_board-actions_every-node/PLAN.md]]

## D-041 Each board numbers its cards; the ledger number stays the identity
- **Date**: 2026-10-11 · **Status**: Accepted · **From**: maintainer (chat 511, 516, 519, 520, 524, 531; tracker N35)
- **Decision**: Each board numbers its cards from 1 in the order drawn (`n`), and every request,
  answer, MCP tool, `vb` command and the page name a card by its number on the operation's board.
  The project-wide ledger number, given once and never reused, stays the card's identity: `id` in
  code, `n` in the file (unchanged on every line), never shown and never in an agent's answer.
  Board numbers are worked out on read (ledger v12), so existing boards are renumbered; the server
  translates at its edge. A retired card keeps its number; no number is given twice on a board. No
  feature may remove card lines from the ledger, or board numbers would shift (a purge hides lines,
  never deletes them). Supersedes the numbering part of D-017 (numbers per project).
- **Why**: A board's first card should be 1 (field report, N35). D-017 rejected per-board numbers
  because renumbering would repoint references; here nothing that points at a card changes: every
  line, index and reference keeps the identity, a card never changes board, so (board, number) and
  identity map one to one for ever. Only numbers people wrote inside old notes can disagree
  (accepted).
- **Alternative rejected**: (board, number) as the identity everywhere (rewrites every index and
  rule for no gain); project numbers taught to the agent (the field report's complaint stands);
  writing `id` on new lines (the file would hold two names for one thing for ever).
- **Task**: [[cortex-tasks/board/2026-10-11_board-format_field-report-batch-2/PLAN.md]]

## D-042 Archived boards are hidden from agents as if they never existed
- **Date**: 2026-10-12 · **Status**: Accepted · **From**: maintainer (chat 608-621, 635, 640A; tracker N39)
- **Decision**: The person can archive a board and restore it (person acts in the ledger; agents can
  do neither). An archived board is gone for agents: `list_boards` leaves it out, and every agent
  operation naming it answers exactly as for a board that never existed. Its id stays taken (a write
  reusing it is refused with words that reveal nothing). It is hidden from the person's picker and
  never opened by default; "Archived (N)…" restores it. Nothing is removed from the ledger. One
  visibility check in the action layer decides, and a test walks every agent operation in the
  OpenAPI contract, so a new operation is covered or fails.
- **Why**: Similarly named boards confused agents told to "update the board"; the person needs a way
  to take a board out of play without breaking the append-only ledger (D-017, D-041).
- **Alternative rejected**: Deleting from the ledger (breaks D-041 and loses history); renaming (both
  boards stay visible to agents).
- **Task**: [[cortex-tasks/board/2026-10-12_board-app_archive-board.md]]

## D-043 A locked board is read-only for everyone until the person unlocks it
- **Date**: 2026-10-12 · **Status**: Accepted · **From**: maintainer (chat 622-626, 640B; tracker N40)
- **Decision**: The person can lock and unlock a board (person acts; agents can do neither). While
  locked, the board stays visible and readable (`locked: true` on reads), and nothing changes it:
  every agent write answers 423 `locked` ("This board is locked; ask the person to unlock it."), and
  the person's own changes pause, except the private flag. Archiving implies lock; restoring returns
  the lock state the board had. One write check in the action layer decides every line, and a test
  walks every agent write operation in the OpenAPI contract.
- **Why**: A settled board (a decided plan kept for reference) must not be changed by any agent,
  including the one that created it; grants alone can't stop the creator.
- **Alternative rejected**: Locking agents only (the person could leave a note the agent then owes
  but can't answer); relying on grants (the creating agent keeps writing).
- **Task**: [[cortex-tasks/board/2026-10-12_board-app_lock-board.md]]

## D-044 The person removes cards and containers with the same retire as an agent
- **Date**: 2026-10-12 · **Status**: Accepted · **From**: maintainer (chat 652, 653, 668; tracker N24)
- **Decision**: The person can remove a card, a selection of cards, or a container with its cards,
  after a short confirm. It is recorded as the same ledger `retire` line an agent writes, with
  `by: person`, through the one retire in the action layer. Removed cards leave the board and stay
  in the ledger with their versions and notes; their numbers are never reused. The person is warned,
  not refused, when a card is still owed an answer (agents keep their refusal); anything owed on it
  is no longer owed. A locked or archived board refuses it (D-042, D-043).
- **Why**: The person needs to clear cards the agent no longer will, without a second removal path
  or breaking the append-only ledger (D-017, D-041).
- **Alternative rejected**: A separate person-only delete (a second path that could drift from the
  agent's retire); refusing owed cards (the person would depend on the agent to tidy up).
- **Task**: [[cortex-tasks/board/2026-10-12_board-app_person-removes-cards.md]]

## D-045 ✓ and ✗ are tools, and only they answer a card
- **Date**: 2026-10-15 · **Status**: Accepted · **From**: maintainer (chat 18-53)
- **Decision**: On a card that asks, ✓ and ✗ are the only answers, and the board gives them no
  meaning: the card the agent wrote says what each one means. The board says "answered", never
  "decided". A note never answers a card, and the More context button is removed: a note can ask.
  The agent's answer to a note clears the card's earlier ✓ or ✗. Pressing a lit ✓ or ✗ again clears
  it. An agent reads each card's current answer, not every click; the ledger keeps every click.
  Supersedes the part of D-040 that let a comment decide and gave every card that asks a More
  context button.
- **Why**: notes that were questions closed decisions; ✗ read as "thrown away"; a ticked card stayed
  ticked after the agent changed what it asked; a finding read
  "Open" with nothing to do; an agent read a quick ✓ and clear as indecision.
- **Rejected**: treating a note that ends in "?" as More context, a guess the person can't see.
- **Task**: cortex-tasks/board/2026-10-15_board-actions_answer-model/PLAN.md

## D-046 A note puts a card with the agent; open means the person is needed
- **Date**: 2026-10-15 · **Status**: Accepted · **From**: maintainer (chat 130, 136)
- **Decision**: A card that asks is open (needs the person), with the agent (the person's latest note
  is owed an answer), answered (✓ or ✗) or later. A note moves it to the agent; the agent's answer
  moves it back to open. Only ✓ or ✗ answers it (D-045 unchanged).
- **Why**: a card the person had reacted to still counted as open, so "open" stopped meaning "needs
  you".
- **Rejected**: letting a note answer the card, which brought back questions closing cards (D-045).
- **Task**: cortex-tasks/board/2026-10-15_board-actions_with-agent-state.md

## D-047 App cards: agent-built apps in a sandboxed frame, hosted by the board
- **Date**: 2026-10-17 · **Status**: Accepted · **From**: maintainer (chat 223-232; go to plan and
  build without further review)
- **Decision**: A new card kind `app` shows an agent-built app inside the card. The app lives in the
  project's `.visionboard/apps/<id>/` (manifest, panel, optional tools module) and the agent owns it;
  the board owns the card, the host and the rules. The panel runs in a sandboxed frame with an opaque
  origin and its own strict CSP, talks to the board only by JSON-RPC messages in MCP Apps' shape, and
  calls the app's tools through the board's server, which runs each app's tools in its own
  permission-limited process with timeouts, limits and restarts. Tools run only after the person
  allows that version of the code. The app's own code may reach the network; the board itself makes
  no third-party call (rule 18).
- **Why**: the person and the agent design on the board; the agent can now build the thing and the
  person can use it in place, without giving agent code any reach into the board.
- **Rejected**: raw HTML in a card (D-023 stays: Markdown never renders HTML); a second proxy frame
  on another port (an opaque-origin sandbox gives the same isolation on one server); the board
  starting servers the agent wrote (the board hosts plugin modules instead).
- **Task**: cortex-tasks/board/2026-10-17_board-app_app-cards/PLAN.md

## D-048 Images in cards, from the project's images folder only
- **Date**: 2026-10-18 · **Status**: Accepted · **From**: maintainer (chat 239-243; go without
  further review)
- **Decision**: Our Markdown renders `![alt](path)` as one fixed image shape when `path` is a plain
  relative path under the project's `.visionboard/images/` (subfolders allowed); the board serves
  those files (png, jpeg, webp, gif; checked by type and content; size-capped) with an ETag, and the
  page checks for a newer version when a card is selected or an image is opened. A click opens the
  image animated to 70% of the screen on its longer side. Anything else stays text. This amends D-023
  for images only; raw HTML is still never rendered.
- **Why**: agents could not show a screenshot or a diagram on the card, so "which page is this?"
  questions went to the chat.
- **Rejected**: images from the internet (rule 18), data URIs in the body (unbounded size in the
  ledger), svg (it can carry script).
- **Task**: cortex-tasks/board/2026-10-17_board-app_app-cards/PLAN.md

## D-049 Board page weight budget: 200 KB gzip, counted at start
- **Date**: 2026-10-19 · **Status**: Accepted · **From**: maintainer (chat 2026-10-19, points 21A,
  23, 30)
- **Decision**: The board page's budget is 200 KB gzip (JS + CSS), up from 150 KB, counted on what
  the page loads at start (its static imports, `scripts/verify.mjs` `pageAssets`); code loaded on
  demand, such as the chat panel's drawing on first open, does not count.
- **Why**: the page had grown with features to the old limit with nothing bloated (Svelte is the
  only dependency); start weight is what makes the board slow to open.
- **Rejected**: keep 150 KB and cut features; count lazily loaded chunks (lazy loading could then
  never lower the number).
- **Task**: cortex-tasks/board/2026-10-19_board-ui_card-polish-and-history/PLAN.md

## D-050 App panels stay loaded and keep their state
- **Date**: 2026-10-19 · **Status**: Accepted · **From**: maintainer (chat 2026-10-19, points 40B,
  40C, 41)
- **Decision**: A loaded app panel stays loaded, frozen (inert, not painted) while its card is off
  screen or the board is zoomed out; at most 8 panels are live, the least recently used unloaded
  first (`app-cards.ts` `LIVE_PANELS`). A panel saves a small JSON state per card with the board's
  own request `vision-board/save-state` (`.visionboard/app-state/<identity>.json`, 64 KB cap,
  person-only, never in an agent read) and gets it back in `ui/initialize`'s host context under
  `"vision-board/state"`. Supersedes D-047 ruling 14 (frames removed off screen or zoomed out).
- **Why**: people working through a multi-step app lost their place on every zoom or pan; MCP Apps
  has no state mechanism yet (ext-apps lists it as future work), so the board adds its own under a
  name that cannot collide.
- **Rejected**: state in the ledger (append-only, read by agents, frequent writes); keeping every
  panel loaded with no cap (memory on a board of many apps).
- **Task**: cortex-tasks/board/2026-10-19_board-app_app-state-kept/PLAN.md

## D-051 Container tools on a rail down the frame's left edge; the title owns the top line
- **Date**: 2026-10-26 · **Status**: Accepted · **From**: maintainer (chats 2026-10-25 and 2026-10-26)
- **Decision**: A container's tools (layouts, Match card widths, Comment, settings) sit in a slim
  vertical rail across the frame's left border (`toolRail` flag), screen-sized at every zoom and
  collapsing on short frames. The top line holds only the label, centred, its title at
  `--vb-text-lg`. A tile in the layout popover applies its layout on click, through the same action
  as the rail's icon. Supersedes mockup 05's row on the top line.
- **Why**: on a narrow container the row took about 260px of the top line and cut the title to a few
  letters; the rail gives the title the whole line.
- **Rejected**: keeping the row and shrinking it further (the title still lost); widening the frame's
  left padding (moves every card on every board).
- **Task**: cortex-tasks/board/2026-10-25_board-ui_container-tool-rail.md,
  cortex-tasks/board/2026-10-26_board-ui_rail-polish.md

## D-052 The rail rests at half strength in both themes (contrast overruled by eye)
- **Date**: 2026-10-26 · **Status**: Accepted · **From**: maintainer (chat 2026-10-26, point 155)
- **Decision**: `--vb-rail-rest` is 0.5 in light and dark. In dark the rail's quiet icons rest at
  APCA Lc 16.9 on the canvas, under the Lc 30 decoration tier (rule 3); accepted by eye under D-009.
  Hover, focus, an open popover and touch screens show it at full strength; the Comment badge is never dimmed.
- **Why**: the rail should not call attention to itself; people hover it to use it.
- **Rejected**: 0.76 in dark (kept Lc 30 but read as fully visible); brightening the dark quiet ink (a
  token change felt across the board).
- **Task**: cortex-tasks/board/2026-10-26_board-ui_rail-polish.md

## D-053 The person's note: neutral, with the accent as a left edge only
- **Date**: 2026-10-26 · **Status**: Accepted · **From**: maintainer (chat 2026-10-26)
- **Decision**: "Your note" takes the agent reply's look: `--vb-surface-sunken` fill, `--vb-ink-strong`
  text, a quiet `--vb-ink-subtle` label. While it can be edited, a 3px `--vb-accent` rule runs down its
  left edge, feathering into the fill; once sent the rule is `--vb-line-strong` and the feather goes.
- **Why**: the pink fill, border and label together read muddy and loud; the note and the reply now
  read as one conversation.
- **Rejected**: a full pink border on a neutral fill; a lighter pink tint.
- **Task**: none (a direct styling change, `packages/ui/src/node/node.css` `.vb-node-note`)

## D-054 New and updated cards stay marked until engaged; containers show what they hold
- **Date**: 2026-10-26 · **Status**: Accepted · **From**: maintainer (chat 2026-10-25, points 73-90)
- **Decision**: NEW and "N updates" end only when the person selects or acts on the card (no clearing
  when a round starts), the same over MCP and the chat panel. "N updates" is pink-outlined at rest. A
  container holding a new or updated card gets a `--vb-state-fresh` (teal) border and a "N new · N
  updated" pill until any of its cards is engaged after the latest change (derived from the ledger,
  `container.fresh` in the condition registry; nothing stored). A toolbar "N new" list goes to each card.
- **Why**: on a large board new and changed cards could not be found.
- **Rejected**: a stored "container seen" (a format change); clearing on zoom (the highlight would
  vanish with cards still unseen); a pink container border.
- **Task**: cortex-tasks/board/2026-10-25_board-ui_new-and-updated.md

## D-055 A note on a group of cards is drawn once
- **Date**: 2026-10-26 · **Status**: Accepted · **From**: maintainer (chat 2026-10-26, point 103)
- **Decision**: A note on a selection (one ledger act with `nodes`) draws as one pin on its
  lowest-numbered card (`groupNoteOnce` flag); hovering, focusing or opening it rings each card of the
  group; it is never repeated on each card, and the agent's reply shows once, in its bubble.
- **Why**: the same note on every card read as copies and confused the replies.
- **Rejected**: a box round the group's extents (it covered unrelated cards, within and across containers).
- **Task**: cortex-tasks/board/2026-10-25_board-ui_group-note-once.md

## D-056 Agent tools stay lean: shapes live in the skill and in refusals
- **Date**: 2026-10-26 · **Status**: Accepted · **From**: maintainer (chat 2026-10-25, points 43-57)
- **Decision**: The MCP tool list carries no output schemas and no worked examples; descriptions are
  written for a model reader in the fewest words. Each write item form has a schema `examples` entry;
  a refused item or body comes back with the example for its type; the skill shows one worked
  example. A test caps the list's size (30,400 characters) and each tool's.
- **Why**: the list was 108,761 characters, 70% output schemas, paid in full by any client that loads
  tools up front; an agent that guesses a shape learns it from its first refusal.
- **Rejected**: examples in every tool description (cost on every load, and a 2,048-character cap).
- **Task**: cortex-tasks/board/2026-10-25_board-agent_tool-examples.md,
  cortex-tasks/board/2026-10-25_board-agent_tool-list-trim.md

## D-057 One skill, one MCP name, read by every client
- **Date**: 2026-10-26 · **Status**: Accepted · **From**: maintainer (chat 2026-10-25, points 22-31, 48)
- **Decision**: The MCP server is configured as `vision-board` (it already reported that name). The
  skill's one source is this repo's `skills/vision-board/`; `~/.claude/skills/vision-board` and
  `~/.kiro/skills/vision-board` are links to the main checkout's copy, never copies.
- **Why**: `vb` was ambiguous across projects; copies of the skill drift.
- **Rejected**: `vision_board`; copying the skill into each project or client.
- **Task**: cortex-tasks/board/2026-10-25_board-agent_tool-list-trim.md

## D-058 Hover tips can be reached: a shared close grace
- **Date**: 2026-10-26 · **Status**: Accepted · **From**: maintainer (chat 2026-10-26, points 141-148)
- **Decision**: Every hover tip (and the container note preview) closes about 300 ms after the pointer
  leaves both its anchor and the tip (`packages/ui/src/tip/close-grace.ts` `CLOSE_GRACE_MS`); opening,
  Esc and a press outside stay immediate. A tip that scrolls does so in an inner body, so its gap
  bridge is never clipped.
- **Why**: a reply's tip closed before the pointer reached it, so long replies could not be scrolled.
- **Rejected**: a longer delay (tips linger); clicking to read (it opens the whole conversation).
- **Task**: cortex-tasks/board/2026-10-26_board-ui_hover-tip-reachable.md

## D-059 One package scope: modules are folders named in the root imports map
- **Date**: 2026-10-27 · **Status**: Accepted (maintainer approved 2026-10-27, point 292) · **From**: orchestrator, under the maintainer's delegation for the overnight tidy-up (2026-10-27); builds on point 224
- **Decision**: The repo has one `package.json`, at the root, with every dependency and script.
  `apps/board/package.json` and npm workspaces are gone. Modules are reached by the names in the
  root `imports` map (`#format`, `#ui`, …), which Node, Vite, TypeScript and Playwright all resolve.
- **Why**: a `#name` resolves against the importer's nearest `package.json`, so the board's own one
  hid the root map from every file under `apps/board/` (ARCH_01 step 1), and an `imports` target cannot
  leave its package. One scope also matches point 224 (modules, not npm packages) and leaves nclite
  importing the board's files where they sit.
- **Rejected**: an npm package per module (point 224); tsconfig `paths` plus a Vite alias plus a Node
  loader (a second naming mechanism); an `imports` map per app (its targets cannot leave the app).
- **Task**: cortex-tasks/project/2026-10-26_project-tooling_tidy-up/ARCH_01_module-front-doors.md

## D-060 A module's names: one way in per kind of use
- **Date**: 2026-10-27 · **Status**: Accepted (maintainer approved 2026-10-27, point 293) · **From**: orchestrator, under the maintainer's delegation for the overnight tidy-up (2026-10-27), from ARCH_01's draft
- **Decision**: `#<module>` is a module's front door (`src/index.ts`); `#<module>/styles.css` its one
  stylesheet; `#<module>/files` the file paths Node reads from it (schemas, fixtures), only for a module
  the page loads, so `node:` stays out of the page bundle (a Node-only module exports them from its
  front door: `GATE_BIN`, `MCP_BIN`); `#<module>/testing` its test support. `verify` fails on any
  other way in, from `tests/` and `skills/` too.
- **Why**: one way in per kind of use, each visible to `verify` and the module map.
- **Rejected**: a wildcard `#ui/*` (every file a door); file paths on the front door (`node:url` in the
  page bundle); a `styles.css` wrapper for a module with one sheet.
- **Task**: cortex-tasks/project/2026-10-26_project-tooling_tidy-up/ARCH_01_module-front-doors.md

## D-061 The board's CSS scope in a host's page
- **Date**: 2026-10-27 · **Status**: Accepted (maintainer approved 2026-10-27, point 294) · **From**: orchestrator, under the maintainer's delegation for the overnight tidy-up (2026-10-27), from UI_01's draft
- **Decision**: Every board rule is scoped: a `vb-`-prefixed selector (element, class or `[class*='vb-']`)
  counts as scoped, so the gallery's patterns need no board root. The board's root class is
  `vb-board`, which is also its `@container vb-board`; width rules are container queries, never
  `@media` by width. A guard (specificity 0,0,2, `all: revert`) undoes a host's element rules for
  h1–h3, p, button, input, select, textarea and dialog inside the board. Rules for the standalone page
  itself live only in `apps/board/src/styles/shell.css` and `chat-host.css`. `verify-style.mjs` fails on
  an unscoped selector or a width `@media`.
- **Why**: the board lives in nclite's page (principles § The board is a plugin): nclite's element rules
  reach in (its `h2` is small capitals) and the board's must not reach out; it sits in a pane of any
  width. Measured: the board and about 250 gallery samples are pixel-identical under a hostile host sheet
  (`tests/pages/host-styles.spec.ts`).
- **Rejected**: Shadow DOM (nclite rejected it: it blocks the app's patterns); every rule under the
  root class only (nclite's draft; the gallery shows patterns with no board root, and our names are
  already namespaced).
- **Task**: cortex-tasks/project/2026-10-26_project-tooling_tidy-up/UI_01_shared-ui-base.md

## D-062 Test support per module, and fixtures a page loads as text
- **Date**: 2026-10-27 · **Status**: Accepted (maintainer approved 2026-10-27, point 295) · **From**: orchestrator, under the maintainer's delegation for the overnight tidy-up (2026-10-27), from TEST_01's draft (an addendum to D-060)
- **Decision**: A module's test support is `#<module>/testing`; an app's is named too (`#board/testing`),
  and another module finds it only with `import.meta.resolve`, to run it as a child process (its
  fixture server), never imports it (D-016). A fixture a page loads as text is named by its file
  (`#format/gallery.ledger.jsonl`, imported `?raw`). `verify` reads `import.meta.resolve` as a path.
- **Why**: shared fixtures have one home each, reached by name, so `verify` sees every way in.
- **Rejected**: one `packages/testing` package (a package cannot reach an app); a wildcard
  `#format/fixtures/*` (every file a door).
- **Task**: cortex-tasks/project/2026-10-26_project-tooling_tidy-up/TEST_01_test-support-and-parallel.md

## D-063 Words homes: one per part, keyed for the plugin's words file
- **Date**: 2026-10-27 · **Status**: Accepted (maintainer approved 2026-10-27, point 296: words centralised as in nclite, so the words an agent reads are easy to see and change; a test keeps each in its home) · **From**: orchestrator, under the maintainer's delegation for the overnight tidy-up (2026-10-27), from ARCH_05's draft
- **Decision**: Every sentence a person or an agent reads lives in a words file, one per area, in a
  `words/` folder of the part that sends it: the board (`apps/board/src/board/words/`, inside `board/`
  so it stays hostable), the standalone page (`shell/words/`, which may import the board's, never the
  reverse), the patterns, the server, MCP, the CLI, `#format` (its words import nothing) and `#actions`. A sentence's key is `board.<area>.<name>`; areas
  are unique across homes. A fixed sentence lives once per part, in that part's `common` file. A words
  file imports only words files and types. `scripts/words-homes.mjs` is the list of homes, and
  `scripts/words.test.mjs` holds it and `docs/specification/words.md` equal; a sentence left in code
  fails the test unless it is named under Exemptions with its reason.
- **Why**: one home per sentence (principles § Architecture we adopt), and nclite's plugin contract
  wants one keyed words file per plugin, which these homes can build.
- **Rejected**: one words folder for the whole app (the board would import outside itself and stop
  being hostable); unkeyed constants (no way to build the plugin's file).
- **Task**: cortex-tasks/project/2026-10-26_project-tooling_tidy-up/ARCH_05_words-files.md

## D-064 SVG images in cards, as pictures only (amends D-048)
- **Date**: 2026-10-27 · **Status**: Accepted (maintainer approved 2026-10-27, point 306: svg as pictures only; an svg that needs script is an app card) · **From**: SVG_01 (host-fixes-and-svg)
- **Decision**: svg joins png, jpeg, webp and gif as an image a card shows from the project's
  `.visionboard/images/`, behind the `svgImages` flag (on by default with this yes;
  `?flags=-svgImages` on the page and `VB_FLAGS=-svgImages` on the server each refuse it as before,
  "only png, jpeg, webp or gif").
  1. Shown only through `<img>` (the card's one image shape and the zoomed view), never inline,
     `<object>` or `<iframe>`. In an `<img>` the browser runs none of an svg's script and loads nothing
     it names; its CSS and SMIL animation play. An svg that needs script is an app card (D-047).
  2. Served as `image/svg+xml` with `nosniff` (already global) and its own policy in place of the
     board's, on 200 and 304: `default-src 'none'; style-src 'unsafe-inline'; img-src data:;
     font-src data:; frame-ancestors 'none'; base-uri 'none'; sandbox`. Opened at its own address it
     is a sandboxed document with an opaque origin that runs no script and loads nothing. Every
     directive is the board's or stricter except inline style, which is the file's own and reaches
     nothing; the 304 carries it so a revalidated cached copy never takes the board's.
  3. Known by its opening, as it has no first bytes: within its first 4,096 bytes, after an optional
     BOM, white space, processing instructions, comments and a doctype, an `<svg` root whose `xmlns`
     is the SVG namespace. A doctype declaring entities (`<!ENTITY`) is refused: a picture never needs
     one, and their expansion costs the browser.
  4. At most 1 MB (other types 8 MB): it is text the browser parses whole.
  5. It says its size: a `viewBox` (width and height above 0), or a `width` and a `height` that are
     positive lengths, not percentages. One with neither is refused ("needs a viewBox, or a width and
     height"), so the browser's 300 by 150 box never jolts the layout.
  6. The route does not look for script, `on…=` handlers, `<foreignObject>` or outside references.
     The `<img>` and the policy are the boundary; a text search is not one (a namespace prefix or a
     handler gets past it), and an outside-reference search would refuse nearly every exported svg
     (namespace and metadata URLs). An svg holding script is drawn without it; the skill tells
     agents first.
  7. Motion: the skill tells agents to write CSS animation inside
     `@media (prefers-reduced-motion: no-preference)` (the browser's own setting reaches into an svg
     image: checked in Chromium), to keep it short (a few runs, about 5 seconds in all, then rest:
     WCAG 2.2.2), to keep SMIL to the same short moves (it ignores the setting), and never to flash
     more than three times a second (WCAG 2.3.1). Longer or endless motion goes in an app card with a
     pause control.
- **Why**: agents could show screenshots but not a diagram that stays sharp at any zoom or a small
  animation. D-048's reason (svg can carry script) holds for an svg opened as a page, which the
  policy now covers, not for one drawn as an image.
- **Rejected**: svg inline in the card's markup (its script would run in the board; D-023 stays);
  refusing script by a text search (not a boundary, see 6); a separate origin or port for images
  (the sandbox gives an opaque origin on one server, as D-047's panels do); no size check (the 300 by
  150 jolt).
- **Task**: cortex-tasks/board/2026-10-27_board-app_host-fixes-and-svg/SVG_01_svg-images.md

## D-065 An app card fits its panel's content (amends D-047 ruling 3)
- **Date**: 2026-10-27 · **Status**: Accepted (maintainer approved 2026-10-28, point 314: an app card fits its panel's content; a limit stays, just in case; the height limit set to 1080, point 315) · **From**: maintainer
  point 312; app-panel-fits-content task
- **Decision**: A panel may tell the board its content's height with MCP Apps' own
  `ui/notifications/size-changed` (`{ height }` in px). Behind the `appFit` flag, on by default:
  1. The board sets the frame's height to it, rounded and held to 120 to 1080 (`packages/format/src/apps.ts`). A
     `width` is ignored: the width stays the agent's `w`, so a panel never widens its card.
     The agent's own `h` keeps 120 to 800 (`APP_SIZE.h`): it is written to the ledger, so a
     wider limit there would be a ledger format change; a told height is never stored.
  2. The agent's `h` is the height until the panel tells one, and again once the frame is removed
     (the panel starts again at it). A frozen panel keeps its last height. A panel that tells
     nothing keeps the agent's size.
  3. The card is measured again through the board's one re-measure path for a card that changed
     height by itself (the one images use), so the cards under it move; layout stays a pure function
     of measured sizes. Nothing is written to the ledger or the saved panel state.
  4. A height equal to the last does nothing; the message counts towards
     `panelMessagesPerSecond`; content that grows with its frame stops at 1080.
  5. `containerDimensions` stays the agent's `{ width: w, height: h }`, and the board sends no
     `host-context-changed` after a told height (MCP Apps: a host "MAY" send it).
  6. Off (`?flags=-appFit`), size-changed is ignored, as before.
- **Why**: the agent can't know the height its app's content takes, so cards showed a blank band
  under the content or cut it off.
- **Rejected**: the board reading the panel's height itself (the opaque origin forbids it); the
  panel setting its width too (a panel would widen cards and the container); sending the new height
  back as `containerDimensions` (the agent's size stays the panel's statement of what was asked).
- **Kept**: `containerDimensions` as `{ width, height }`, not MCP Apps' flexible `{ width, maxHeight }`: nothing changes for existing apps, and a panel tells its content's height either way.
- **Task**: cortex-tasks/board/2026-10-27_board-ui_app-panel-fits-content.md

## D-066 The agent's access is decided by path rules
- **Date**: 2026-10-28 · **Status**: Accepted (maintainer approved 2026-10-28, point 340; with points 338 and 339: `.env.example` readable, the bots' secrets refused in any board folder) · **From**: points 329, 331, 334, 335; agent-access-and-working RULES_01
- **Decision**: The side-panel agent's every tool call is decided by one function, `policy`
  (`packages/agent/src/policy.ts`), over one table, `ACCESS_RULES` (`access-rules.ts`), of paths relative to
  the board's folder:
  1. The table: everything in the folder read allow, write ask; `**/.env`, `**/.env.*` refused but
     `**/.env.example` (read allow, write ask: it helps and holds no secret, point 338);
     `**/.visionboard/agents.json`, `**/.visionboard/chat-sessions.json` refused in any board folder (point 339); the ledger, `lock`, `app-state/**`,
     `permissions.json` and the rest of `.visionboard/` read allow, write refuse; `.visionboard/images/**` and
     `apps/**` allow (an app's changed code asks again before it runs, D-047); `.git/**` read allow, write refuse.
     The most specific row wins (a file before a folder's contents, then more named parts, then order).
  2. A refusal holds whatever the person answers, and is applied before anything remembered.
  3. A path is resolved before the table is asked: absolute, `..` on the real folders, symlinks followed, the
     disk's spelling, a new file by its nearest existing folder; matched as written and ignoring case, the
     stricter kept. A hard-linked file is asked once.
  4. Anything the table doesn't allow outright is asked. Outside the folder: asked "once" or "this session"
     only, never remembered for the folder.
  5. A shell command that only reads (the allow-list, joined only by `|`, plain words) is a read of each word;
     a search is a read of every file under its folders. Any other command is asked; any command naming a
     refused path is refused.
  6. A remembered yes is narrowed: a write yes covers its file's folder, a command yes its first words
     (`commandHead`); the new `folder` scope is kept in `.visionboard/permissions.json`, which only the server
     writes, listed and forgettable by the person.
  7. A question waits until the person answers, stops, or sends a new message; the turn's limit counts only
     the agent's own working time; Claude's hook waits up to 24 hours.
  8. Behind `agentAccessRules` (on): off, nothing is allowed unasked and there is no `folder` scope; the
     refusals, the resolution and the narrower remembered yes are a fix and hold either way.
- **Why**: one yes covered every write or command; reads had no limit (`.env`, the bots' keys, the home
  folder); the ledger and `.git/` were ordinary files; paths were judged as typed; a question expired after
  2 minutes.
- **Rejected**: a deny list on paths as typed (bypassed by `..`, links, case); refusing every command
  (the agent could not run tests); refusing outside the folder (the person sometimes wants it).
- **Task**: cortex-tasks/board/2026-10-28_board-agent_agent-access-and-working/TASK-STATUS.md

## D-067 Git is the person's; more closed files (amends D-066)
- **Date**: 2026-10-29 · **Status**: Accepted (maintainer approved 2026-10-29, point 348) · **From**: points 345, 346; agent-access-and-working WIRE_01 Run 4, VERIFY_01
- **Decision**: D-066's table and policy change as follows.
  1. `.git` in any folder (`**/.git/**`) is refused to read and to write; among rows naming a folder's
     contents, one refusing both ways wins, so it holds inside `.visionboard/images/` and `apps/`.
  2. Every git command is refused, read-only ones too, however it is spelled (`cd … && git`, `env … git`,
     a path to git, `sh -c "git …"`, `$(git …)`); git is off the read-only allow-list. The agent says what it
     would run and why; the person runs it. A command that only mentions git is refused too.
  3. `**/.envrc` and `**/.npmrc` are refused like `.env`.
  4. `**/.visionboard/app-state/**` is refused to read and write, and `**/.visionboard/ledger.jsonl` to write,
     in any board folder.
  5. Claude Code's deny rules and Kiro's agent rules are regenerated from the table (`Bash(git *)`, Kiro's
     `shell` deny and `deniedCommands`).
- **Why**: the integrated agent builds boards and apps in `.visionboard/`; it does not see or touch git (346).
  `.git/config` can hold a token; git's own settings run commands; reading app state reached `.env` values
  through an app (VERIFY_01 F5, F6, F9, F10).
- **Rejected**: refusing only git's writing subcommands (git's config and aliases make reads run code);
  git at the folder's top only (nested repositories).
- **Task**: cortex-tasks/board/2026-10-28_board-agent_agent-access-and-working/TASK-STATUS.md (WIRE_01 Run 4)

## D-068 Files attached to a chat message travel by path
- **Date**: 2026-10-30 · **Status**: Accepted (maintainer approved 2026-10-29, points 351, 352, 353) · **From**: chat-attachments PLAN
- **Decision**: The person attaches files to a chat message; the agent reads them with its own tools.
  1. Every file travels by path, pictures included; no picture or file content goes inside the message, so
     neither adapter changes. The prompt gets one block, "The person attached these files:", one path a line.
  2. Files are saved at `.visionboard/attachments/<YYYY-MM-DD>/<n>-<name>`, the name sanitised, `<n>` counting
     up within the day. Day folders, because a new chat's first message has no session yet.
  3. Limits: 10 MB a file, 10 files a message, any type. The board never serves these files to a page.
  4. A file uploads when it is attached, so a refusal shows on its chip at once; a chip removed before Send
     leaves its file (clearing old attachments is later work).
  5. The agent may read attached files and never change them (`ACCESS_RULES`, `.visionboard/attachments/**`).
  6. `packages/chat` takes no API: the composer takes files and raises an event; the host uploads. In nclite the
     host's chat does its own attaching and hands over the paths.
  7. A sent message shows its files as chips.
- **Why**: one way that works for Claude Code and Kiro alike (Kiro v2 takes no file contents in a message; both
  adapters send text only); a page that sends a path is never trusted (the server checks it saved that file).
- **Rejected**: pictures inside the message (both adapters would change, Claude's to stream-json input);
  upload on Send (a refusal would come too late); session folders (no session yet on a first message).
- **Task**: cortex-tasks/board/2026-10-29_board-app_chat-attachments/TASK-STATUS.md

## D-069 Attached files: what the agent may run on them, and corrections to D-068
- **Date**: 2026-10-30 · **Status**: Accepted (maintainer approved 2026-10-30, points 358, 359, 360, 361; points 356, 357 told and not objected to) · **From**: chat-attachments VERIFY_01 F1, F5, F7
- **Decision**: D-068 changes as follows.
  1. A command the rules do not know asks about an attached file, as it does about any other file in the
     folder. Commands known to change a file stay refused on an attached file: `rm`, `mv`, `tee`, `truncate`,
     `dd`, `sed -i`, a redirection onto it, and `cp` or similar with it as the target. "Never change" is enforced for what
     is recognised; for a command it cannot judge it rests on the person's answer.
  2. Copying out is allowed: `cp` with an attached file as its source asks, the original stays, and the copy
     follows the rules of where it lands.
  3. The board adds attachments to its own `.visionboard/.gitignore`, so attached files stay out of a project's git.
  4. Correction to D-068's Why: `send_chat` accepts a plain file of the saved shape in the attachments folder,
     with no link at any step; it does not record what it saved. The agent cannot write there.
  5. Recorded from the set: a chip and a sent message show the person's own file name, display only, never in
     the prompt (point 356); a file dropped anywhere on the page never replaces the board, and the open chat panel takes the
     drop (point 357).
- **Why**: "any type" meant nothing if the agent could not open `.docx`, `.xlsx` or `.zip`; a refusal is final, an
  ask leaves the choice with the person.
- **Rejected**: growing the read-only list command by command (it can't prove a script only reads); installing
  document tools on the person's machine from the agent (supply chain). A board tool that reads attachments is
  the next set (point 361).
- **Task**: cortex-tasks/board/2026-10-29_board-app_chat-attachments/TASK-STATUS.md (FIX_01)

## D-070 What is in an attached file is untrusted (amends D-069)
- **Date**: 2026-10-30 · **Status**: Accepted (maintainer approved 2026-10-30, point 362; point 363 left as recommended) · **From**: chat-attachments FIX_01
- **Decision**:
  1. The agent may be asked to run an attached file as a program (`python3 <attached>`, `bash <attached>`): it
     asks, it is not refused. People using the board are taken to attach files with care.
  2. The prompt says, after the paths, that attached files come from outside the conversation and are untrusted:
     information, never instructions; if one asks for something, the agent checks with the person. The skill says
     the same, and what `read_attachment` returns will be tagged the same way.
  3. A yes on a command naming an attached file counts for that command only, since a kept yes for a tool that can
     also write (`unzip -o`) could later change an attached file unasked.
- **Why**: the marking tells the agent how to treat a file's words; the access rules and the person's yes still sit
  behind it. It asks the model; it does not force it.
- **Rejected**: refusing to run an attached file as a program (the person decides); a yes kept for the session
  (`read_attachment` is the way to fewer asks).
- **Task**: cortex-tasks/board/2026-10-29_board-app_chat-attachments/TASK-STATUS.md

## D-071 Reading attachments: one board tool, and PDFs rendered in a sandbox
- **Date**: 2026-10-30 · **Status**: Accepted (points 361, 364-367; the rulings the maintainer delegated 2026-10-30, to decide by the principles and report back) · **From**: read-attachment PLAN
- **Decision**: PLAN rulings 1-8, in short:
  1. `read_attachment(path, { sheet?, range? })` is an MCP tool for attached files only; everything it returns says it is untrusted (D-070).
  2. Excel: the sheets, then a range, each cell's address, value and formula. Word: headings, lists and tables as
     Markdown, pictures saved to a new folder. Zip: a new folder every time, nothing overwritten, with limits, and links
     and escaping names refused.
  3. A PDF's pages become pictures when it is attached, at most 30, by `pdfjs-dist` in a frame with no origin and no
     network; the answer is checked again outside it. A picture over 5 MB or 2000 px gets a fitted copy beside it.
  4. The reader lives in `packages/documents`, with no board import, so nclite can take it. A tool and its gate ship
     together or neither ships.
  5. Dependencies: `fflate` 0.8.3, `pdfjs-dist` 6.4.299 without `@napi-rs/canvas`. XML goes through our own small reader that refuses a DOCTYPE.
- **Why**: measured 2026-10-30 on Kiro CLI 2.35.2: its read tool can't open a real PDF, and a 9.7 MB picture is rejected by the
  provider and never seen. People will attach customer architectures, where the diagram is the point. A PDF library
  has had script-running flaws, so it gets a place where script reaches nothing.
- **Rejected**: Python tools on the person's machine (nclite ships them in its container; here they would be installed by the
  agent); a Node renderer in a child process (needs a native canvas, and script there reaches the disk); plain text
  from Excel (loses formulas and shape); lifting KiroCrew's code whole (Python; the zip guard and the Word logic are ported, Apache 2.0).
- **Task**: cortex-tasks/board/2026-10-30_board-app_read-attachment/TASK-STATUS.md

## D-072 A PDF's sandbox: a worker inside the frame (amends D-071)
- **Date**: 2026-10-31 · **Status**: Accepted (the rulings the maintainer delegated 2026-10-30, to decide by the principles and report back) · **From**: read-attachment PAGES_01
- **Decision**: D-071's ruling on PDFs holds, and goes further:
  1. A file is read in a worker inside the sandboxed frame, not in the frame itself. Measured: `connect-src 'none'` does not stop WebRTC, and a real STUN packet left a frame; Chromium has no directive for it. A worker has no `RTCPeerConnection`, no `location` to navigate, no document.
  2. The page's `frame-src 'self'` stops a frame navigating itself to carry data out. A host's page needs the same.
  3. The fitted copy of a picture is made in the frame too, not in the page as D-071 said: a stranger's picture decoded in the board's own origin is what the frame exists to avoid.
  4. The frame's policy adds `wasm-unsafe-eval` (never `unsafe-eval`) for pdf.js's JPEG 2000 and JBIG2 decoders, inside its script, so a scanned page is not silently blank. Character maps go inside it too, for the same reason.
  5. Send waits for a fitted copy, which takes a moment; it does not wait for a PDF's pages, which can take minutes. The agent is told only what is saved.
- **Why**: a claim of "no network" has to be measured. A person who pastes a big picture and presses Enter must not send the one thing the provider will reject.
- **Not established**: Chromium is all the suite runs. Safari and Firefox are not tested; a frame that doesn't work says "can't be read here" on the chip, and the file still goes.
- **Task**: cortex-tasks/board/2026-10-30_board-app_read-attachment/TASK-STATUS.md (PAGES_01)

## D-073 Corrections after reading attachments was checked (amends D-069, D-071, D-072)
- **Date**: 2026-10-31 · **Status**: Accepted (the rulings the maintainer delegated 2026-10-30, to decide by the principles and report back) · **From**: read-attachment VERIFY_01
- **Decision**:
  1. A picture's cap is 3.5 MB, not the 5 MB of D-071. Measured live on Kiro CLI 2.35.2 (v2, Sonnet 5.5): 4.3 MB is rejected by the provider, 3.5 MB is seen. The provider's 5 MB is on the base64 size. `PICTURE_BYTES`, one constant in `#format`.
  2. D-072's "Chromium is all the suite runs" means its headless shell, which hid a real fault: a frame in its own process says it is ready after `load`. Tests tagged `@full-build` also run on any full Chromium build installed, and the run says which it found. Google Chrome, Firefox and Windows are not established.
  3. D-069's "the agent cannot write there" holds for what the rules recognise. A command they can't judge asks, and a yes to it could.
  4. A diagram never vanishes with no word. Where a Word or Excel file holds one, the agent gets a marker, the words in its shapes and SmartArt, what connectors join, a chart's kind, title, series and figures, and a `note`. Its look and layout are not read, and arrow direction is reported as drawn.
- **Why**: each was found by checking rather than by the first build. The real use is customers' architecture documents, where a silently missing diagram gives a confident wrong answer.
- **Task**: cortex-tasks/board/2026-10-30_board-app_read-attachment/TASK-STATUS.md (VERIFY_01, FIX_PAGES, FIX_DOCS)

## D-074 The board is built as one plugin, and the standalone app is a host of it
- **Date**: 2026-10-31 · **Status**: Accepted (maintainer, points 337, 341, 343, 373) · **From**: board-app plugin-mode PLAN
- **Decision**:
  1. The standalone app is a host of the plugin, through the same mechanisms any other host uses, so working here means working there. The contract stays general and standard: plain ES modules, JSON Schema, MCP's tool shape. Nothing in it names nclite.
  2. The board's controls stay Svelte, compiled inside the plugin's bundle. A host only ever calls `mount`. This amends tracker M8's "framework-free"; the host contract's "framework-free view" means framework-free to the host.
  3. Local is master. A host takes the built folder from here. GitLab gets only the cleaned export.
  4. Tools reach any bot as MCP tools: the engine gives `tools.list` and `tools.call`, and each host chooses its transport. Standalone's is `vb-mcp`.
  5. Attachments belong to the host's chat (D-068 ruling 6). The plugin never sees a file. `read_attachment` and the PDF frame stay with the standalone chat; `packages/documents` stays reusable.
  6. The answers since the last Send are a chip, through `chat.attach` and `resolve`, with no extra prompt hook. This one is the planner's call, under the maintainer's "keep it general", and can be overruled in review.
  7. The maintainer reviews the final spec, `docs/specification/plugin.md`, and may change any of these there.
- **Why**: the board's destination is a plugin in nclite, built once and shared. Today a host gets the canvas and none of its controls, and our own chat goes around the contract in seven places, so "works here" doesn't mean "works there".
- **Rejected**: rewriting the controls framework-free (2,500 lines rewritten for a gain no host sees, since nclite is Svelte too and only calls `mount`); an adapter written to nclite's draft contract (a draft, implemented only in a prototype, and it would tie the board to one host).
- **Task**: cortex-tasks/board/2026-10-31_board-app_plugin-mode/TASK-STATUS.md

## D-075 A Send counts only the answers that went
- **Date**: 2026-11-02 · **Status**: Accepted (maintainer, points 377, 383, 384, 386, 389; entry 374A) · **From**: board-actions send-counts-what-went
- **Decision**:
  1. A Send acknowledges the answers its message carried, as a consumer commits an offset: `resolve('answers')` answers `head`, the ledger line it read through; the host passes it to `record`; the `send` line keeps it (`head`, ledger v19).
  2. `record(null)`: the message went without the answers chip; the Send is recorded and acknowledges nothing new. `record()`: no chat carried the answers (the bot reads the board); the Send covers up to its own line, as before.
  3. The board's watermark is the highest `head` (own `seq` on a line with none), never lowered: the answers chip, `board.unsent` and a note's history count from it. Old ledgers fold unchanged.
  4. A host records only after the message went: a failure records nothing; a crash before the record re-sends (a duplicate, never a loss). A chip the person removes is left out of that message only.
  5. Behind `sendCountsWhatWent`, on by default.
  6. On the standalone server, an `act` `send` is recorded once its chat session has the answers, with the head it read; pressed while the agent works, it is recorded acknowledging nothing new, and again when the message goes (point 383). The standalone page's own Send, with a session in use, is a message: queued while the agent works and recorded once, when it goes (point 389).
  7. With the chat's agent known, Send lights only for answers that agent may read; the others read theirs with `check_responses` (point 384).
  8. A Send that can't reach its chat session records nothing and says why to the person (`act` 409 `conflict`), so Send stays lit (point 386).
- **Why**: a host that lets the person remove the answers chip, or an answer made between the read and the record, lost answers the bot never got.
- **Rejected**: the chip's `ref` bounding the read (needs the board as of a past line); the engine remembering the last resolve (makes `resolve` stateful, and a failed message's read would be committed by the next Send: a silent loss); refusing a Send whose answers moved (re-sends the whole round); `record(null)` writing no line (chat-side and pull agents lose the Send signal); a v18 field without a bump (api.md 11).
- **Task**: cortex-tasks/board/2026-11-02_board-actions_send-counts-what-went.md; cortex-tasks/board/2026-11-02_board-actions_send-follow-ups.md; cortex-tasks/board/2026-11-02_board-actions_send-error-says-why.md

## D-076 Every id the board owns is prefixed, on its own page too
- **Date**: 2026-11-02 · **Status**: Accepted (maintainer, point 376; entry 374B) · **From**: board-app prefix-ids-everywhere
- **Decision**:
  1. Every id the board owns is `vb<n>-`, under a host and on its own page alike: one rule, no exception (`takeIdPrefix`, `prefixOf`).
  2. Tests select the board's ids through `bid()` (`tests/pages/helpers.ts`); the gallery takes its prefix the same way (`ownIds()`, `miniBoard`).
- **Why**: the plugin will live in many apps; an exception on the board's own page would let what we test and what hosts get drift apart.
- **Rejected**: plain ids on the board's own page (saves nothing, and the tests would check something hosts never get).
- **Task**: cortex-tasks/board/2026-11-02_board-app_prefix-ids-everywhere.md

## D-077 Under a host, the board folder lives in the bot's workspace
- **Date**: 2026-11-02 · **Status**: Accepted (maintainer, point 377.1; entry 374C) · **From**: board-agent plugin-skill-images
- **Decision**:
  1. In nclite each bot has its own board folder, whole, in its workspace (`bots/<id>/workspace/`).
  2. A bot puts a picture in the `images/` folder of the board folder its host names; there is no `put_image` tool. The plugin skill's Images section says so.
  3. An exception, for now: the bot can reach the ledger there, against "the ledger must never be editable by the agent". If that proves a problem, the ledger moves out of the workspace.
- **Why**: the workspace is already mounted into the bot's container, so this needs no new tool and no new mount.
- **Rejected**: a `put_image` tool (a new tool for what the bot can already do); moving the ledger out now (worth it only once the risk is real).
- **Task**: cortex-tasks/board/2026-11-02_board-agent_plugin-skill-images.md

## D-078 The plugin folder ships its types and a seam version
- **Date**: 2026-11-02 · **Status**: Accepted (maintainer, points 377.4, 377.5; entry 374D) · **From**: board-app plugin-types-and-seam
- **Decision**:
  1. The folder carries `plugin.d.ts`, made at build from the code with the repo's own TypeScript, never written by hand (`apps/board/bin/plugin-types.ts`). A TypeScript host compiles against the file of the folder it ships.
  2. `seam` in the manifest is one whole number from 1, with one home (`SEAM`, `apps/board/plugin/seam.ts`). It rises by one with any change a host built for the last number would not survive; never lowered, never reused.
  3. `SEAM_TYPES`, a hash of the types, sits beside it: the build and the tests fail when the types change until it is set again, so the bump is decided, never forgotten.
  4. A host reads `seam` before loading anything: the same number loads; any other keeps the folder it has and shows both numbers.
  5. The rule in full is `docs/specification/plugin.md` § The types and the seam version.
- **Why**: one plugin for every host: what the board gains, every host gets, and no host is broken by a folder it can't speak to.
- **Rejected**: a hand-written types file (drifts from the code); the manifest's `version` as the seam number (it moves with routes and says nothing of the seam).
- **Task**: cortex-tasks/board/2026-11-02_board-app_plugin-types-and-seam.md

## D-079 Inside a host's page, the board's styles hold their own
- **Date**: 2026-11-02 · **Status**: Accepted (maintainer, points 379, 380; entry 374E) · **From**: board-app plugin-mode FIX_01
- **Decision**:
  1. `root.css` takes back from a host's plain element rules (`span`, `div`, `svg`) what the board relies on, by named properties, not `all: revert`. An unusual property in a host's rule can still reach in; `plugin.md` says so. Cost: about 33 ms on the first draw of 1000 cards, accepted (point 380). The board's own page keeps the same rules.
  2. The host keeps its `color-scheme`: a build step takes it off the plugin's sheet (`hostKeepsColorScheme`, `plugin/color-scheme.css`), because the tokens are protected. The step goes if `color-scheme` moves out of `tokens.css`.
  3. The host-styles check (`tests/pages/host-styles.spec.ts` `sameUnderHost`) shoots off, on, off on a first difference and judges the closer pair, so it no longer catches a rule whose effect outlives the sheet. Tracker M28 is the reminder to find why and go back to one pass (point 379).
- **Why**: 33 ms goes unnoticed; a board broken by a host's styles does not. One set of rules keeps the board's own page the same as the plugin.
- **Rejected**: dropping the element rules (a host's styles would change the board); `all: revert` at the root (its cost); dropping them on the board's own page only (it would drift from the plugin).
- **Task**: cortex-tasks/board/2026-10-31_board-app_plugin-mode/TASK-STATUS.md (FIX_01)

## D-080 What a plugin bot gets, and what the board keeps through its host
- **Date**: 2026-11-02 · **Status**: Accepted (maintainer, PROOF_01 review; entry 374F) · **From**: board-app plugin-mode PROOF_01
- **In short**: a bot inside another app gets only the board tools that make sense there, and the host tells the board who the bot is.
- **Decision**:
  1. `x-hosts` on each agent operation in `openapi.json` says who gives its tool; `engine.tools` is exactly those marked `plugin`. `join`, `list_apps` and `read_attachment` are standalone's; `request_grant` is both. A person-only operation marked for a bot stops the build.
  2. A host registers its bot once through `route`; `join` is not an `engine.tools` tool.
  3. `BoardHost` gains two optional parts: `store` (none: the view lives in memory) and `imageRoute`, an address, since a browser loads `<img src>` by address; the engine gains `image` to serve it.
  4. The zoomed view is a real modal inside the board's root, so the host's page is inert while it is open.
- **Why**: a host names its bot, so a bot needs no identity of its own; app cards and the chat's reader stay with the standalone host; a grant request only asks, and the person's click decides.
- **Rejected**: every tool for a plugin bot (some mean nothing under a host).
- **Task**: cortex-tasks/board/2026-10-31_board-app_plugin-mode/TASK-STATUS.md (PROOF_01)

## D-081 How the plugin is built, and what a host may theme
- **Date**: 2026-11-02 · **Status**: Accepted (maintainer, BUILD_01 review; entry 374G) · **From**: board-app plugin-mode BUILD_01
- **In short**: one script builds the plugin and stops if anything is wrong, and a host may change the board's fonts and text size, not its colours.
- **Decision**:
  1. The build lives in `apps/board/bin/build-plugin.ts`, not `scripts/` (`npm run verify` forbids a script importing an app).
  2. Each host's tool words and skill edits must each match exactly once, or the build stops.
  3. A host themes fonts and text scale only (`--host-font`, `--host-font-mono`, `--host-text-scale`); colours are the board's.
  4. The manifest has no `settings` or `icon`.
- **Why**: a build that half-applies an edit ships a plugin nobody checked; colours carry the board's contrast checks (D-009), which a host's palette would bypass.
- **Rejected**: the build in `scripts/`; edits that apply where they can and skip the rest; themable colours.
- **Task**: cortex-tasks/board/2026-10-31_board-app_plugin-mode/TASK-STATUS.md (BUILD_01)

## D-082 The board sizes itself to its pane, and its teardown never stops a host's
- **Date**: 2026-11-02 · **Status**: Accepted (maintainer, CONTRACT_01 and FIX_01 reviews; entry 374H) · **From**: board-app plugin-mode CONTRACT_01, FIX_01
- **In short**: the board sizes itself to the space the host gives it, not the whole window, and a few small safety choices from the last fixes are recorded.
- **Decision**:
  1. `mount`'s root is a size container (`100cqw`, `100cqh` for the caps that were the window's), so what opens is capped by the pane.
  2. The folder's entries give a host exactly what `docs/specification/plugin.md` says: `board`, `onSend`, an opened `ledger`, `engine.ledger`, `engine.agents` and `dir` stay the standalone host's.
  3. `chat.status` needs only `now`: with no `staged`, a chip of the board's own that hasn't gone enables Send; a `staged` given has the full say.
  4. A step of `unmount` that throws goes to the console and `unmount` still returns (`teardown.ts` `finishAll`), so a host's own teardown after it still runs.
  5. The repo's commands are standalone's only, through `BoardPage.help`; the board's own words name none.
- **Why**: a pane is not the window; a host gets no way round the seam that it could come to depend on; a host's page must outlive the board's mistakes.
- **Rejected**: a `ResizeObserver` writing the root's height (JavaScript for what CSS does); rethrowing from `unmount` (stops the host's teardown).
- **Task**: cortex-tasks/board/2026-10-31_board-app_plugin-mode/TASK-STATUS.md (CONTRACT_01, FIX_01)

## D-083 The tools keep a bot's rules; the reads give it the facts
- **Date**: 2026-11-03 · **Status**: Accepted (maintainer, points 396, 401, 402) · **From**: board-agent bot-quality TOOLS_01, TOOLS_02
- **In short**: a rule a bot must keep is held by its tool, which refuses the wrong call, and what a bot needs to know comes back in what its tools return, not only in its instructions.
- **Decision**:
  1. A rule a bot must not break is held by its tool: an input it may not use is missing from its schema and refused when sent; the instructions carry only judgement. Who gives an input is said once, `x-hosts` on the parameter in `openapi.json`, as for a tool (D-080), and generated into the tool table (`inputHosts`).
  2. Under a host, `check_responses` has no `wait`; one sent is refused at once (`invalid`: the Send brings the answers, end the turn). The host starts the bot's turn from the Send; nothing polls. Standalone keeps `wait`.
  3. The MCP instructions are per host: tools may carry their own (`ToolHost.instructions`); the engine's are the plugin's, made from standalone's by edits in the plugin's words.
  4. A read tells an agent caller what is true for it: `owed` on each note it owes, `answered` on a note that is answered (what answered it and where: a reply's line, a version, a ✓ or ✗; never its words, which are on the board), `held` on a board it holds. One rule decides owing and answered (`noteAnswer`). A person's read is unmarked.
  5. A key repeated with the same content stays a quiet replay; with other content, a conflict whose words say what the key holds and name a free key. A key names one ledger line for good (D-017).
  6. All behind `botToolRules`, on; off is the revert.
- **Why**: in the bot eval, rules written only in the instructions were broken (a bot held its turn, answered a note twice, asked for a board it had); held by the tools and the reads, the eval went from 35 of 40 checks to 80 of 80.
- **Rejected**: more instruction text for each slip; a host-chosen `wait` (the Send starts the turn); repeating a reply's words in `answered` (context the board already holds).
- **Task**: cortex-tasks/board/2026-11-03_board-agent_bot-quality/TASK-STATUS.md (TOOLS_01, TOOLS_02)

## D-084 A project holds several ledgers, one folder each
- **Date**: 2026-11-03 · **Status**: Accepted (maintainer, points 23-30, 37-44) · **From**: board-app ledgers-and-read-only PLAN
- **In short**: `.visionboard/` holds one folder per ledger; each is a whole data folder for the engine, chosen by the standalone host.
- **Decision**:
  1. `.visionboard/<ledger>/` holds a ledger, its agents, lock, images, apps and app state. Repo-wide files (the standalone chat's sessions, attachments, permissions) stay at `.visionboard/`. The first ledger is `main`.
  2. One paths module gives every data-folder path from the project and the ledger; the agent's file rules stay their own table (D-037), held equal to it by a test.
  3. Keys, card identities, board numbers and agents are per ledger (amends D-017's "per project" to "per ledger").
  4. Choosing a ledger is the standalone host's, as choosing the folder is; the plugin seam does not change.
  5. One server has one ledger open at a time; switching is the folder switch's path; the lock is per ledger.
  6. A folder in the old layout moves into `main/` on first open, by rename only, while holding the lock; `npm run ledgers:undo` reverses it.
  7. The header shows folder / ledger / board / version; the ledger is three page parts of the standalone host, placed by `header-tier.ts`.
  8. An agent's read tools may read another ledger of the same project, read-only, to bring its work into the open one.
  9. Behind `ledgerFolders`.
- **Why**: one ledger per project grows without end and mixes unrelated work; throwaway planning needs a ledger of its own.
- **Rejected**: a ledger folder beside `.visionboard/` (clutters the project root); per-board files inside one ledger (agents, grants and numbers are ledger-wide, a far larger contract change); ledgers inside the plugin's board picker (a seam change for a host's choice).
- **Task**: cortex-tasks/board/2026-11-03_board-app_ledgers-and-read-only/TASK-STATUS.md

## D-085 A ledger opens read-only; Edit takes its lock
- **Date**: 2026-11-03 · **Status**: Accepted (maintainer, points 25, 31-36, 39, 42, 45) · **From**: board-app ledgers-and-read-only PLAN
- **In short**: opening a ledger never writes; Edit takes the ledger's lock if no one holds it; agents can read a read-only ledger and are told it is read-only.
- **Decision**:
  1. A ledger opens read-only and takes no lock; `--edit` or `VB_EDIT=1` opens it for editing, for development and tests.
  2. Edit takes the lock at the moment it is pressed (`takeLock`); a live lock elsewhere refuses and names the computer. Stop editing releases it.
  3. Read-only writes nothing at all: no line, flag, Send, lock or file.
  4. Reads carry `readOnly: true`; writes answer the problem `read-only`. Tools stay listed. D-043's `locked` is unchanged.
  5. The read-only state shows in all three header forms.
  6. A followed ledger reopens when its file is replaced, not only when it grows.
  7. The engine takes an optional read-only option, so a host can have it; `SEAM` stays 1 if the types check allows.
  8. Behind `readOnlyStart`.
- **Why**: a board shared through Dropbox, a git pull or a sent file must be watchable by anyone without a second writer forking the ledger; writing is a deliberate step.
- **Rejected**: hiding the tools while read-only (MCP clients cache the list for an hour, `packages/mcp/src/info.ts` `CACHE`); reusing `locked` (it means one board closed by the person, and bots are told to stop); a read-only server mode chosen only at start (the person could not go from watching to editing).
- **Task**: cortex-tasks/board/2026-11-03_board-app_ledgers-and-read-only/TASK-STATUS.md

## D-086 Markdown gains heading sizes, tables of up to 4 columns, and breaks
- **Date**: 2026-11-05 · **Status**: Accepted (maintainer, points 426-428) · **From**: board-ui insert-markdown-signals PLAN
- **In short**: extends D-023's fixed list so consolidated cards can carry structure; still our own renderer, still no HTML.
- **Decision**:
  1. `#` draws large, `##` medium, `###` to `######` as the small label (D-023's look); the caller's `aria-level` is kept.
  2. GFM tables of up to 4 columns, as real tables; columns follow their content, cells wrap, a word breaks only when it alone is wider than its column; a table never scrolls sideways; a card with one is the widest tier (`l`). Five or more columns stay text.
  3. `---`, `***`, `___` draw one quiet horizontal line; setext headings stay unsupported, so `---` under a line is a break.
  4. Behind `markdownMore`.
- **Why**: bigger cards (a summary of several) read as one undivided block; agents asked for structure; the person scans, so nothing may scroll.
- **Rejected**: horizontal scroll for wide tables (scanning a board breaks on it); task-list checkboxes (`- [ ]`: they look like answers and blur ✓ and ✗, D-045); equal-width columns (broke short words, wasted room).
- **Task**: cortex-tasks/board/2026-11-05_board-ui_insert-markdown-signals/TASK-STATUS.md

## D-087 A card can be inserted into a flow in one item
- **Date**: 2026-11-05 · **Status**: Accepted (maintainer, point 424) · **From**: board-ui insert-markdown-signals PLAN
- **In short**: `insert: { after, before }` on a `node` item puts the card between two linked cards of a `flow` or `lanes` container.
- **Decision**:
  1. One write: the card, the old link `after`→`before` removed, links `after`→card and card→`before` made with the old link's label; all or nothing; retry-safe by the item's key.
  2. Refused with a reason unless `after`→`before` is a link and both sit in one container that lays out by links; works for a new card or an existing one.
  3. An API convenience only: the ledger gets the existing node, unlink and link lines; ledger version unchanged.
  4. A new card's number comes in the write's answer; an agent names it in a reply in its next call (no placeholder).
  5. Behind `insertBetween`.
- **Why**: putting a card into a flow took three items, and forgetting the unlink left a fork.
- **Rejected**: a `{card:key}` placeholder in text (a format change and a new failure mode, to save one call); insert for `row`/`column`/`grid` (they order by card number).
- **Task**: cortex-tasks/board/2026-11-05_board-ui_insert-markdown-signals/TASK-STATUS.md

## D-088 Updated is amber, and the agent's reply carries it; new is teal
- **Date**: 2026-11-05 · **Status**: Accepted (maintainer, points 429-432; the colour may change, 429) · **From**: board-ui insert-markdown-signals PLAN
- **In short**: one colour per meaning, so a person scanning a busy board sees what changed.
- **Decision**:
  1. New is teal (`--vb-state-fresh`): the container's border and pill count, the card's NEW tab, the toolbar's "N new" chip and dot.
  2. Updated is a new token `--vb-state-updated` (light `#d66e00`, dark `#ffc21a`), set apart from the action amber by brightness in dark and by hue in light: the card's "N updates" tab (hover keeps it), the pill's "updated" count.
  3. The agent's reply has a left edge in that amber: bright while its card is unseen (D-054), muted after; the person's notes stay as they are.
  4. A container holding only updated cards keeps its teal border.
  5. Behind `updateSignals`. Read-only and Editing are one toggle (`readOnlyToggle`); sentences say "switch to Editing".
- **Why**: the pink "updates" marker was hard to see in dark, and the agent's replies looked like the person's notes.
- **Rejected**: amber for new as well (two meanings, one colour); the action amber itself (an action card's badge and its update tab would read the same).
- **Task**: cortex-tasks/board/2026-11-05_board-ui_insert-markdown-signals/TASK-STATUS.md

## D-089 The wheel scrolls what is under the pointer, then pans
- **Date**: 2026-11-05 · **Status**: Accepted (maintainer, after point 436) · **From**: cortex-tasks/board/2026-11-05_board-app_wheel-chaining.md
- **In short**: over anything that can still scroll the wheel's way, the wheel scrolls it; otherwise the board pans.
- **Decision**:
  1. One rule for the stage's wheel: the nearest element under the pointer that can still scroll in the wheel's direction scrolls; none, the board pans. It replaces the exception that never panned over note bubbles and hover tips (a container's title tip blocked panning).
  2. One gesture, one target: the target the first wheel event of a gesture finds keeps it until a 150 ms quiet gap, so a flick that reaches a bubble's end stops there and the next one pans.
  3. Ctrl or Cmd with the wheel zooms everywhere (it did nothing over a bubble or tip before). App cards keep the pan key: their sandboxed frame keeps its own wheel.
  4. Behind `wheelChaining`.
- **Why**: hovering a container title or a reply's popover stopped the board panning, which the maintainer found annoying in daily use.
- **Rejected**: panning only with the pan key over overlays (the earlier rule); handing over mid-flick (the board would lurch).
- **Task**: cortex-tasks/board/2026-11-05_board-app_wheel-chaining.md

## D-090 A structured card's title is its big headline
- **Date**: 2026-11-05 · **Status**: Accepted (maintainer, point 437) · **From**: cortex-tasks/board/2026-11-05_board-ui_big-titles.md
- **In short**: on a card whose body has a `#` or `##` heading or a table, the title draws large and the body steps down from it.
- **Decision**:
  1. A card is structured when its body, as drawn, has a `#` or `##` heading or a table; `###` labels, lists, quotes, code and lines alone do not count.
  2. A structured card's title draws at the `#` size (18 px on a card); in its body `#` and `##` draw at the medium size, `###` and smaller stay the small label. Every other card is unchanged. Notes and popovers keep D-086's sizes.
  3. CSS only, from what the renderer drew (`:has`), so the body is never parsed twice. Behind `bigTitles`.
- **Why**: a body `#` was bigger than the card's title, so a summary card read as if its title were a sub-heading; a test of 8 runs (Sonnet and Opus, SKILL v3.30) showed bots treat the title as the card's heading and start bodies at `##`.
- **Rejected**: a leading body `#` becoming the title with the real title muted (two names for one card; no bot wrote it); capping `#` at the title's size (loses the presentable headline).
- **Task**: cortex-tasks/board/2026-11-05_board-ui_big-titles.md

## D-091 The big title is bold; the bottom tabs sit at a third of the card
- **Date**: 2026-11-05 · **Status**: Accepted (maintainer, point 442 and the bottom-tab screenshot) · **From**: cortex-tasks/board/2026-11-05_board-ui_title-weight-and-tab-place.md
- **Decision**:
  1. A structured card's big title (D-090) is bold, so it reads as the headline over a bold `##`.
  2. The card's bottom-edge tabs are centred about a third of the way along the bottom edge, clear of the kind icon and "Open"; never left of 14 px nor over the footer buttons. Where a third does not fit (two tabs on a small card) they start at 14 px as before. Behind `updateSignals`.
- **Why**: the "N updates" tab sat against the card's icon and "Open" and read as part of them.
- **Task**: cortex-tasks/board/2026-11-05_board-ui_title-weight-and-tab-place.md

## D-092 One tab for an update and a proposal
- **Date**: 2026-11-05 · **Status**: Accepted (maintainer, point 444) · **From**: cortex-tasks/board/2026-11-05_board-ui_one-change-tab.md
- **Decision**:
  1. A card with both unseen updates and a proposal shows one amber tab, "1 update · proposal" ("2 updates · 2 proposals"; "· out of date" when every proposal is). Its box shows the proposals first (Accept, Reject, as from the proposal tab) and the update steps under them.
  2. A proposal alone, updates alone and the handover tab are unchanged. Accepting is an act on the card, so it also clears the updates (D-054).
  3. Hover shows only the proposals; the steps open on a click or Enter, since showing a step marks it seen.
  4. Behind `oneChangeTab`.
- **Why**: the agent changing a card and proposing its mark in one round put two tabs on the card that both said "something new here".
- **Task**: cortex-tasks/board/2026-11-05_board-ui_one-change-tab.md

## D-093 The bottom tabs start after the state word and hang lower; 30 px below a card
- **Date**: 2026-11-05 · **Status**: Accepted (maintainer, points 445-446 and the badge placed by eye) · **From**: cortex-tasks/board/2026-11-05_board-ui_tab-lower.md
- **Decision** (amends D-091's place):
  1. The card's bottom tabs start just after the footer's state word ("Open"), left-aligned, and grow rightwards to fit.
  2. They hang lower (the row at `bottom: -18px`), so their targets never meet the footer buttons' and the buttons never rise, on any size, with any number of tabs.
  3. The gap between a card and the card below it is 30 px (`ROW_GAP`: grid rows, column, flow and lane stacks); side by side stays 24 px (`GAP`). The hung tab clears the next card's top tabs by 3-4 px.
  4. Behind `updateSignals`: off, 24 px everywhere and the old tab place.
- **Why**: on a small card the tab fell back against "Open" and lifted the buttons; centred at a third it sat too far right.
- **Rejected**: 24 px (the hung tab overlapped the next card's tabs by 2-3 px); 28 px (1-2 px clear, cramped); 32 px everywhere (every board looser).
- **Task**: cortex-tasks/board/2026-11-05_board-ui_tab-lower.md

## D-094 A host may set the board's colours and mode
- **Date**: 2026-11-06 · **Status**: Accepted (maintainer, point 453) · **From**: cortex-tasks/board/2026-11-06_board-tokens_host-styling/TASK-STATUS.md (T_01)
- **In short**: under a host, the board can wear the host's colours and light or dark; a host that sets nothing, and standalone, keep the board's own look.
- **Decision** (amends D-081 rule 3; refines D-009):
  1. A host may set the board's colours and mode through optional properties (`--host-accent`, `--host-accent-strong`, `--host-on-accent`, `--host-canvas`, `--host-surface`, `--host-surface-sunken`, `--host-ink`, `--host-ink-muted`, `--host-line`, `--host-line-strong`, `--host-focus`, `--host-color-scheme`), on the mount root or any ancestor, live. Each falls back to the board's own token. The card kinds, state colours, scrim, dot grid, wires, lane band and shadows stay the board's.
  2. Contrast of the host's pairs is the host's promise: D-009's tiers, measured with APCA-W3 0.0.98G-4g in each mode it gives, for the pairs `docs/specification/plugin.md` § Theme and host styling lists. The board's own colours stay measured on its own grounds; on a host's grounds they are looked at, not promised.
  3. Light or dark: `--host-color-scheme`, else `data-theme` on `<html>`, else the system; never an inherited `color-scheme`.
  4. The seam stays 1. Behind `hostStyling`, on.
- **Why**: under a host the board kept its own accent and greys beside a bot of another colour, and followed the system when the person had forced the host's mode the other way.
- **Rejected**: colours stay the board's (D-081 3: the board looks foreign in its host); the mode from an inherited `color-scheme` (a page that says nothing would make the board light); a board setting for its own look or the host's (the host decides by setting the properties or not, point 450).
- **Task**: cortex-tasks/board/2026-11-06_board-tokens_host-styling/TASK-STATUS.md

## D-095 A host's button fill apart from its accent
- **Date**: 2026-11-06 · **Status**: Accepted (maintainer, point 457) · **From**: nclite's accent-fill handoff
- **Decision** (adds to D-094):
  1. Two more optional properties: `--host-accent-fill` (a primary button's fill; without it, `--host-accent`) and `--host-accent-fill-hover` (without it, `--host-accent-strong`).
  2. `--host-accent` keeps the selection, the rings and the soft grounds; `--host-accent-strong` keeps the accent text.
  3. `--host-on-accent` pairs with the fill and its hover, at Lc 60.
  4. A host that gives neither sees no change. The seam stays 1.
- **Why**: hosts fill a button deeper than they ring a selection. With one colour for both jobs, nclite's dark mode missed a contrast tier whichever colour it gave (Lc 51–58 with the bright accent as the fill; 17–36 with the deep colour as the ring).
- **Task**: cortex-tasks/board/2026-11-06_board-tokens_host-styling/TASK-STATUS.md

## D-096 The board's seam is the host contract's shapes (seam 2)
- **Date**: 2026-11-07 · **Status**: Accepted (maintainer, point 496) · **From**: nclite's handover (its N592, N593), points 458-492
- **Decision**:
  1. One shape everywhere: the board's seam is the host plugin contract's shapes (`Ref`, `SendRecord`, `ChangeMeta`, `PluginHost`, `CreateEngine`), in its own page and server as in any host; no adapter and no plugin-mode branch. A copy of the contract is a test fixture (`tests/plugin/contract/`), never the spec. The seam moves to 2.
  2. Events, `chat.reveal`, `chat.hasLine` and `view.reveal` take plain `Ref`s (a line is `{ board, cards: n }`); `chat.send(record)` calls `record(acks)`; the answers chip's `resolve` gives `ack: { board, head }`.
  3. A board write's change line is `_meta['plugin/change']`, `{ words, count, subject, reveal }`, its words keys `board.change.board|card|cards` listed as the manifest's `changeWords`, their text word for word the lines a host already stores. The key names no host; nclite is asked to rename its `CHANGE_META` to it.
  4. What differs inside a host is a flag the host turns on, never a fork. `singleAgent` (off): no sign-up, any caller id, never compared, no grants, no scoping, every agent line written as the folder's one agent (the first joined, else one the engine joins, named by `name()`); the board lock, `readOnly` and the person's ✓, ✗ and approving stay. `followOtherWriters` (on): off, the engine never polls the ledger for another writer. Standalone leaves both at their defaults, and its server never passes them to its engine.
  5. Every top-level selector of the plugin's stylesheet stays in the `vb` scope by the host's rule, and the sheet reads only `--vb-*` and `--host-*` properties, held by `npm run verify` and the plugin build test.
- **Why**: nclite hosts every plugin through one contract it owns (its ADR-0288), and carried a translator and a stylesheet waiver for the board alone. Built to the contract, the board needs neither, and any host built to it mounts the board as it is.
- **Task**: cortex-tasks/board/2026-11-07_board-app_plugin-contract/TASK-STATUS.md

## D-097 What a host still supplies, and one source for `singleAgent` (corrects D-096)
- **Date**: 2026-11-08 · **Status**: Accepted (maintainer, points 527-528) · **From**: the third independent review of seam 2, points 523-527
- **Decision**:
  1. D-096's "the board needs neither" (no adapter, no waiver) holds for the waiver and every translation, not for two facts the contract's manifest has no field for: the board's icon (a name in the host's own list) and its stylesheet's scope, `vb` (the plugin's id is `board`). The host keeps one entry for the board with those two, `{ icon: 'board', css: { scope: 'vb' } }`, until its manifest can say them; the board's test runs the host's own loader check with exactly that entry.
  2. `singleAgent` is set once, on the engine. The engine's ledger read says so (`oneAgent: true`), and the view follows it; a `singleAgent` view setting does nothing. The engine and the view can't disagree.
  3. The board's sheets hold to what every webview a host runs accepts: a nested selector starts with a symbol (`&`, a class, a pseudo-class, `:is(…)`), never an element name, which WebKit before Safari 17.2 drops. `npm run verify` holds it, beside D-096 point 5's rule, which it now enforces too (every property a board sheet reads is `--vb-*` or `--host-*`).
- **Why**: Three independent reviews found that the handover overstated what the host could delete (its loader would refuse the sheet), that one fact had two sources, and that the sheet's nesting and unprefixed properties were untested against the host's real webview and page.
- **Task**: cortex-tasks/board/2026-11-08_board-app_plugin-contract-review-fixes.md

## D-098 The plugin's id is `vision-board`, and its stylesheet's scope is in the manifest (replaces D-097 point 1)
- **Date**: 2026-11-08 · **Status**: Accepted (maintainer, point 531) · **From**: nclite's two asks before vendoring, 2026-11-08
- **Decision**:
  1. The plugin's id is `vision-board`: the manifest's `id`, the plugin folder's name, a chip's `plugin`, and the first part of every words key (`vision-board.<area>.<name>`, so the change line's keys are `vision-board.change.board|card|cards`). It has one home, `#actions` `CHIP_PLUGIN`. `.visionboard`, `plugin/change` and the icon name `board` are unchanged.
  2. The stylesheet's scope, `vb`, is the manifest's optional `scope` (absent means the id; present, it matches `^[a-z][a-z0-9]{1,15}$` and is not `host` or `ui`). The host's loader takes the scope from the manifest, and the host's entry for the board keeps only its icon, `{ icon: 'board' }`. This replaces D-097 point 1.
  3. The seam stays 2: the chip's id is part of the seam's types and changed, but no host had taken seam 2 yet.
- **Why**: nclite asked for an id that names the product and for the scope to come from the plugin rather than from a host-side entry, so the host keeps nothing for the board but its icon.
- **Task**: cortex-tasks/board/2026-11-08_board-app_plugin-contract-review-fixes.md
