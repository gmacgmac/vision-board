---
category: project-docs
last_updated: 2026-09-30
status: draft
scope: How Vision Board is built and why; the philosophy and conventions behind the project rules
keywords: [principles, patterns, reuse, components, tokens, actions, quality, dependencies]
---

# How we build Vision Board

The rules in `.kiro/steering/vision-board-proj.md` are short and binding. This page is the
reasoning and the conventions behind them, so a person or agent can apply them to cases the
rules don't name. It is adapted from Uplynk Studio (`docs/vision.md` § How we build,
`docs/specification/rationale.md`, `docs/specification/architecture.md`, `packages/ui/README.md`,
`packages/tokens/README.md` and the Studio Scaffold decision drafts, 2026-09-29 and 2026-09-30).

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
  in one file (`primitives.css`); everything else reads semantic tokens (what a colour is *for*).
- Each colour is one `light-dark(<light>, <dark>)` value, so the themes can't drift.
- **APCA contrast in three tiers**, in light and dark, measured with APCA-W3 0.0.98G-4g: Lc 60
  for reading text (body, muted, white on a button fill), Lc 45 for short coloured labels (links,
  headings, status words, inline code), Lc 30 for decoration (icons, focus rings, connectors).
  Body text (`--text`) carries no hue. One Lc 60 bar for everything proved too strict for short
  coloured labels in sibling apps, and WCAG 2 passes saturated colours on dark that still read
  poorly, so WCAG 2 contrast is not a gate (D-009). Every foreground/background pair is listed,
  with its tier, and checked by the tests; a pair under its bar is reported, never shipped
  quietly. The maintainer may overrule a tier by eye, recorded as a decision.
- A failing colour is fixed in its token, by lightness within the same hue, never per screen.
- Vision Board needs its own semantic groups on top of Studio's: item states, regions,
  connectors, note pins, and change highlights (new, changed, removed).

## Every state, designed

A thing isn't designed until every state is:

- **Controls**: idle, hover, focus, pressed, loading, success, error, disabled.
- **Data views**: loading, empty, error, partial, stale.
- **Items on the board**: open, acknowledged, dropped, commented, needs context, saved for later,
  decided; plus new and changed since the last version.

States are part of the pattern, so any screen that reuses the pattern gets them for free.

## One action layer, shared by people and agents

Every action is declared once: its inputs, whether a person must do it, and the transcript
record it writes. A button, a keyboard shortcut and an outside agent all call the same action, so
checks and records happen in one place. A call runs the same way whoever makes it:

1. A caller (button, shortcut, agent, later a WebMCP tool) invokes the action.
2. The action checks the caller may do it. Decisions (acknowledge, drop, approve) belong to the
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
- One package manager: npm workspaces (`apps/*`, `packages/*`).
- No lint framework: repo rules are our own zero-dependency checks (`scripts/verify.mjs`: file
  length, colour literals outside the tokens, I/O outside its layer, exact versions, the register),
  plus Prettier. Unit tests use Node's built-in runner.

## Tests and quality

- **Unit tests** for logic: every core, every layout mode, every action, the validator.
- **Schema tests**: every fixture validates; the code reads and writes only valid files.
- **Page tests** open every route in light and dark and fail on console errors, failed requests,
  accessibility violations (axe) or unexpected visual change.
- **Bug fixes start with a failing test.**
- **Done means**: all states, accessibility and contrast pass, tests, a gallery entry, and a
  design critique. Fewer, excellent things over many adequate ones.

## Sharing with Uplynk Studio

- Keep the same folder shapes and file conventions as Studio so changes can be compared and moved
  across.
- Tokens and patterns use a neutral prefix (`--vb-`, `vb-`) and package scope (`@vision-board/`).
  Parameterise prefixes in shared scripts rather than hard-coding them.
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
