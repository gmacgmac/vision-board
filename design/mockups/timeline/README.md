# Timeline layout

A container in a `timeline` layout, for a roadmap, a plan or a history. There is one line. Each node sits on
its own dot, joined to it by a short stem, alternating above and below the line. Nodes are ordered by date
and evenly spaced, not to scale. These pages are a proposal for the maintainer (DESIGN_02); nothing here is
built. The content is a made-up product launch plan.

| Page | What it shows |
|---|---|
| `default-timeline-dark`, `command-lens-timeline-dark` | **Run 2.** Shows:<ul><li>The date as each node's header.</li><li>Where the kind goes: A and B side by side in the default skin.</li><li>The Markdown the agent writes.</li><li>Seven events, three of which show how a body is drawn:<ul><li>"Private beta" has three entries.</li><li>"Pricing page live" has one entry, written as a bold lead.</li><li>"Public launch" holds a list.</li></ul></li><li>Two events on 3 Nov, each on its own dot, with a band behind them on the line.</li><li>The year on the line where it turns.</li><li>A link routed above the nodes.</li></ul>Light pages come later. |
| `default-vertical-*`, `command-lens-vertical-*` | Run 1, unchanged. The vertical form for a long timeline: the line down the left and every node to its right. These pages still draw the date on the tab; run 2's header is not applied to them yet. |

Every page has a full-page PNG at 1440 px beside it. Each page loads the skin's `../node-states/*.css`, then
`../containers/containers.css` and `timeline.css`. Standalone, no network.

The frames on these pages use the mock-ups' spacing and line colour. The build takes the real board's values
instead (the maintainer, run 2).

## What changed in run 2 (the maintainer's review)

- **The date is the node's header.** It is the first thing on the node: large and bold, uppercase, month
  first ("SEP 15", "OCT 2026", "WEEK OF OCT 13", "2027"), in the kind's colour (a tone's, if the node has
  one).
  - Size: 23px. Default skin in the system font at weight 800; Command Lens in Space Grotesk at 700.
  - Contrast, on the dark node surface: APCA Lc 48 to 64 for every kind colour. That passes 45, the tier
    for short coloured labels.
- **Bigger titles inside a timeline.** 17.5px at weight 750 in the default skin, 18px in Command Lens; the
  board elsewhere uses 15px.
- **Entries come from plain Markdown.** Inside a timeline container, a `###` heading, or a bold lead at the
  start of a paragraph, draws as an entry: a 3px bar in the kind's colour, a bold name, then a line or two
  of text. A list stays a list and plain text stays text. The agent learns nothing new; the container does
  the presentation.
- **Where the kind goes.**
  - Default skin, B (recommended and used on the timeline): the kind tab leaves the top edge. The grip of
    the architecture look takes its place, so the node is still dragged there, and the stem from the line
    meets it. The kind becomes a small word at the end of the date line.
  - Default skin, A: keeps the tab, which says the kind twice and competes with the date.
  - Command Lens: the plate stays as it is (number, kind, marks, the handle). The date heads the body.
- **Kept from run 1:** each node on its own dot; alternating above and below; even spacing; years on the
  line; the same-date band; a link.
- **Wider nodes:** 300px at a 164px step, so nodes on one side sit 28px apart.

Not built yet, and a contract change: a node has no date today (`packages/format/src/view.ts`), and `MODES`
has no `timeline`. The layout needs a date and its precision on the node (day, week, month or year), plus the
new mode, behind a flag.

## Choices to confirm

1. **Default skin: the kind tab gives way to the grip, with the kind as a word on the date line (B).**
   Recommend B: the date is then the one loud thing at the top of the node. With A, a tab and a header
   compete.
2. **What counts as an entry.** Recommend a `###` heading, or a bold lead at the start of a paragraph. `##`
   and `####` stay ordinary headings, so a node can still have a heading that is not an entry. The other
   way is to treat any heading level as an entry.
3. **Header sizes.** Recommend a 23px date and a 17.5px to 18px title, used only inside a timeline. The
   rest of the board keeps its 15px titles, so a timeline reads as a presentation without changing other
   nodes.
