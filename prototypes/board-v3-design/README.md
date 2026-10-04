# board-v3-design

The agreed visual spec for board v3 (D-024). Reference only: the build ports the look and the
behaviour into `packages/` and `apps/`, never this code. Open the pages through a local server
(`python3 -m http.server 4477 --bind 127.0.0.1` from the repo root, then
`/prototypes/board-v3-design/mockups/index.html`), since browsers block `file:` stylesheets.

- `architect-extract/`: Uplynk Architect's stylesheet, interactions and markup, copied verbatim,
  with `README.md` listing every capability and where it goes.
- `mockups/01b-cards-content-first.html`: **locked.** Cards, border tabs, footer, selection,
  open-frame containers.
- `mockups/02-mode-picker.html`, `03-proposals-and-seen.html`, `04-decision-flow.html`: the options
  the maintainer picked from (picks below).
- `mockups/05-final-spec.html` + `mockups/spec.css`: **the locked final spec** (confirmed by the
  maintainer by eye, 2026-10-02), together with 01b. `spec.css` holds the 01b card system once, so 05 does not copy it.

## Maintainer picks (2026-10-02)

1. **Mode picker (02):** the compact icon row from B's narrow "Later" container, at the far right
   of the container's top line: five layout icons plus a sixth, a cog for the container's
   settings. Opening it (or hovering a layout) shows A's popover tiles with their one-line
   explanations.
2. **Choosing a layout is the agent's job; changing it is the person's.** The agent picks the
   mode that fits what it is explaining, and the person can switch to see it another way:
   - **Flow:** connected steps, for example how data moves through an app and where it branches.
   - **Grid:** a numbered set to work through in order.
   - **Lanes:** several flows side by side, each in its own lane so they never bunch up (for
     example competing architecture options for a streaming setup). Not "a row per state".
   - **Radial:** one subject in the middle and everything related to it around it (for example a
     brand image and every place it is used).
   - **List:** dense reading.
   This guidance goes into the agent skill (rule 17, tracker U4 step 5).
3. **Proposals (03a):** the board-level bar ("3 proposals · Accept all") as drawn. On the card,
   the PROPOSAL tab is a button; it opens an **overlay attached to the card** with Accept and
   Reject, drawn on top of neighbouring cards so nothing moves. The card stays highlighted like a
   notification until it is decided. When several are open, the lowest number is on top.
4. **Unseen versions (03b):** option A, the stepper, as an overlay attached to the card: step
   through the versions with "Next update" until the latest. No separate "You're up to date"
   step; it is history, with no approve.
5. **Overlays point at their card.** Every overlay about one node (a note, the version stepper,
   a proposal) has an arrow joining it to that node, so it is clear which card it belongs to
   when many are nearby. Overlays never change the size of the card or move its neighbours.
6. **Decision flow (04):** both orientations, with a toggle on the container: horizontal is B
   (compact cards in a lane), vertical is C (a chat-like column with the back-and-forth
   offset). The horizontal one gets the same offset, and "you" uses the same colour and style
   in both.
7. **No composer at the bottom of the board.** The chat lives in a panel on the right (D-010):
   tool calls update the board, anything else is plain chat. It accepts pasted emails and
   documents. The mockups' bottom composer is a placeholder only; the composer's chips (notes,
   selection) move into the right-hand chat input.

## Maintainer revisions to 05 (2026-10-02, second pass)

8. **Decision flow colours and order (revises 6).** "You" is neutral grey, not pink, and your
   text is never coloured. The agent gets its own colour, still to be picked by eye from three
   candidates on 05 section 4 (lime, sky, or Architect's pink). You come first: on the top line
   horizontally, on the left vertically. Everything the agent produced (its runs and the
   versions it wrote) sits slightly lower, or slightly indented to the right. The offset is small
   because the colour already says who is who.
9. **No dashed outline on a card with a proposal (revises 3).** The tab is the signal.
10. **Accept/reject lives on a tab at the bottom centre of the card** (PROPOSAL, OUT OF DATE).
    The tab is the button that shows and hides the bubble, so the card behind can be read. Unseen
    versions stay bottom right; number, kind and note pin stay on the top border.
11. **Bubble placement.** Opens on the card's right; flips to the left when the right would leave
    the board; opens below when neither side fits.
12. **A bubble wears its card's colour** as a plain, subtle 1px border and arrow. It has no
    selected look, except while you type in it.
13. **Selection is thinner:** 1.5px in total (was 2.5px), still the card's own colour.
14. **Out of date** is not accept/reject: the card changed after the agent proposed, so the
    choices are Dismiss or Ask the agent again.
15. **Agent colour: lime** (`--agent`, a new design token in the palette swap). Sky and
    Architect's pink were the rejected alternatives. "You" stays grey in the decision flow; your chat
    messages and saved notes stay pink.
16. **Later, not now:** the agent's chat messages may get a subtle lime border to match the
    decision flow. Needs only the token, so no build work is planned for it.

## Palette (built into `packages/tokens/src/tokens.css`, 2026-10-04)

Architect's palette, measured against the APCA tiers (D-009). Three values were nudged to pass,
with the maintainer's yes. Architect's originals are kept here so a value can go back by eye if
the nudge looks wrong (the maintainer may accept a small shortfall as a recorded decision):

| Token | Architect's original | Built | Why |
|---|---|---|---|
| `--vb-accent-fill` (dark) | `#FF5CBE` | `#FF85CF` | Dark text on a pink button scored Lc 50.7; reading text needs 60 |
| `--vb-ink-subtle` (dark) | `#94949C` | `#9E9EA6` | Footer "Open" and hints scored Lc 43.6; short labels need 45 |
| `--vb-kind-action` (light) | `#C98A0B` | `#B57C09` | ACTION on its tinted tab scored Lc 40.2; short labels need 45 |
| `--vb-accent-text` (dark) | `#FF5CBE` | `#FF66C2` | A link in a quote or note scored Lc 44.0 and the "Your note" label 44.9; short labels need 45 (2c, maintainer's yes 2026-10-04) |

Pink borders and selection keep `#FF5CBE` in dark; pink text is `#FF66C2`. Card borders and divider lines stay
faint (dark Lc 15-20) by the maintainer's choice; they are not one of the three tiers. Note, which
Architect has no family for, takes the muted grey. Scores: `temp/apca-2b.mjs` (git-ignored; the
gate itself is tracker N1).
