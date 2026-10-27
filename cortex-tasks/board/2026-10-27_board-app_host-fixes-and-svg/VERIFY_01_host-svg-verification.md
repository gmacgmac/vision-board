# VERIFY_01_host-svg-verification: Verification

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md)  
> **Plan**: [PLAN.md](./PLAN.md)

---

## Objective

Show, with evidence, that PLAN.md's success criteria hold: keys stay inside the board under a host,
a host asks before a note's words are lost, and SVG images draw and animate without ever running
script. List exactly what doesn't hold.

---

## Context

Review as someone about to host the board in nclite, with no history of these changes. A criterion
is met when the code and a test show it, not when a doc says so. You change no code. Problems become
findings, each with a proposed tracker row or a request.

**Read every task's notes in TASK-STATUS.md before starting.**

---

## Inputs

- **Files to modify**: this task file's notes; a findings file `VERIFY_01_findings.md` in this folder
- **Files to reference**: PLAN.md, every task's notes, `docs/principles.md` § The board is a plugin,
  `docs/specification/components.md` § The board's host interface, `docs/specification/images.md`,
  `~/ai/nclite/docs/plugins.md` (read only), the decision entry SVG_01 drafted (in `docs/decisions.md`
  if the maintainer has approved it)
- **Skills**: `cortex-architecture`, `cortex-docs` (the doc audit)

---

## Steps

1. [x] **Keys, as a host would see them** (a scratch page from `tests/pages/board-host-fixture.ts`,
   `VB_TEST_PORT=5400`): two boards and host controls (a button, a text input, a `contenteditable`, a
   host `<dialog>`). Press every board shortcut (`commands.ts`, `ACTIONS` with keys, Esc, digits, J/K,
   arrows, Alt+arrows, Shift combinations) with focus on each host control: no board acts. Press each
   inside board A: only A acts. Click A's canvas, then press a key: A acts. The standalone page: the
   key specs pass, and a key with focus on `body` still works there.
2. [x] **Leaving, as a host would see it**: a dirty note, then the host's Close (`leave()` then
   `unmount()`): asked once; Cancel keeps the words and focus; OK unmounts and leaves nothing. A host
   that calls `unmount()` without `leave()`: say what happens and whether components.md warns it. The
   standalone page with the flag on: a tab close with unsaved words prompts; with saved words it
   doesn't; with the flag off it never does.
3. [x] **SVG, trying to break it**: an SVG with `<script>`, an `onload` attribute, a `<foreignObject>`
   holding HTML, an outside `<image href="https://…">`, a CSS `@import` of an outside sheet, an
   `<a href="javascript:…">`, a huge file, a file named `.svg` holding HTML, one with no size, one
   with a `<!DOCTYPE>` declaring entities (an entity expansion bomb). For each: what the card shows,
   what the zoomed view shows, what opening its address directly does, and the network log. Every
   result as the decision says, and no script or outside request anywhere.
4. [x] **SVG, as a person sees it**: a static and an animated SVG in a card and zoomed, light and dark,
   at three zooms; reduced motion as the decision says; the refused one's "not shown" words read well.
5. [x] **Against nclite's contract**: is "A view stays inside its root" now true for keys? Does the
   `leave()` difference read clearly in the reply? Anything new to tell nclite?
6. [x] **Full gates**: `npm test`, `npm run check`, `npm run verify`, `node scripts/gen-api.mjs --check`.
   The full page suite is the orchestrator's, at the gate (rule 12).
7. [x] **Doc audit** (`cortex-docs`): components.md, images.md, the skill's Images section, flags'
   descriptions: each claim still names a symbol and a test that hold it.

---

## Validation

- [x] Every PLAN.md success criterion ticked with its evidence, or listed open with a proposed
      tracker row

---

## Implementation Notes

_To be completed by agent after task completion._
_Re-run? Add a `### Run N` block below the last one; never overwrite an earlier run._

**Status**: Completed  
**Completed**: 2026-10-27 18:40  

### Changes Made
- `VERIFY_01_findings.md`: every PLAN.md criterion with its evidence (all met, the full page suite
  is the orchestrator's), the planted-svg table, findings F1–F6 each with a proposed tracker row or
  request. No product or test code changed.
- Scratch probes in `temp/verify01/` (a host page from `board-host-fixture.ts` with a button, an
  input, a `contenteditable`, a host modal `<dialog>`; keys, leave, planted svgs, the look),
  ports 5400 and 5450; deleted at the end.

### Issues & Resolutions
- Gates: unit 1758 + timing 10, `check` 0 errors, `verify` ok (13 warnings, none new), `gen-api`
  current; 78 page specs pass on 5400 (board-host, note-discard, note-folder, key-bubble, go-to-card,
  focus-ring, card-image*, card-image-svg*).
- F1: `svgProblem` misses `<!ENTITY` after a comment or PI holding `<svg `: served 200; Chromium
  refuses to decode it, so no harm seen, but D-064 point 3 and images.md say the route refuses it.
- F2: Esc, H and R act without `preventDefault`: a host's own Esc (close the pane) also fires.
- F3: `mount.ts` `reveal` does not await `switchTo`: card n is shown on the wrong board while the
  question is up.
- F4–F6: the nclite reply (tone words, a stale member list, M21's caveat, `reveal` may confirm),
  components.md (M21 unnamed), tracker M12 (name `svgImages`).

### Caught Beyond the Brief
- F2 and F3 (host edges outside the brief's steps); F6 (M12's reach).

### Deviations from Plan
- None. WebKit and Firefox not checked (SVG_01-R8); reduced motion checked only through the motion
  spec's forced flag, not a real system setting.

---

## On Completion

1. Fill in Implementation Notes above; set **Status** to `Completed`.
2. Update this task's row in [TASK-STATUS.md](./TASK-STATUS.md): your row only.
3. Append **your own** LOG entry to `cortex/LOG.md`: one line, ending in a newline, append-only.

   ```
   [[YYYY-MM-DD HH:MM]] [board-app] VERIFY_01: [what you did] → Task: [[cortex-tasks/board/2026-10-27_board-app_host-fixes-and-svg/VERIFY_01_host-svg-verification.md]]
   ```

4. Return the `cortex-task-exe` Return Contract, with every open finding in `REQUESTS`.

**Constraints**: no code changes; no PII in examples; no commits; never port 4466; never
`cortex/AUDITED.md`; no set LOG entry.
