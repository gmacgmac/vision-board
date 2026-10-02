# board-v3-design

The agreed visual spec for board v3 (D-024). Reference only: the build ports the look and the
behaviour into `packages/` and `apps/`, never this code. Open the pages through a local server
(`python3 -m http.server 4477 --bind 127.0.0.1` from the repo root, then
`/prototypes/board-v3-design/mockups/index.html`), since browsers block `file:` stylesheets.

- `architect-extract/`: Uplynk Architect's stylesheet, interactions and markup, copied verbatim,
  with `README.md` listing every capability and where it goes.
- `mockups/01b-cards-content-first.html`: **locked.** Cards, border tabs, footer, selection,
  open-frame containers.
- `mockups/02-mode-picker.html`, `03-proposals-and-seen.html`, `04-decision-flow.html`: options
  for the maintainer to pick by eye.

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
