---
category: project-decisions
last_updated: 2026-10-01
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

**Still open, not yet entries:** the app framework (Studio chose SvelteKit), and the layout
engine (our own code per mode, or ELK for flow, tree and lanes). Both need a plan first.

---

## D-001 Plan before you build
- **Date**: 2026-09-30 · **Status**: Proposed · **From**: Studio D-008
- **Decision**: All work beyond a trivial fix starts as a plan and goes through a Cortex task.
  Decisions are recorded here, not in `cortex/LOG.md`.
- **Why**: The plan keeps the thinking, the task keeps what was done, so the project stays
  traceable. The log is pruned, so it cannot hold decisions.
- **Alternative rejected**: Unplanned coding with decisions left in chat history.
- **Task**: none yet (founding set).

## D-002 Protected project instructions
- **Date**: 2026-09-30 · **Status**: Proposed · **From**: Studio D-007
- **Decision**: `.kiro/steering/vision-board-proj.md` is the one set of project rules; Kiro loads
  it, `CLAUDE.md` imports it, `AGENTS.md` points to it. It, `docs/principles.md`, this register
  and the design tokens change only with the maintainer's yes (GitHub `CODEOWNERS` once hosted).
- **Why**: Every person and agent follows the same rules, and no agent quietly rewrites them.
- **Alternative rejected**: Separate rule files per agent tool, which drift apart.
- **Task**: none yet (founding set).

## D-003 One action layer
- **Date**: 2026-09-30 · **Status**: Proposed · **From**: Studio D-003
- **Decision**: Every board action is a typed action with inputs, a needs-human flag and a
  transcript record. Buttons, shortcuts and agents call the same actions; decisions on items
  are the person's.
- **Why**: One path means one place to check who may act and one complete record.
- **Alternative rejected**: Buttons writing files directly and a separate agent tool surface.
- **Task**: none yet (founding set).

## D-004 The file formats are the contract
- **Date**: 2026-09-30 · **Status**: Proposed · **From**: Studio D-004, D-005 (adapted)
- **Decision**: The view file and transcript have versioned JSON Schemas in `packages/format/`;
  types, validator, fixtures and docs come from them. Fixture boards in the exact schema drive the
  gallery and tests.
- **Why**: The agent and the board agree on one machine-checked shape, and a fixture board and a
  live session run the same code.
- **Alternative rejected**: A loosely described format checked only by the UI.
- **Task**: none yet (founding set).

## D-005 Components: core, template, element, page
- **Date**: 2026-09-30 · **Status**: Proposed · **From**: Studio D-002, D-009 draft
- **Decision**: Each pattern has a framework-free core, one template for live and server render,
  and a plain web component; the framework only arranges pages. Anything shared is a web component.
- **Why**: Keeps the framework replaceable and makes patterns shareable with Studio. Studio's
  spike measured plain elements at 2.4 KB gzip against 16.9 KB (Svelte-compiled) and 29.7 KB
  (Vue-compiled).
- **Alternative rejected**: Framework-only components, unusable outside this app.
- **Task**: none yet (founding set).

## D-006 Generated pattern index
- **Date**: 2026-09-30 · **Status**: Proposed · **From**: Studio D-006
- **Decision**: The pattern index, with states, is generated from each pattern's `pattern.json`,
  never written by hand.
- **Why**: A generated index is always true, so duplicated components get caught.
- **Alternative rejected**: A hand-maintained catalogue, which drifts.
- **Task**: none yet (founding set).

## D-007 Dependency policy
- **Date**: 2026-09-30 · **Status**: Proposed · **From**: Studio D-010 draft
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
