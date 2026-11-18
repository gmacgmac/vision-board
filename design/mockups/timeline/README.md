# Timeline layout

A container in a `timeline` layout: a horizontal line; each node on its own dot, joined by a short stem,
alternating above and below; ordered by date and evenly spaced (not to scale). Inside a timeline the node's
top tab (in Command Lens, the plate's kind word) shows its date instead of the kind word; the kind keeps its
colour, on the tab and on the dot. Proposal for the maintainer (DESIGN_02); nothing here is built. The
content is a made-up product launch plan.

| Page | What it shows |
|---|---|
| `default-timeline-*`, `command-lens-timeline-*` | The four date formats (day "SEP 15", month "OCT 2026", week "WEEK OF 13 OCT", year "2027"); eight events; three on one date (3 Nov), each on its own dot with a band behind them on the line; "Private beta" holding a week of entries in Markdown; a link from "Freeze the feature list" to "2.1: offline drafts", routed under the nodes; asking, ticked and new nodes |
| `default-vertical-*`, `command-lens-vertical-*` | The vertical form for a long timeline: twelve events, the line down the left, every node to its right; years on the line; the same-date band; a link routed on the right |

- **Dark and light:** each page comes in both; the PNG beside it is the full page at 1440 px.
- **Styles:** the skin's `../node-states/*.css`, then `../containers/containers.css` (the frame is drawn
  with open corners), then `timeline.css`. Standalone, no network.
- **Geometry:** a step of 144px for 250px nodes, so nodes on one side sit 38px apart; stems 30px. The
  line and stems are the frame's rest colour (Lc 30 tier); the link is the in-use grey (Lc 45), its label
  in a canvas gap; years sit in gaps cut from the line, like the container's title.
- **Not built yet, a contract change:** a node has no date today (`packages/format/src/view.ts`), and
  `MODES` has no `timeline`. The layout needs a date with its precision on the node (day, week, month or
  year) and the mode, behind a flag, with the agent skill told how to give them.

## Choices to confirm

1. **Years on the line, not on every tab.** Recommend a day or week tab without the year ("SEP 15"), and the
   year drawn on the line where it turns ("2026", "2027"), so the tabs stay short. Note the formats as given
   put the month first for a day ("SEP 15") and the day first for a week ("13 OCT"); recommend one order,
   month first ("WEEK OF OCT 13"), unless the day-first week is meant.
2. **Several nodes on one date.** Recommend the band behind their dots, so "same date" reads without
   reading the tabs. Without it they are plain neighbours on the line.
3. **The vertical form puts every node on one side.** Recommend one side: the dates then read down one
   column, which is what a long timeline is for. Alternating left and right halves the height but zigzags
   the eye.
4. **Dots in the kind's colour.** Recommend yes, echoing the tab, so a run of decisions or risks shows from
   a distance. A node's tone, when it has one, would colour the dot instead (point 366).
5. **A node with no date in a timeline.** Not drawn. Recommend it sits after the dated ones, past the
   line's arrow, under a "No date" label on the line, rather than being refused, so an agent's slip still
   shows.
