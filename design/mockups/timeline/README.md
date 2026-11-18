# Timeline

A node may carry a `timeline` date. The dated nodes of a container share one timeline: a line across its top, whatever
the container's layout, with its other nodes below the line in the container's own layout; run down, a line down the
middle of the timeline's column, with the other nodes to the right of it. These pages are a proposal for the
maintainer; nothing here is built. The content is a made-up product launch plan.

DESIGN_02 drew runs 1 and 2. DESIGN_01 of the Timeline set (`cortex-tasks/board/2026-11-18_board-layout_timeline/`)
redrew every page to the rulings in its PLAN.md § Decisions (run 1), then redrew the run-down pages to the design
review, PLAN.md § Design review, points 587-595 (run 2). **Where a page and PLAN.md differ, PLAN.md wins.**

## Pages

Open them in a browser; each makes no network request. Each page has a full-page PNG at 1440 px beside it. Each loads
the skin's `../node-states/*.css`, then `../containers/containers.css` and `timeline.css`. A light page is its dark page
with `light` added to the root class (`v9` or `cl`).

| Page | What it shows |
|---|---|
| `default-timeline-dark`, `-light`; `command-lens-timeline-dark`, `-light` | **Across.** The four headers (day, month, year, time) with the key each comes from; what the agent writes (the key and plain Markdown); a launch plan of seven dated nodes (entries three ways, two nodes on one date with a band, a link, the year where it turns); the same container shape **with other nodes below the line**, once in a row and once in a grid; one dated node with a tone. |
| `default-vertical-dark`, `-light`; `command-lens-vertical-dark`, `-light` | **Run down** (587-595). The launch plan with the default widths (`match`); a container with other nodes beside the timeline, in a grid, with a link from an undated node into a dated one and a toned node; the launch plan again with the person's choice `own`. |

## What was ruled, as drawn

Numbers 1-21 are PLAN.md § Decisions; 569C and 587-595 are the maintainer's points recorded in § Kickoff answers and
§ Design review.

- **The key** (1-3): one of four precisions, `2026`, `2026-10`, `2026-10-13`, `2026-10-13T14:30`; the precision is what is
  written. No "week of" (a week is not a precision) and no precision field. A time is shown as written.
- **One timeline per container, no new mode** (7): the line sits across the top in any layout; the other nodes lay out
  below it in the container's own mode (the pages show Row and Grid on the layout button). The timeline goes only when
  the last key goes.
- **Dots and order** (8, 9): each dated node on its own dot, joined by a stem, alternating: across above and below, the
  first above; run down left and right, the first on the left (594). In order by start; equal values in card-number
  order.
- **The stem** (8, 587, 591): one length in both forms, 30 px (`TIMELINE_STEM`). It meets the middle of the node's facing
  edge: across, the middle of the top or bottom edge; run down, the middle of the right side for a node on the left and
  of the left side for a node on the right. There is no `TIMELINE_STEM_AT`, and Command Lens needs no special case (the
  stem meets the body, below the plate).
- **Spacing across** (10; call 6): one step for the whole line, not to scale, the least that keeps two nodes on one side
  28 px (`SIDE_GAP`) apart, at least 120 px (`MIN_STEP`): 174 px for the launch plan (one node is size m, 360 px),
  154 px where all are size s.
- **Spacing run down** (10, 587): no single step. Each dot sits as high as both of these allow: its node's top at least
  the row gap below the bottom of the last node on its side (two dots back), and the dot at least 56 px
  (`TIMELINE_MIN_DOT`) below the one before. Nodes on opposite sides overlap in height. The launch plan run down is
  815 px tall in the default skin (run 1's even step of 304 px made it about 2,000).
- **Where things sit** (7, 14, 569C, 591): across, the other nodes 56 px (`REGION_GAP`) below the lowest dated node; run
  down, 72 px (`COL_GAP`) to the right of the whole timeline, level with its top. The line runs down the middle of the
  timeline's column and ends 30 px past the last dot in an arrow; across, it runs to the content's right edge. No other
  new spacing number.
- **Widths** (21, 595): dated nodes follow the container's widths setting, the same control in its menu (the widths
  button on the rail: on for `match`, off for `own`). Not chosen: run down is `match`, every dated node as wide as the
  widest ("Private beta", size m, so all 360 px); across is `own`, each node its size tier (s 280 px, m 360 px). The
  setting is the container's and covers its other nodes too. No forced 300 px.
- **Years and bands** (11, 12): the year at the start of the line and where it turns between two dots. A band behind
  consecutive dots with exactly equal values ("Nov 3" and "Nov 3"; not "Nov 3" and "Nov 3 · 09:00").
- **Links** (13): routed as between any cards: dated to dated (across), undated into dated (run down; it enters the
  side the stem leaves free).
- **Pins** (15): nothing is drawn under the line; the undated nodes start below it (beside it, run down).
- **The header** (16): the date first, large and bold, month first, upper case: `SEP 15`, `OCT 2026`, `2027`,
  `DEC 1 · 17:00`. No year on a day or a time. In the kind's colour, or the tone's on a toned node ("Price change
  emails", teal).
- **No grip** (17): the default skin's dated node has no tab and no grip; its top edge is plain. The kind is a small
  word at the end of the date line. The number, the disc, the change badge and the notes mark stay where they are.
- **Command Lens** (18): the plate keeps number, kind and marks and is not a handle; the date heads the body.
- **Entries** (19): a `###` heading ("Private beta"), a paragraph opening with a bold name ("Pricing page live"), or a
  list item opening with a bold name ("Public launch": that item is an entry, the others keep their bullets).
- **Type** (20): date 23px (default skin: system face, 800; Command Lens: its display face, 700), title 18px, only on a
  dated node. The undated nodes in the same container keep the board's sizes.
- **Real values** (21): the kind colours on every page are `tokens.css`'s, light and dark, and Command Lens's muted ink
  is `skins.css`'s, so the contrast below is measured in the build's colours. The frame's spacing and the line's colour
  are still the mock-ups'; the build takes the board's.
- **Kept as drawn** (588-590, 592, 593): the line in the container frame's colour at rest (here `containers.css`
  `--c-rest`, decoration tier Lc 30; the build takes the board's frame token), never the links' grey; the dot 12 px in the node's colour, ringed 3 px in the canvas; the year in mono,
  11.5 px, weight 700, spaced `.14em`, in the muted ink, in a gap cut from the line; a toned node's date in the tone's
  ink (`--vb-tone-ink`), its dot, entry bar and edge in the tone's line; the same-date band 10 px, the line's colour at
  32% into the canvas, in both forms.

## Contrast of the date

APCA-W3 0.0.98G-4g; the tier for a short coloured label is **Lc 45** (D-009). The date colour on the node's surface
(card `#ffffff` light; dark `#1a1a1c` default skin, `#1a1b1f` Command Lens). In brackets, the default skin's top tinted
9% with the kind (`--vb-node-tint`), the worst place for the date. Command Lens has no tint. `note` is the muted ink.
Run 2 changed no colour; the figures are run 1's.

| Skin | Theme | question | finding | decision | risk | action | topic | note |
|---|---|---|---|---|---|---|---|---|
| default | light | 72.6 (64.6) | 66.7 (59.4) | 79.9 (70.1) | 64.7 (57.2) | 63.2 (56.3) | 76.6 (68.3) | 76.2 |
| default | dark | 52.0 (50.1) | 58.9 (57.0) | 52.7 (50.9) | 52.5 (50.7) | 63.6 (61.4) | 48.0 (46.4) | 63.0 |
| Command Lens | light | 72.6 | 66.7 | 79.9 | 64.7 | 63.2 | 76.6 | 81.9 |
| Command Lens | dark | 51.8 | 58.8 | 52.6 | 52.4 | 63.5 | 47.9 | 63.6 |

A tone's date (the tone's ink, `--vb-tone-ink`, on the tone's body, `--vb-tone-body`; the same in both skins):

| Theme | teal | blue | violet | magenta | amber | orange | green | slate |
|---|---|---|---|---|---|---|---|---|
| light | 71.7 | 72.8 | 73.7 | 73.8 | 73.3 | 73.5 | 72.2 | 72.9 |
| dark | 67.2 | 65.2 | 63.7 | 62.9 | 64.8 | 63.9 | 66.8 | 65.3 |

No miss. The closest is dark topic: 48.0 (46.4 on the tinted top, 47.9 in Command Lens), 1.4 above the tier.

## Open choices

Run 1's six open choices are all settled (588-593). What the run-down pages had to decide that PLAN.md does not; each
has a recommendation.

1. **The row gap run down.** § Design review 587 names `ROW_GAP` (30). The pages use the row gap the board already
   takes per skin (`apps/board/src/board/canvas/draw.ts`): `EDGE_ROW_GAP` (40) in the default skin, whose answer disc
   stands 14 px above a node and whose bottom marks hang 11 px below it, and `ROW_GAP` (30) in Command Lens, whose
   marks sit in the plate. At 30 the default skin's marks would nearly touch. Recommend the layout's `rowGap` option,
   as `grid` uses it, not the constant.
2. **`TIMELINE_MIN_DOT`: 56 px.** The dot with its ring (18 px) and the year label run down (28 px tall) with 5 px clear
   on each side. Recommend 56. The run-down line also starts with the first year: the first dot is at least 56 px below
   the line's top.
3. **Where the line sits under `own`, run down.** One stem from the widest node on each side: the left nodes line up on
   their right edges, the right nodes on their left edges, and the line is the column's middle only when both sides'
   widest nodes are equal (always so under `match`). Recommend this: every stem stays one length.
4. **The tops, run down.** The first dated node (on the left) starts at the top of the container's content, and the
   other nodes beside the timeline start level with it. Recommend keep.
5. **A link to a dated node run down** enters the side the stem leaves free. A link from the other nodes to a node on
   the left would cross the line; links route as anywhere (13), so the pages draw only a link to a node on the right.
   Recommend no special routing (links around the line are out of scope); VERIFY_01 judges it.
6. **The same-date band run down.** Packed, two equal dots can still be far apart when a tall node on one side pushes
   the next node down: the launch plan's two "Nov 3" dots are 193 px apart in the default skin (237 in Command Lens),
   so the band is a long bar. Recommend keep (593): it marks exactly the dots that share a value.

The pages are generated by a script in `temp/design-01-timeline/` (git-ignored): `gen.mjs`, `measure.mjs`, `gen.mjs`,
then `shot.mjs`; `check.mjs` fails on overlapping nodes or a stem off its node's middle; `apca.mjs` prints the tables
above.
