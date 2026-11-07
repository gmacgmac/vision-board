---
category: project-docs
last_updated: 2026-11-07
status: draft
scope: Vision Board's architecture and design principles, the target we build to, and why
keywords: [principles, architecture, patterns, reuse, components, tokens, actions, plugin, quality, dependencies]
---

# How we build Vision Board

This page is the source of truth for Vision Board's architecture and design principles. It
describes the **target**: what we build to. Where the code is not there yet, the gap is tracked
work (a tracker row and its task), never a reason to soften a principle here. The project
instructions (`.kiro/steering/vision-board-proj.md`) point here and do not restate it.

The Cortex `cortex-architecture` skill is the reference we draw on. This project adopts its
practices (§ Architecture we adopt); this page records where we go further or differ. Where this
page is silent, consult the skill. The board-specific parts were adapted from Uplynk Studio
(`docs/vision.md` § How we build, `docs/specification/rationale.md`,
`docs/specification/architecture.md`, `packages/ui/README.md`, `packages/tokens/README.md`, the
Studio Scaffold decision drafts, 2026-09-29 and 2026-09-30).

**Where we are (2026-10-27):** the tidy-up (`cortex-tasks/project/2026-10-26_project-tooling_tidy-up/`)
closed the review's gaps: one front door per module, one source per contract, words homes, feature
folders, a hostable board and an HTTP-free engine. `npm run verify` and the tests keep them closed.
What's still open is tracked: the board under a host (tracker M8, M10–M15), and smaller recipe and
test items (M16–M19).

**Our tenet: we don't know what the future looks like; we have to build it.** So we future-proof:
we choose open, swappable shapes over ones that assume today's tools. Point 1 below is this tenet
applied.

## What we are optimising for

1. **A long life.** Frameworks, AI models and people will change several times. We favour what
   survives that: web standards, web components, versioned file formats, design tokens.
2. **The person deciding.** The board exists so someone can take in AI output and decide faster.
   Every choice is judged by whether it makes reading and responding quicker and clearer.
3. **Agents as users.** The agent draws the board and reads it back. That has to be safe,
   explicit and recorded from the start, not bolted on.
4. **Built well with AI assistance.** Much of this code will be written and changed with AI
   tools. Structure that is small, explicit and consistent is what those tools get right.
5. **The top of our field.** Every state handled, accessible, tested, reviewed.

## Plan on the fly, build deliberately

Vibe coding got Architect to a working prototype fast, and that was the right tool for finding
the idea. It is the wrong tool for building something that lasts: the prototype ended up as one
1,200-line file with global state, no persistence for notes, and gaps nobody planned for.

So the split is:

- **Explore freely**, in chat or in `temp/` spikes. Cheap, fast, disposable.
- **Build deliberately.** Anything that reaches `apps/` or `packages/` starts as a plan, becomes a
  Cortex task, and is logged. The PLAN keeps the reasoning at the time; the task keeps what was
  done; the decision register keeps the outcome.
- **Decide once, reuse forever.** When a good shape appears (a pattern, an action, a file
  format), it is written down and reused. When none exists, we design one on purpose, because in
  a new field we will be inventing patterns as we go.

## Architecture we adopt

Vision Board adopts the `cortex-architecture` skill's practices; the skill holds their method and
reasoning, this list says how they land here. Consult the skill before planning any work.

- **Reuse: import, never paste; promote repeats.** § Reuse before you create.
- **One job per file; a split module keeps its public file.** § One job per file.
- **One front door per module.** Each folder under `packages/` is a module with one public file
  (`src/index.ts`). Code outside it imports that file by the module's name, never a path into the
  module. The same goes for its CSS and for files a server reads from it.
- **One source per contract.** § The contract comes first. Types, the client, the MCP tools, the
  `vb` commands and the docs are generated from or tested against the schemas and the OpenAPI spec;
  nothing hand-writes a response type.
- **One layer per concern, one interface into it.** One I/O layer, one action layer
  (§ One action layer), and the board reaches its host through one interface (§ The board is a
  plugin).
- **App-wide facts go through registries**: the condition registry (`packages/actions`
  `conditions.ts`), and references and jobs tables when they are needed. Never a local check that a
  second place repeats.
- **Words have one home.** Every sentence a person or an agent reads (screen text, errors, tool
  descriptions, refusals) lives in a words file for its area, never in the code that sends it.
- **Mock the data, not the screens.** § The contract comes first.
- **UI structure is pattern-owned; style is token-owned.** § Component model, § Design tokens.
- **A bug fix starts with the failing test. Prompts are code.** § Tests and quality.

## The board is a plugin

Vision Board's destination is a plugin inside nclite, beside Journal and Organizer; the standalone
app stays for development and the gallery. It is built to the host plugin contract nclite owns
(`~/ai/nclite/shared/plugin-host.ts`, `docs/plugins.md`): the board's seam is that contract's
shapes, everywhere it runs, and what differs inside a host is a switch the host turns on (D-096).
Where the board needs a shape the contract lacks, it asks for the contract to change.

- **Host-independent.** The board mounts in any host as `mount(root, host)`. The host supplies its
  routes, change events, the chat, settings, notices and confirmations. Nothing in the board imports
  the standalone app's shell, and nothing is left behind when it is removed.
- **Its own engine.** The server side is an engine given its folder and its caller. It opens no
  socket and finds no folder of its own. The standalone server and the MCP server are hosts of it,
  as nclite's engine will be.
- **The host's chat, the board's link to it.** The board has no chat of its own in a host. A Send
  from the board reaches the agent through the host's chat, and the agent answers on the board.
- **Its own storage.** Unlike Journal and Organizer (plain Markdown files), the board keeps its
  append-only JSONL ledger, in whatever folder the host gives it (`.visionboard/` standalone, and
  `.visionboard/` in the bot's workspace in nclite, D-077).
- **Lives in a host's page.** Its rules style no element outside it (it does set its own `--vb-`
  properties on the page's root), it takes back from a host's plain element rules what it relies on,
  and it lays out by its own width, not the window's.
- **Shared pieces are shared.** What a sibling plugin needs (the hover tip, menus, dialogs, search,
  ledger queries) lives in `packages/`, framework-free where it is UI, never only inside
  `apps/board/`.

## Reuse before you create

Every kind of code has a pattern, and new work starts by looking for it:

| Kind | Where the pattern lives | Question to ask first |
|---|---|---|
| UI | `packages/ui/`, indexed in `docs/patterns/` | Does a pattern with these states exist? |
| Layout | `packages/layout/`, one module per mode | Is this a new mode, or a hint on an existing one? |
| Behaviour | `packages/actions/` | Is this an existing action with different inputs? |
| Data | `packages/format/` | Can the current view or transcript format express it? |
| Style | `packages/tokens/` | Is there a semantic token for this purpose? |
| Tests | the nearest existing test | Can I copy a test's shape? |

If you are copying code between files, you are missing a pattern: stop and extract it.
Extending a pattern beats creating one; a new pattern needs all its states, tests and a gallery
entry before anything uses it.

## One job per file

- About 300 lines per file, functions about 50. The repo check warns over 300 and fails over 500
  unless the file says why (`verify: long-file <reason>`).
- The repo check warns on a function over 50 lines of its own (a closure's inner functions count on
  their own), unless it says why (`verify: long-function <reason>`).
- The board (`apps/board/src/board/`) is in feature folders, each with one public file (`index.ts`);
  code outside a folder imports only that, and the repo check fails on a path past it.
- A file's name says its one job. If you need "and" to describe it, split it.
- This matters doubly for AI-assisted work: small files fit in context, get read in full, and get
  edited correctly.

## Component model: core, template, element, page

Studio proved this model with its first pattern (`up-button`, draft decision D-009 there). We use
it for every pattern here, which is also what lets nodes, connectors and the canvas be shared
back with Studio.

| Layer | Holds | Runs where |
|---|---|---|
| 1. Core (`<pattern>-core.ts`) | States, variants, transitions, rules. No DOM | Anywhere, fully unit-tested |
| 2. Template (`<pattern>-template.ts`) | One pure function from state to markup and styles, tokens only | Anywhere |
| 2. Element (`vb-<pattern>.ts`) | A plain web component: reads attributes, renders from the template, updates in place | Browser only |
| 3. Page (`apps/board/`) | The framework arranges elements into the app | The app |

- **One template, two render paths.** The server and the element build the same markup from the
  same template, and a test checks they match.
- **Update in place.** After the first render, an element changes attributes, not innerHTML, so
  focus and state survive. Architect re-rendered everything on every change; with per-node
  buttons that loses focus, so we don't.
- **A pattern describes itself** in `pattern.json`: name, tag, states, attributes, events, when to
  use, when not to use, accessibility. The pattern index is generated from these files, never
  written by hand, so "does this already exist?" always has a true answer.
- **No dependencies in patterns.** Only the tokens, loaded once by the host page.

## Design tokens and contrast

- Tokens are the only source of colour, type, spacing, radius and motion. Colour literals exist
  in one file (`packages/tokens/src/tokens.css`); everything else reads semantic tokens (what a colour is *for*).
- Each colour is one `light-dark(<light>, <dark>)` value, so the themes can't drift.
- **APCA contrast in three tiers**, in light and dark, measured with APCA-W3 0.0.98G-4g: Lc 60
  for reading text (body, muted, white on a button fill), Lc 45 for short coloured labels (links,
  headings, status words, inline code), Lc 30 for decoration (icons, focus rings, connectors).
  Body text (`--text`) carries no hue. One Lc 60 bar for everything proved too strict for short
  coloured labels in sibling apps, and WCAG 2 passes saturated colours on dark that still read
  poorly, so WCAG 2 contrast is not a gate (D-009). Every foreground/background pair is listed,
  with its tier, and checked by the tests; a pair under its bar is reported, never shipped
  quietly. Under a host, the colours a host gives replace the tokens they feed, and their pairs
  are the host's promise (D-094). The maintainer may overrule a tier by eye, recorded as a decision.
- A failing colour is fixed in its token, by lightness within the same hue, never per screen.
- Vision Board needs its own semantic groups on top of Studio's: item states, regions,
  connectors, note pins, and change highlights (new, changed, removed).

## Every state, designed

A thing isn't designed until every state is:

- **Controls**: idle, hover, focus, pressed, loading, success, error, disabled.
- **Data views**: loading, empty, error, partial, stale.
- **Items on the board**: open, checked (✓), crossed (✗), commented, saved for later, answered; plus new and changed since the last version.

States are part of the pattern, so any screen that reuses the pattern gets them for free.

## One action layer, shared by people and agents

Every action is declared once: its inputs, whether a person must do it, and the transcript
record it writes. A button, a keyboard shortcut and an outside agent all call the same action, so
checks and records happen in one place. A call runs the same way whoever makes it:

1. A caller (button, shortcut, agent, later a WebMCP tool) invokes the action.
2. The action checks the caller may do it. Decisions (✓, ✗, approve) belong to the
   person; an agent can propose them, never make them.
3. The action goes through the one I/O layer.
4. A transcript record is written, including who acted.

WebMCP (a draft web standard for pages to offer tools to agents in the browser) has exactly this
shape. When we adopt it, it is a thin adapter over an allow-listed set of actions, so only the
adapter changes when the draft does.

## The contract comes first

- The view file and the transcript are the contract between the agent and the board. Both have a
  versioned JSON Schema in `packages/format/`, and the types, the validator, the fixtures and the
  docs all come from it.
- If the board needs to show or record something the format can't express, the format changes
  first, then the UI. Never smuggle data through a free-text field.
- **Mock the data, not the screens.** Fixture boards in the exact schema drive the gallery, tests
  and demos, so there is one code path.
- **Validate at both ends.** Architect's best idea was checking every plan before a person saw it
  and feeding problems back to the model. Here the agent runs the same validator before writing a
  view, and the board validates again on read.

## Board-specific principles

These are new to Vision Board, drawn from the vision and from what Architect got right and wrong.

- **The agent describes, the engine places.** View files hold meaning (nodes, links, regions,
  modes, hints), never coordinates. Layout is a pure, deterministic function, so the same view
  always draws the same picture and layout can be unit-tested without a browser.
- **Stable identity.** Ids and item numbers are given once per session and kept across every
  version. Architect numbered notes by array position, so removing one renumbered the rest;
  "item 47" must never move.
- **Edit, don't redraw.** Each new view keeps the ids of what didn't change (Architect's prompt
  rule 7), so the diff shows only real changes and the person re-reads only those.
- **Whittle down.** Decided items leave the open set; saved-for-later items park. The board's job
  is to get the open set to zero.
- **Views are immutable, the transcript is append-only.** Every version and every response is kept.
  Approving creates a new version; it never rewrites one.
- **Write the moment the person acts.** Architect held notes in memory until "send", and lost them
  on reload. Every response goes to the transcript immediately.
- **Local-first and safe.** The server is a localhost tool: sanitised ids, Origin and Host checks,
  JSON only, no third-party network calls.

## Dependencies are a cost

Every package is code we run and review for years (Cortex rule 11). Studio's scaffold needed 11
direct packages because unit tests, lint rules, flags, the pattern index, the contrast gates and a
test DOM were small enough to own.

- Build it ourselves when it is small.
- Install only what a PLAN lists, at an exact version, with install scripts off (`.npmrc`:
  `save-exact`, `ignore-scripts`). Any install script is listed and approved before it runs.
- Record every dependency in `docs/specification/dependencies.md` in the same change.
- One package manager, npm, and one package scope: the root `package.json` (D-059). Modules are
  folders named in its `imports` map, never npm packages.
- No lint framework: repo rules are our own zero-dependency checks (`scripts/verify.mjs`: file
  length, colour literals outside the tokens, I/O outside its layer, exact versions, the register),
  plus Prettier. Unit tests use Node's built-in runner.

## Tests and quality

- **Unit tests** for logic: every core, every layout mode, every action, the validator.
- **Schema tests**: every fixture validates; the code reads and writes only valid files.
- **Page tests** open every route in light and dark and fail on console errors, failed requests,
  accessibility violations (axe) or unexpected visual change.
- **Bug fixes start with a failing test.**
- **Done means**: all states, accessibility and contrast pass, tests, a gallery entry, a look in a
  browser in light and dark as the person sees it, and a design critique. Fewer, excellent things
  over many adequate ones.
- **New behaviour ships behind a flag** (`packages/format/src/flags.ts`).

## Sharing with nclite and Uplynk Studio

- Keep the same folder shapes and file conventions as Studio so changes can be compared and moved
  across; nclite's plugin contract governs how the board is hosted (§ The board is a plugin).
- Tokens and patterns use a neutral prefix (`--vb-`, `vb-`); modules are imported by name
  (§ Architecture we adopt). Parameterise prefixes in shared scripts rather than hard-coding them.
- Anything likely to be shared (canvas, node, connector, note, layout) is a framework-free core
  plus a plain web component, per the component model above.
- When a pattern stabilises in both projects, extract it into a shared package; until then, copy
  deliberately and note the source.

## Lessons from the Architect prototype

Kept: the fixed building-block vocabulary with a validator and generated index; measure, then lay
out, then position; live updates when view files change; versions with change highlights; the
Confirm-these list; Approve as a new immutable version.

Not carried forward: one large file with global state; full re-render on every change; notes held
only in memory; numbering by position; connectors that pass through cards; ids used in file paths
without sanitising; a server that accepts requests from any web page; fonts loaded from the
network; the app running the model itself.
