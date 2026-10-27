# VERIFY_01 findings: host fixes and SVG images

> **Task**: [VERIFY_01_host-svg-verification.md](./VERIFY_01_host-svg-verification.md) · **Date**: 2026-10-27
> **Read as**: an nclite developer hosting the board in a pane for the first time.
> **Branch**: `feat/host-fixes-svg` at `cd8f2e4` (waves 1 and 2). Chromium only (WebKit and Firefox: SVG_01-R8).
> Scratch probes ran on ports 5400 and 5450 from `temp/verify01/` (deleted at the end).

## Summary

Every PLAN.md success criterion holds in code and a test, but the full page suite (the orchestrator's,
at the gate). Six findings, none blocking: one place where the svg check does not hold D-064's
entity rule (the browser still refuses the file), two host edges in keys and `reveal`, and three doc
drifts. Already routed and not repeated: M21 (Esc caught while a board menu is open), M20
(`folderMoved`), M11_01-R5, SVG_01-R8, SVG_01-R9. None of them is worse than recorded.

## Success criteria

| Criterion | Evidence | State |
|---|---|---|
| Under a host, a key pressed on a host control reaches no board; inside a board, only that board; after a click on its canvas, its shortcuts work | Probe: 35 keys (every `COMMANDS` and `ACTIONS` key, digits, J/K, arrows, Alt and Shift combinations, Space, Esc, Enter, `?`, `t`) pressed with focus on a host button, a text input, a `contenteditable`, `body`, and a button and an input in a host modal `<dialog>`: neither root changed (mutations, transform, status, host records) and the board marked no key handled; typed text landed. The same keys on a card in A: A acted, B never changed. A click on A's empty canvas from a host button, then H, F, -, J, 3: A acted, B did not. `tests/pages/board-host.spec.ts` "keys stay inside the board…" and `apps/board/tests/keys.test.ts` pass | Met (see F2) |
| The standalone page's shortcuts work exactly as before | No page spec changed a key expectation (`git diff e9349e1 HEAD -- tests/pages`); `key-bubble`, `go-to-card`, `focus-ring` specs pass; probe: with focus on `body`, `-` and `F` still act | Met |
| `unsaved()` and `leave()` exist and are documented; a fake host's Close asks; Cancel keeps words and focus | `apps/board/src/board/host.ts` `BoardView`; components.md § The board's host interface; the nclite reply's Differences row. Probe: Close with changed words asks once (two Closes while the question is up: one `confirm`, both get its answer); Cancel keeps the words, focus is in the text and typing continues; OK unmounts, root empty, classes and `tabindex` given back, B untouched, nothing left outside the roots. `board-host.spec.ts` "the host asks…", `note-leave.test.ts` pass | Met (see F3) |
| The standalone page, flag on, prompts on a tab close only while words are unsaved | `tests/pages/note-discard.spec.ts` "a tab close asks…" (unchanged, discarded, flag off: no prompt) and `note-folder.spec.ts` pass | Met |
| An SVG draws in a card and zoomed, animates, never runs script; no size and outside references handled as decided | Probe, eleven planted files (table below): no script ran and no request left the page from a card or the zoomed view; at its own address every load was blocked by `SVG_CSP` (`csp`) in an opaque origin. The pulse animates (two frames 250 ms apart differ) and rests by 2.75 s. `card-image-svg*.spec.ts` pass | Met (see F1) |
| D-064 appended; the skill's Images section and `IMAGE_WORDS.type` name svg | `docs/decisions.md` D-064 (Accepted, point 306); `skills/vision-board/SKILL.md` § Images in cards (v3.14); `packages/format/src/images.ts` `IMAGE_WORDS.type` ("only png, jpeg, webp, gif or svg") | Met |
| Every state in the gallery, light and dark; contrast and accessibility | `card-image-svg.spec.ts` "gallery: svg in a card, animated, refused…" (axe, screenshots, light and dark) passes; screenshots looked at, light and dark, at fit, 190% and 63%, and zoomed | Met |
| `npm test`, `check`, `gen --check`, `verify`; the full page suite | unit 1758 + timing 10 pass; `check` 0 errors; `verify` ok (13 warnings, none new to this set); `gen-api` current; 78 page specs pass on 5400 (host, notes, keys, svg and image specs). Full suite: the orchestrator's | Met, but the full suite |

## The planted svgs (step 3)

Each drawn as `![…](name.svg)` on a card, opened in the zoomed view where it drew, then opened at its
own address in a new tab, with a click on it there. Requests watched on both pages.

| File | Card | Zoomed | Its own address | Requests |
|---|---|---|---|---|
| `<script>` and an `onload` | drawn | opens | 200, `SVG_CSP`, opaque origin, no script | none |
| `<foreignObject>` with HTML: an `<img>`, an `<iframe>`, a `<script>` | drawn | opens | 200, `SVG_CSP`, no script, no frame | the inner `<img>`, blocked (`csp`) at its own address only |
| an outside `<image href="https://…">` and a same-origin one | drawn | opens | 200, `SVG_CSP` | both blocked (`csp`) at its own address only |
| CSS `@import` and a `fill: url(…)` | drawn | opens | 200, `SVG_CSP` | both blocked (`csp`) at its own address only |
| `<a href="javascript:…">`, clicked at its own address | drawn | opens | 200, `SVG_CSP`, nothing ran | none |
| 1.1 MB (a comment) | "Image not shown: huge.svg (over 1 MB)" | no button | 413 | none |
| HTML named `.svg` | "… (not a real svg)" | no button | 415 | none |
| no size | "… (needs a viewBox, or a width and height)" | no button | 415 | none |
| a doctype declaring entities (ten levels of ten) | "… (an svg can't declare entities)" | no button | 415 | none |
| the same, after a comment holding `<svg ` | "… (not a real svg)", after the browser refused to decode it | no button | **200**, `SVG_CSP` | none (F1) |
| two `xmlns` (not well formed) | "… (not a real svg)", the browser's refusal | no button | 200, `SVG_CSP` | none |

No page stalled: a page call right after each answered in under 5 ms. The zoomed view shows the
pulse at its last frame: one `<img>` address shares one animation, so it does not play again there.

## Findings

### F1. The entity check can be stepped round (D-064 point 3; images.md § SVG)

- **What**: `packages/format/src/images.ts` `svgProblem` looks for `<!ENTITY` only before the first
  `<svg` *anywhere* in the text (`text.search(/<svg[\s/>]/)`), not before the root that
  `SVG_OPENING` matched. A comment or processing instruction before the doctype that holds `<svg `,
  or a comment inside the doctype's internal subset, hides every `<!ENTITY` after it, and the opening
  still matches. Three inputs passed (`<!-- <svg -->`, `<?x <svg ?>`, `<!DOCTYPE svg [<!-- <svg -->…`).
- **Seen**: the route served such a file with 200 and `SVG_CSP`. Chromium refused to decode it, so
  the card said "not a real svg", not "an svg can't declare entities"; opened at its own address it
  stayed sandboxed and no page stalled. WebKit and Firefox are not checked (SVG_01-R8).
- **So**: no script, no request, and Chromium holds. But the rule an accepted decision states, and the
  images.md row "A doctype that declares entities (`<!ENTITY`) is refused", are not what the code
  does, and the cost of the expansion is left to each browser's own limits. [INFERENCE] Small fix:
  test for `<!ENTITY` in the text `SVG_OPENING` matched before its `<svg`, the same span that is
  parsed as the opening.
- **Proposed tracker row (M22)**: *The svg entity check reads the opening it matched.* Problem:
  `svgProblem` finds `<!ENTITY` only before the first `<svg` text, so a comment holding `<svg ` hides
  it. Example: `<!-- <svg --><!DOCTYPE svg [<!ENTITY …>]><svg …>` is served 200. Solution: look
  within the matched opening; three rows in `packages/format/tests/images-svg.test.ts`. Or do it in
  this set: one line and three test rows, owned by SVG_01's files.

### F2. Keys the board acts on that reach the host unmarked

- **What**: `apps/board/src/board/input/keys.ts` `route` calls `preventDefault` for most keys it acts
  on, but not for Esc (`h.escape()`), H (`toggleHide`) or R on a card (`unpin`). Probe, focus on a
  selected card in A: Esc cleared the selection and H hid answered cards, and the host's own
  `keydown` listener saw both with `defaultPrevented` false (J and F were marked).
- **So**: a host that closes its pane on Esc, or has a single-key shortcut of its own, cannot tell
  the board already used the key: clearing a selection with Esc would also close the pane. Under a
  host the board only hears keys inside its root, so this is about keys inside the board.
- **Also**: `route`'s "typing here" test (`input, textarea, select, dialog, .vb-card-pop`) has no
  `[contenteditable]`, which the page's other two key listeners have (`shell/ChatSidebar.svelte`,
  `shell/KeyHelp.svelte`). No contenteditable is inside a board today, so nothing breaks yet.
- **Proposed tracker row (M23)**: *Every key the board uses is marked used.* Problem: Esc, H and R
  act without `preventDefault`. Example: in nclite, Esc to clear a selection also closes the pane.
  Solution: `route` marks each key it acts on (`escape()` says whether it did anything, so an Esc
  with nothing to escape stays the host's); `[contenteditable]` joins the typing test; components.md
  tells a host to skip a key whose `defaultPrevented` is true; a case in `keys.test.ts`.

### F3. `reveal` of another board's card does not wait for the question

- **What**: `apps/board/src/board/mount.ts` `reveal` calls `board.switchTo(id)` without waiting, then
  `board.go.to(n)`. Since M11_01-R3, `switchTo` first asks (`notes.leave`) while a note holds words.
- **Seen** (fake host, a pending confirm): `reveal({ board: 'elsewhere', n: 5 })` with changed words
  asked once, and while the question was up focus had already gone to card 5 *of the board still
  open*. After Cancel, focus and words came back. [INFERENCE] After OK the other board opens with
  card 5 never shown there, as `go.to` ran before the switch.
- **So**: a host's chip click that names another board's card can show the wrong card, and `reveal`
  can now raise `host.confirm`, which nclite's draft does not expect of `reveal`.
- **Proposed tracker row (M24)**: *`reveal` goes to a card after its board opens.* Problem: `reveal`
  does not wait for `switchTo`. Example: a chip for card 5 on another board, with a note being
  written, jumps to card 5 here while the host asks. Solution: `reveal` awaits `switchTo` and stops
  on false; a case in `board-host.spec.ts` with a second board in the fixture's ledger.

### F4. The nclite reply has drifted in four places

`cortex-tasks/project/2026-10-26_project-tooling_tidy-up/nclite-contract-reply.md`:
- (a) § The view's host: "`notify` takes a tone (plain or a warning)"; `host.ts` `BoardHost.notify`
  takes `'info' | 'error'` (components.md says `error` for a refusal).
- (b) § Answers 6 still lists the view as `{ unmount, pageChip, reveal }`; § The view's host has the
  five members.
- (c) "Under a host the board acts on a key only when its target is inside its root": true, but for
  Esc while a board menu or popover is open (M21). Say so until M21 lands.
- (d) New to tell nclite: `reveal` may ask through `confirm` when it switches boards with words
  unsaved (F3); and, once F2 lands, a host skips a key whose `defaultPrevented` is true.
- **Request**: the orchestrator (owns the reply): (a)–(c) now, (d) with F2 and F3.

### F5. components.md § The board's host interface: Esc's exception unnamed

- "Esc follows the same rule" with no word of M21; its list of what is left page-wide names the pan
  key's cursor and the pointer reading only. **Request**: one clause under that bullet's
  "Left page-wide" or "Not covered", citing M21 (`packages/ui/src/base/layer.ts` `dismissable`). Also
  the images.md row in F1, when F1 is fixed or reworded.

### F6. Tracker M12 should name `svgImages` too

- `packages/ui/src/markdown/image.ts` `setMarkdownSvg` is a module switch like `setMarkdownImages`
  (components.md § Feature flags): under a host, `host.settings` cannot turn svg off for the page's
  Markdown, and two boards on one page share it. The server side follows its own flags. M12 names
  only `cardImages`. **Request**: widen M12's text to "`cardImages` and `svgImages`".

## Not repeated, and how they stand

- **M21** (Esc while a board menu is open): as recorded. Probed the hover-tip path too (a tip opens on
  pointer rest and takes Esc with `escape: true`); the tip could not be opened by a scripted hover, so
  no claim either way.
- **M20**, **M11_01-R5**, **SVG_01-R9**, **SVG_01-R8**: as recorded; nothing new seen.
- Reduced motion: held by `card-image-svg-motion.spec.ts` (its own Chromium with
  `--force-prefers-reduced-motion`), which passed; not checked against a real system setting.

## For the maintainer's look (TASK-STATUS completion checklist)

Looked at here in Chromium, light and dark: the static and the animated svg card at fit, 190% and 63%,
the zoomed view, and the refused box ("Image not shown: logo.svg (needs a viewBox, or a width and
height)", which reads well and tells the agent what to fix). An agent's svg keeps its own colours in
dark: a light picture on a dark card, as any png.
