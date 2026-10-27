# Architect extract: what to bring into Vision Board

Extracted 2026-10-02 from `prototypes/architect/app/index.html` (identical to
`~/WORK/uplynk-studio/prototypes/architect/app/index.html`). Reference only: we port the
behaviour and the look into our patterns, not the code (project rules, "Prototypes are
reference"). Kept with the board v3 design (D-024); delete once board v3 has absorbed it.

| File | What it holds |
|---|---|
| `architect.css` | The whole stylesheet, verbatim: palette (light + dark), shell, canvas, card recipe, flags, chips, pins, selection bar, note popover, lasso, composer chips, conversation panel |
| `interactions.js` | Icons, annotations and pins, selection, pan/zoom/fit, selection bar, note popover, pointer and keyboard handling, composer chips |
| `rendering.js` | Card markup (`cardHTML`) and the conversation panel with per-version change chips (`renderConversation`) |
| `markup.html` | The page skeleton: top bar, stage layers, dock and composer, side panel |

## 1. The look (source: `architect.css`)

1. **Palette.** Dark-first. Ground `#111112`, surfaces `#1A1A1C / #222225 / #2C2C30`, lines
   `#2A2A2E / #3A3A40`, ink `#EDEDEF / #C7C7CC`, muted `#94949C`. Accent pink `#FF5CBE` dark,
   `#D4138A` light (brand `#FB1FA7`). Five family colours: content blue, remix amber, live orange,
   channels teal, monitor violet. Each has a light and a dark value. Selector: `:root`, the
   `prefers-color-scheme` block and `[data-theme="dark"]`.
2. **Canvas.** Dot grid: `radial-gradient(var(--dot) 1.2px, transparent 1.3px)` on the ground,
   22px, scaled with zoom (`applyView`). Band labels (IN / MAKE / OUT) in letter-spaced mono with
   a hairline under each.
3. **Card recipe** (`.card`, the part that makes it look right). Each card sets one colour, `--fc`:
   - border: `--fc` 38% mixed into `--line`
   - fill: 170° gradient from `--fc` 9% into `--surface`, back to plain surface by 55%
   - a 1.5px hairline of `--fc` at 75% along the top edge, inset 18px each side (`::before`)
   - icon tile 34px, radius 10, `--fc` 16% fill, icon in `--fc`
   - kicker (uppercase 10.5px, tracking .07em) and sub-label (12.5px/600) both in `--fc`
   - title 14.5px/600 display font
   - radius 14, soft two-layer shadow; hover strengthens the border to 70%
   - selected: accent border plus a 3px accent ring at 28%
4. **Flags.** `NEW` = accent fill, top-right, overlapping the top edge by 10px. `CHANGED` = warn
   fill. Entry animations: pop-in for new cards, a small nudge for changed ones, wires drawn in.
5. **Chips.** Pills on `--surface-2`. Attachment chips use accent at 12% with accent text.
6. **Glass overlays.** Selection bar, banner and toast: surface at 72% with
   `backdrop-filter: blur(16px)`, a strong line border and a large shadow.

## 2. Interactions (source: `interactions.js`)

7. **Select.** Click a card to select it. Shift, Cmd or Ctrl-click adds or removes a card.
   Clicking empty canvas clears the selection.
8. **Lasso.** Dragging on empty canvas draws a dashed accent box. On release, every card the box
   touches is selected, and a note opens for that area. The area is kept and drawn as a dashed
   accent rectangle (`.region`).
9. **Selection bar.** A glass bar floats above the selection's bounding box: "N selected · Add
   note".
10. **Note popover.** Opens beside the selection, not over it: to the right, else to the left,
    else below (`positionPop`). It says what it is on ("Note on Live signal, Transcode"). Enter
    saves, Shift+Enter adds a new line, Esc cancels. An existing note shows Remove.
11. **Pins.** Each saved note gets a numbered pin at the top-right corner of its cards, or the
    top-left of its area. Clicking a pin reopens that note for editing.
12. **Notes become chips in the composer.** The composer shows "NOTES ①text ×" and "SELECTED
    names ×". The chip's × removes the note. Sending carries the notes (with their target nodes
    and area) plus the message. After sending, the notes and selection clear.
13. **Keyboard.** Space+drag pans, F fits, N opens a note on the selection, Esc closes the note or
    clears the selection, and double-click opens a note on one card.
14. **View.** Wheel pans, Ctrl/Cmd+wheel zooms at the cursor (0.25–2.2), and there are zoom
    buttons (−, fit, +). Fit leaves room for the dock.
15. **Busy state.** While the agent works, an accent shimmer sweeps across the stage and a banner
    shows elapsed time. Editing is locked.
16. **Versions.** Viewing an older version locks editing, with a "go to latest" banner. Version
    chips (v1, v2) appear in the conversation, and the approved version has a green underline.

## 3. Conversation panel (source: `rendering.js`)

17. "You" messages sit on the accent-soft fill, indented. They list the numbered notes, each with
    "on <targets>".
18. "Claude" messages carry the time taken, a version chip, the reply, and change chips: green
    `+ added`, amber `~ changed`, red `− removed`.
19. When drafts failed the rules before one passed, a collapsed "N drafts broke the rules, fixed
    before saving" lists the problems.

## 4. How each maps into Vision Board

| Architect | Vision Board home | Change needed |
|---|---|---|
| Palette and family colours | `packages/tokens` (protected; needs a yes) | Kinds take the family colours (below); every pair checked against the APCA tiers (D-009) |
| Card recipe | `<vb-node>` (D-015), one recipe in the node pattern | Driven by the node-type registry; states added (Architect had none) |
| NEW / CHANGED flags | Seen (D-018) | Derived from the ledger versions the person hasn't seen |
| Select, multi-select, lasso | Stage 3 | Same gestures. Keyboard alternative per rule 5: arrow keys move focus, Space selects, then C or N to note |
| Note popover beside the card | Stage 2, notes | Saved as ledger `act` events (D-017), editable and removable, not kept in memory |
| Area notes (lasso region) | Container notes | Our containers are real regions (D-011); a free lasso area stays a note target |
| Pins | Notes pattern | Number = note order in the current Send; the node keeps its own number |
| Composer chips | Chat panel, Stage 6 | Chips reference node numbers |
| Busy shimmer, banner | App shell states (rule 4) | Same |
| Change chips per version | Conversation panel and the decision flow mode (D-021) | Read from the ledger |
| Dot grid, zoom, fit | `apps/board/src/board/canvas/viewport.ts` | Ours already pans and zooms; add the scaled dot grid |
| Google Fonts (Figtree, Bricolage Grotesque, Plex Mono) | Not allowed (rule 18) | Self-host (all three are OFL-licensed) with a decision entry, or stay on system fonts |

Kind → family colour proposal: question = content blue, finding = channels teal,
decision = accent pink, risk = live orange, action = remix amber, topic = monitor violet,
note = muted.
