---
category: project-decisions
last_updated: 2026-10-02
status: active
scope: The decision register for Vision Board — one entry per decision, appended in order
keywords: [decisions, register, adr, governance]
---

# Decision register

**How to read it.** An entry is *Proposed* or *Accepted*. Accepted entries are binding: when code
disagrees with one, the code is wrong. Proposed entries are open for review. **Today every entry is
Proposed**: they are carried over from Uplynk Studio's register and draft decisions
(`~/WORK/uplynk-studio/docs/decisions.md`, D-001 to D-011) and adapted, awaiting the
maintainer's review here. The reasoning is in [principles.md](principles.md).

**How to add to it.** Plan the decision as a Cortex task first. Then append the next number at
the end: date, status, the decision, why, the main alternative rejected, and the task link.
Never edit an Accepted entry; append a new one and mark the old one `Superseded by D-NNN`. The
work log (`cortex/LOG.md`) is not a decision record: it is pruned.

**Still open, not yet entries:** none. The framework (D-012) and the layout
engine (D-013) were decided on 2026-10-01; the component model is D-005, still Proposed.

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
- **Date**: 2026-10-01 · **Status**: Accepted · **From**: maintainer, first-look v2 item 25
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
