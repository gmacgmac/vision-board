# Host Fixes and SVG Images - Plan

> **Status Doc**: [TASK-STATUS.md](./TASK-STATUS.md)  
> **Created**: 2026-10-27

---

## Problem Statement

Two findings from the tidy-up's review (VERIFY_01 F1 and F2) block hosting the board in nclite: a key
pressed anywhere on the host's page reaches the board, and closing the board loses a half-written
note without asking. Separately, cards show png, jpeg, webp and gif but not SVG, so an agent can't
show a diagram that scales or a small CSS animation.

---

## Current State

- **Keys (tracker M10):** `apps/board/src/board/input/keys.ts` `bindKeys` listens on `document`.
  `route` returns early only when the key's target is inside *another* `.vb-board`, so a key whose
  target is outside every board (a host button, the host's composer if it doesn't stop the key)
  reaches every mounted board. Shown by VERIFY_01: H on a host button hid answered cards on both
  boards. `input/wiring.ts` passes the root (`stage.closest('.vb-board')`).
- **Unsaved words (tracker M11):** `apps/board/src/board/mount.ts` `unmount` calls `stop` →
  `board.destroy()` with no check. The board's own rule (`notes/note-discard.ts`: `mayLeave`,
  `DISCARD_ASK`) is that changed words are never lost silently, but that rule covers only the board's
  own moves (Esc, Cancel, another bubble). nclite's draft says `unmount()` saves anything being
  written (`~/ai/nclite/docs/plugins.md` § The view and its host, `PluginView`). The standalone page
  doesn't guard a tab close either.
- **SVG:** `packages/format/src/images.ts` `IMAGE_LIMITS.types` lists png, jpeg, webp, gif; the
  comment says "svg is not here on purpose: it can carry script". D-048 rejected svg for that reason.
  The server (`apps/board/server/images.ts`) checks each file's first bytes against `magic`; SVG is
  text and has none. Cards draw images as one fixed `<img>` (`packages/ui/src/markdown/image.ts`), and
  the zoomed view also uses an `<img>` (`packages/ui/src/image-view/vb-image-view.ts`). App cards
  (D-047) already run an agent's HTML, CSS and JS in a sandboxed frame.

---

## Proposed Solution

### Key Changes

1. **Keys stay inside the board (M10_01).** Under a host, the board takes a key only when its target
   is inside the board's root. The standalone page keeps page-wide shortcuts because it is the board's
   own page (it has `host.page`). Clicking the board's empty canvas must still put focus inside the
   root, so the keys keep working after a click.
2. **The host asks before words are lost (M11_01).** The maintainer's choice (2026-10-27): the board
   tells the host it holds unsaved words, and the host asks first. `BoardView` gains:
   - `unsaved(): boolean`: true while a note has changed, unsent words; synchronous, so a host can use
     it in a `beforeunload` handler;
   - `leave(): Promise<boolean>`: resolves true at once when nothing is unsaved; otherwise it asks
     through `host.confirm` with the board's discard words (`note-discard.ts` `DISCARD_ASK`, reused,
     not copied). Cancel puts focus back in the text and resolves false.
   `unmount()` itself stays a plain teardown: a host calls `leave()` first. The standalone page is the
   first host to use it: behind a new flag, a tab close with unsaved words gets the browser's own
   "Leave site?" prompt. This is a difference from nclite's draft (unmount saves) and goes in the reply.
3. **SVG images, inert (SVG_01).** SVG joins the image types for pictures and CSS animation only:
   - shown only through `<img>`, where a browser runs no script and loads nothing from outside;
   - served with a response policy that sandboxes it and allows no script, so opening the file's
     address directly can't run anything on the board's origin;
   - checked as SVG by content (an SVG root element), since it has no magic bytes;
   - sized from its `viewBox` or `width`/`height`, never left to the browser's 300 × 150 default;
   - behind a new flag, with a new decision entry that amends D-048 (the maintainer's yes first).
   SVG with script stays in app cards (D-047); the agent's skill says so.
4. **Verification (VERIFY_01).** A fake host round on a page with host controls; the planted cases;
   the full gates.

### How this meets the principles (`docs/principles.md`, `cortex-architecture`)

| Piece | Reuses | Contract first | Words home |
|---|---|---|---|
| M10 keys | `input/keys.ts` `route`, `bindKeys`; `host.ts` `BoardPage` as the "own page" signal | none new: `BoardHost` unchanged; components.md § The board's host interface corrected | none expected |
| M11 leave | `notes/note-discard.ts` `mayLeave`, `DISCARD_ASK`; `host.confirm`; `BoardView` in `host.ts` | `BoardView.unsaved`, `BoardView.leave` in `host.ts`, then code | `apps/board/src/board/words/confirm.ts` (existing words) |
| SVG | `IMAGE_LIMITS` table, `imagePathProblem`, `imageTypeOf`, the image route, `vb-md-img`, `vb-image-view` | `IMAGE_LIMITS.types.svg` (the one table), then the route and renderer that read it | `IMAGE_WORDS` in `#format` images.ts (its home today) |

No new registry rows. New flags go in `packages/format/src/flags.ts`.

---

## Dependencies

- M10_01 and SVG_01 share no files: Wave 1, in parallel.
- M11_01 changes `host.ts`, `mount.ts` and components.md § The board's host interface, which M10_01
  touches too: Wave 2, after M10_01.
- VERIFY_01 runs last, Wave 3.
- No new packages.

---

## House Rules

- **Branch:** the set runs in a worktree on a branch from `refactor/tidy` (the tidy-up), or from
  `main` once the tidy-up is merged.
- **Orchestrator-only files:** `docs/decisions.md` (the new entry, appended with the maintainer's
  yes), `cortex-tasks/tracker.md`, `cortex-tasks/project/2026-10-26_project-tooling_tidy-up/nclite-contract-reply.md`,
  `package.json` and the lockfile, `tests/pages/__screenshots__/` changes that a task did not expect.
  A task lists what it needs there under `REQUESTS`.
- **Protected (maintainer's yes):** `docs/principles.md`, the steering file, the design tokens, existing
  decision entries.
- **Commits:** sub-agents never commit. The orchestrator commits and tags `host-svg/wave-N` after
  each wave's gate.
- **Tests (rule 12 of the tidy-up):** a task runs unit tests plus the page specs for what it changed;
  the orchestrator runs the full page suite once per wave gate. A bug fix starts with the failing test.
- **Ports:** never 4466. M10_01 `VB_TEST_PORT=5100`, SVG_01 5200, M11_01 5300, VERIFY_01 5400;
  the gate 4710.
- **Project checks:** `npm test`, `npm run check`, `node scripts/gen-api.mjs --check`, `npm run verify`.
  New behaviour behind a flag. Every new sentence in a words file. Done means every state, light and
  dark, contrast and accessibility, a gallery entry where there is a pattern, tests.

---

## Out of Scope

- Script in an SVG image, or an SVG shown any way other than `<img>` (inline in the card's markup,
  `<object>`, `<iframe>`). An SVG that needs script is an app card.
- Saving a half-written note as a draft on close (the maintainer chose "ask first").
- The other plugin gaps from the review: card images and `host.settings` (M12), the saved view
  (M13), the `#board` import name (M14), the bot's tools (M15), and the board's own controls (M8).
- Pointer and wheel listeners: this set is about keys. A pointer leak found on the way is reported,
  not fixed.
- Search (tracker M7): next, after this set.

---

## Risks & Considerations

| Risk | Mitigation |
|------|------------|
| Under a host, a click on the board's canvas leaves focus on the host's `body`, so no shortcut works after the fix | M10_01 proves a click on the canvas focuses inside the root (`mount.ts` makes the root focusable with `tabIndex = -1`) and that no pointer handler blocks it; a page test presses a key after a click |
| Esc meant for a host dialog or menu closes the board's bubble, or the other way round | Esc follows the same rule as every key: only inside the root under a host |
| The zoomed image view is a modal dialog outside the root | `route` already ignores keys in a `dialog`; a modal dialog's Esc is the browser's. M10_01 checks it still closes |
| A host closes the pane without calling `leave()` | `unmount` keeps today's teardown; components.md and the nclite reply say a host calls `leave()` first. Nothing the board can do once the host tears it down |
| `beforeunload` prompts annoy when nothing is unsaved | It is added only while `unsaved()` is true, behind a flag |
| An SVG opened at its own address runs script on the board's origin | The SVG response carries its own policy: a sandbox and no script. A test fetches one with a `<script>` and checks the headers |
| An SVG with no size draws at the browser's 300 × 150 or 0 × 0 and jolts the layout | Sizing comes from `viewBox` or `width`/`height`; one with neither is refused, with words saying why |
| An endless animation fails WCAG 2.2.2 (pause, stop, hide) and ignores reduced motion | SVG_01 brings a proposal to the maintainer before building it (see its step 1); at minimum `prefers-reduced-motion` is honoured where the browser applies it to SVG images, and the skill tells agents to write animations that stop or respect it |
| A large animated SVG on a 1,000-card board costs frames | The performance budget specs run at the gate; SVG_01 measures one board with many animated SVGs |
| Size cap: an 8 MB SVG is a lot of text to parse | SVG_01 proposes its own cap in `IMAGE_LIMITS` |

---

## References

- `docs/principles.md` § The board is a plugin, § Every state, designed, § One action layer
- `docs/decisions.md` D-023 (Markdown, no raw HTML), D-047 (app cards), D-048 (images), D-061 (CSS scope), D-063 (words homes)
- `docs/specification/components.md` § The board's host interface
- `docs/specification/images.md`
- `cortex-tasks/project/2026-10-26_project-tooling_tidy-up/VERIFY_01_findings.md` F1, F2
- `cortex-tasks/project/2026-10-26_project-tooling_tidy-up/nclite-contract-reply.md`
- `~/ai/nclite/docs/plugins.md` (read only) § The view and its host
- `apps/board/src/board/input/keys.ts`, `input/wiring.ts`, `mount.ts`, `host.ts`, `notes/note-discard.ts`, `notes/notes.ts`
- `apps/board/src/shell/page-host.ts`
- `packages/format/src/images.ts`, `apps/board/server/images.ts`, `apps/board/server/app.ts` (`SECURITY_HEADERS`)
- `packages/ui/src/markdown/image.ts`, `packages/ui/src/image-view/`, `apps/board/src/board/cards/card-images.ts`
- `skills/vision-board/SKILL.md` § Images in cards
- `tests/pages/board-host.spec.ts`, `tests/pages/board-host-fixture.ts`

---

## Success Criteria

- [ ] Under a host, a key pressed on a host control (button, input, the page body) reaches no board;
      a key pressed inside a board reaches that board only; after a click on a board's canvas, its
      shortcuts work
- [ ] The standalone page's shortcuts work exactly as before (no page spec changes its expectations)
- [ ] `BoardView.unsaved()` and `BoardView.leave()` exist, are documented in components.md and the
      nclite reply, and a fake host's Close asks before an unsaved note is lost; Cancel keeps the words
      and puts focus back in the text
- [ ] The standalone page, with its flag on, prompts on a tab close only while words are unsaved
- [ ] An SVG in `.visionboard/images/` draws in a card and in the zoomed view, its CSS animation
      plays, its script never runs (in the card, the zoomed view, or opened at its own address), and
      an SVG with no size or an external reference is handled as the decision says
- [ ] The new decision entry is appended with the maintainer's yes; the skill's Images section and
      `IMAGE_WORDS.type` name svg
- [ ] Every state in the gallery, light and dark; contrast and accessibility pass
- [ ] `npm test`, `npm run check`, `gen --check`, `npm run verify` and the full page suite pass
