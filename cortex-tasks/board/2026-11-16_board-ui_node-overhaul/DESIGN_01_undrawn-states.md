# DESIGN_01_undrawn-states: The States Nobody Drew

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md)  
> **Plan**: [PLAN.md](./PLAN.md)

---

## Objective

Give every state of today's node that the mockups never drew a place on the new node, in both skins, as pages the
maintainer can open and agree before the node is built.

---

## Context

The chosen designs (`design/mockups/node-skins/`) show: at rest, bookmarked, notes, updates, New, waiting, ticked,
crossed, selected, agent replied, the number menu, history, right-click, a narrow node. Today's node has more
(`packages/ui/src/node/pattern.json`, `CODE-MAP.md` § 1). This is a design task: you write mockup pages only. The
settled rules in PLAN.md § Decisions are not reopened; you only place what is missing.

**Read previous task notes in TASK-STATUS.md before starting.**

---

## Inputs

- **Files to modify**: `design/mockups/node-states/` (new), `design/README.md` (one row for the new folder)
- **Files to reference**: `design/mockups/node-skins/*.html` (copy their styles: these pages are the look);
  `packages/ui/src/node/pattern.json` (every state and part the node has today); `packages/ui/src/node/node-template.ts`
  (`bottomTabs`, `proposalsMarkup`, `handoverMarkup`, `tabs`); `docs/specification/components.md`
- **Patterns to follow**: each page is standalone HTML and CSS like the pages in `node-skins/`, with a dark and a
  light version; no script needed; keep each file under 300 lines or split it

> Modify only the files this task owns. Need a change elsewhere? List it under `REQUESTS`.

---

## Steps

1. [x] List every state, part and tab of today's node from `pattern.json` and the template. Mark each as drawn in
       `node-skins/` or not. Put the list in your notes.
2. [x] For each undrawn one, place it on the new node in both skins. At least: a proposal waiting (the agent
       proposes a tick or a cross; the person accepts or rejects), the handover box and "Awaiting", saved for later
       (the node in the Later container, and how to bring it back), moved by you (today's ◆), a board that is locked
       or read-only (marks that can't be pressed), a write that failed (a mark shows its error until the next
       press), the "N updates" stepper inside the history box, tags, emphasis, a node being dragged, keyboard focus
       on the node and on each mark, hover on each mark, and an app node's states.
3. [x] Start from PLAN.md § Planner's calls 6 and 9 (tabs stay on the bottom border between the badge and the notes
       mark; history holds the stepper). Where a state has two honest answers, draw both side by side and say which
       you recommend and what the other costs. Never more than three.
4. [x] Hold the rules: nothing on a node at rest is a control except its edge marks; the disc, the icon tile and
       the notes mark share one vertical line; a mark's hit area is at least 24 px; colour is never the only signal.
5. [x] Render every page in dark and light (Playwright is in `node_modules`; write screenshots to `temp/`), look
       at each one, and fix what is misaligned, clipped or unreadable before you finish.
6. [x] Write `design/mockups/node-states/README.md`: one line per state saying where it sits and why, and a short
       list of the choices that need the maintainer's answer.

---

## Validation

- [x] Every state in step 1's list is drawn or named as unchanged, in both skins, dark and light
- [x] The pages open from the file system with no network (fonts fall back) and no console error
- [x] `npm run verify` passes (the new files are within its length rules)
- [x] Your return block lists the open choices; the orchestrator takes them to the maintainer before FE_01 (wave 4)

---

## Constraints

- If you need to deviate, stop and tell the maintainer; no breaking change is made silently.
- No PII in examples. Interim files in `temp/`. Writes over 50 lines in chunks.
- No git command that changes state; the orchestrator commits.
- Every flag this set adds stays off by default; existing tests and screenshots pass with them off.
- A problem outside this task is reported (`REQUESTS`, `NOTES`), never fixed here.

---

## Implementation Notes

_To be completed by agent after task completion._
_Re-run? Add a `### Run N` block below the last one; never overwrite an earlier run._

**Status**: Completed  
**Completed**: 2026-11-16 10:45  

### Changes Made
- `design/mockups/node-states/`: 16 pages (`default-` and `command-lens-` `answers`, `places`, `input`, `app`, each
  `-dark` and `-light`), four shared stylesheets (`default.css` and `command-lens.css` copy the skins pages' styles,
  then add the states; `default-app.css`, `command-lens-app.css` the window), and `README.md`: the step 1 list (every
  state, part and attribute of `pattern.json` with where it now sits, or "unchanged" / "retires"), the rules the
  drawings hold, and the open choices.
- `design/README.md`: one row for `node-states/`.
- Kickoff changes drawn: Ask now node-scoped (queued note, sent and waiting, reply arrived, failed); an agent's own
  icon in the tile with its drawing rules; nothing designed around the old footer.

### Issues & Resolutions
- Command Lens's own styles named `.wr` (the "Agent writing" mark); the app bar's reason first reused it. Renamed to
  `.wrs`.
- App names in a crowded bar did not cut with "…" (an inline-flex parent); wrapped in `.nm`.
- A label wrapping the reply field hid it in Command Lens (the label is visually hidden); the field now carries
  `aria-label`.
- Checks: every page rendered in Chromium (Playwright from `node_modules`) dark and light, screenshots in
  `temp/node-states-shots/`, looked at and fixed (tips over captions, a read-only number stacking, missing switches,
  a crowded app bar). No console error and no network request on any page. `npm run verify` ok (it does not scan
  `design/`; every file there is under 300 lines).

### Caught Beyond the Brief
- The architecture page's pink "Captions" chip breaks DD-14 (pink only for notes and buttons); today's drop look is
  pink too. Drawn grey and ink here.
- The Command Lens page shows "A risk can ask too", but `NODE_TYPES.risk` only tells
  (`packages/format/src/node-types.ts`). Either the drawing or the contract is wrong: for T_01 and the maintainer.
- Command Lens's skin page never drew the conversation box, history or right-click; FE_04 needs them (drawn here).
- The marks drawn 22 px tall (number, badge, notes, tabs) are under the 24 px hit-area rule as drawn; the README asks
  for a transparent edge so the look stays.
- With the footer gone, the state word ("Replied", "Saved for later", "Awaiting") leaves the face; "Replied" lives on
  only in the name and as the notes mark's waiting dots. Worth a line in the words and accessibility specs.
- No state was drawn for Ask now with no agent attached, nor for whether Ask now takes the node's queued notes:
  choices 6 and 7.
- A past version of the board: the conversation opens read-only ("Read conversation"), as on a locked board.

### Deviations from Plan
- None. Pages link shared stylesheets in the same folder (still standalone, no network) rather than repeating
  ~250 lines of CSS in 16 files; the light pages are the dark pages with the `light` class, as in `node-skins/`.

### Run 2

**Status**: Completed  
**Completed**: 2026-11-17

#### Changes Made
- Redrew all 16 pages in `design/mockups/node-states/` to the maintainer's review (PLAN.md § "Design review of
  DESIGN_01", point 328). Each state now has one design, the decided one, with a one-line caption saying what it is and
  how it behaves. The alternative columns and the rulings' dropped rows (the moved-by-you mark, the amber out-of-date
  state) are gone, so the pages are shorter. Every file is under 300 lines; the largest is `default.css` at 262.
- Drew the rulings:
  - Proposal: the box opens beside the disc in the conversation-box style. Command Lens: the plate chip plus the
    outlined half, with the same box beside the node.
  - Withdrawn proposal: the disc goes back to waiting, and history gets "Proposal withdrawn: the node changed".
  - Handover: Awaiting is a quiet grey tab or chip; an arrived handover is a "Handover" section in the body.
  - Failed write: the tip shows by itself, then the mark keeps "!" and the tip comes back on hover, in the softened
    red.
  - Locked and read-only: normal at rest; the pressed moment turns the disc, half or number into a lock with its
    popover.
  - Moved by you: "Moved by you · Put back" (R) in the number's menu and in right-click.
  - Tags: tinted with the node's colour.
  - Group notes: the conversation box has tabs.
  - Focus: a calmer ring, shown after Tab only.
  - Hover: no halos; a tooltip after about 2 s, or at once on keyboard focus.
  - Waiting for a reply: no dots on the notes mark.
- `README.md` was rewritten: the rulings as drawn, the error-red table, the state map and notes for the builders,
  with no open choices left. `design/README.md`: the row now says the pages follow the rulings.

#### Softened error red (a tokens.css change: T_02 shows it to the maintainer)
- Dark: `#f07474` becomes `#dc8f88`. APCA Lc is −51.3 on the surface `#1a1a1c`, −48.4 on the box `#2c2c30` (today's
  red gives −43.9 there, under the 45 tier), −51.2 / −52.2 on Command Lens's surface and plate, and −51.7 on the light
  theme's dark plate `#16171a`.
- Light: `#cc3b3b` becomes `#b2554f`. Lc is 73.3 on white, 67.4 on `#f5f5f6`, 57.5 on `#e4e4e7` and 66.7 on `#f5f4f0`.
- Every value passes Lc 45, the tier for short coloured labels. Cross's own red (`--bad`) is unchanged; the new red is
  for errors only.
- Ring colours (no tier stated by the rulings): default `#8b9bb8` / `#5a6478` (Lc −47 / 74); Command Lens `#b9bfc8` /
  `#4a4e57` (Lc −67 / 80).

#### Checks
- Every page was rendered in Chromium (Playwright from `node_modules`), dark and light, and looked at. Fresh
  screenshots are in `temp/node-states-shots/`.
- Found and fixed while looking: unclosed cells, captions that widened cells, the Command Lens proposal box landing
  under the node, missing row spacing, and a number menu covering its caption.
- No console errors and no network requests on any page. `npm run verify` is ok.

#### Caught Beyond the Brief
- Two calls the rulings leave open, drawn and named in the README:
  - Keys and right-click on a locked board answer like a press (the lock and popover show by the mark).
  - The conversation box shows a tab row only when the node is in a group note.
- Today's error red already fails Lc 45 on the dark tip box (−43.9), so the softening also fixes a contrast failure.

---

## On Completion

1. Fill in Implementation Notes above; set **Status** to `Completed`.
2. Update this task's row in [TASK-STATUS.md](./TASK-STATUS.md) — your row only.
3. Append **your own** LOG entry to `cortex/LOG.md` — one line, terminated with a newline, append-only:

   ```
   [[YYYY-MM-DD HH:MM]] [board-ui] DESIGN_01: [what you did] → Task: [[cortex-tasks/board/2026-11-16_board-ui_node-overhaul/DESIGN_01_undrawn-states.md]]
   ```

   Cite files by path + symbol, never by line number. Never write the set's entry or to `AUDITED.md`.
