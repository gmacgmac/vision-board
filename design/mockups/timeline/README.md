# Timeline

A node may carry a `timeline` date. The dated nodes of a container share one line across its top, whatever the
container's layout; its other nodes lay out below the line in the container's own layout (beside it, to the right,
when the line runs down). These pages are a proposal for the maintainer; nothing here is built. The content is a
made-up product launch plan.

DESIGN_02 drew runs 1 and 2. DESIGN_01 of the Timeline set
(`cortex-tasks/board/2026-11-18_board-layout_timeline/`) redrew every page to the rulings in its PLAN.md
§ Decisions. **Where a page and § Decisions differ, § Decisions wins.**

## Pages

Open them in a browser; each makes no network request. Each page has a full-page PNG at 1440 px beside it. Each loads
the skin's `../node-states/*.css`, then `../containers/containers.css` and `timeline.css`. A light page is its dark page
with `light` added to the root class (`v9` or `cl`).

| Page | What it shows |
|---|---|
| `default-timeline-dark`, `-light`; `command-lens-timeline-dark`, `-light` | The four headers (day, month, year, time) with the key each comes from; what the agent writes (the key and plain Markdown); a launch plan of seven dated nodes (entries three ways, two nodes on one date with a band, a link, the year where it turns); the same container shape **with other nodes below the line**, once in a row and once in a grid; one dated node with a tone. |
| `default-vertical-dark`, `-light`; `command-lens-vertical-dark`, `-light` | **Run down** (maintainer, 569C): the timeline is the container's first column (the line down the left, every dated node to its right), the container's other nodes a second column to its right, in a grid. A link from a dated node to an undated one. |

## What was ruled, as drawn

Decision numbers are PLAN.md § Decisions.

- **The key** (1-3): one of four precisions, `2026`, `2026-10`, `2026-10-13`, `2026-10-13T14:30`; the precision is what is
  written. No "week of" (a week is not a precision) and no precision field. A time is shown as written.
- **One timeline per container, no new mode** (7): the line sits across the top in any layout; the other nodes lay out
  below it in the container's own mode (the pages show Row and Grid on the layout button). The timeline goes only when
  the last key goes.
- **Dots, order, spacing** (8-10): each dated node on its own dot, joined by a stem, alternating, the first above. In
  order by start; equal values in card-number order. Evenly spaced, one step for the whole line. The step is worked out
  from the widths drawn (call 6): 174px for the launch plan (one node is size m, 360px), 154px where all are size s.
- **Years and bands** (11, 12): the year at the start of the line and where it turns between two dots. A band behind
  consecutive dots with exactly equal values ("Nov 3" and "Nov 3"; not "Nov 3" and "Nov 3 · 09:00").
- **Links** (13): routed as between any cards: dated to dated (across), dated to undated (run down).
- **Run down** (14, 569C; call 4): the line down the left; every dated node to its right, the stem meeting its left edge
  37px below its top (level with the date line in the default skin; inside the plate in Command Lens). One step: the
  tallest dated node plus `EDGE_ROW_GAP` (call 6). The other nodes in a second column to the right.
- **Pins** (15): nothing is drawn under the line; the undated nodes start below it (beside it, run down).
- **The header** (16): the date first, large and bold, month first, upper case: `SEP 15`, `OCT 2026`, `2027`,
  `DEC 1 · 17:00`. No year on a day or a time. In the kind's colour, or the tone's on a toned node ("Price change
  emails", teal).
- **No grip** (17): the default skin's dated node has no tab and no grip; its top edge is plain and the stem meets it
  centred. The kind is a small word at the end of the date line. The number, the disc, the change badge and the notes
  mark stay where they are.
- **Command Lens** (18): the plate keeps number, kind and marks and is not a handle; the date heads the body.
- **Entries** (19): a `###` heading ("Private beta"), a paragraph opening with a bold name ("Pricing page live"), or a
  list item opening with a bold name ("Public launch": that item is an entry, the others keep their bullets).
- **Type** (20): date 23px (default skin: system face, 800; Command Lens: its display face, 700), title 18px, only on a
  dated node. The undated nodes in the same container keep the board's sizes.
- **Real values** (21): no forced 300px width; each node keeps its size tier (s 280px, m 360px). The kind colours on
  every page are `tokens.css`'s, light and dark, and Command Lens's muted ink is `skins.css`'s, so the contrast below is
  measured in the build's colours. The frame's spacing and the line's colour are still the mock-ups'; the build takes
  the board's.

## Contrast of the date

APCA-W3 0.0.98G-4g; the tier for a short coloured label is **Lc 45** (D-009). The date colour on the node's surface
(card `#ffffff` light; dark `#1a1a1c` default skin, `#1a1b1f` Command Lens). In brackets, the default skin's top tinted
9% with the kind (`--vb-node-tint`), the worst place for the date. Command Lens has no tint. `note` is the muted ink.

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

No miss. The closest is dark topic: 48.0 (46.4 on the tinted top, 47.9 in Command Lens), 1.4 above the tier. The
tone's line colour, if it were used for the date, would read 48.9 to 58.5 (dark magenta lowest), so it also passes.

## Open choices

What the pages had to decide that § Decisions does not. Each has a recommendation.

1. **The line's colour.** Decision 21 says the board's real value; the pages use the frame's rest colour
   (`containers.css` `--c-rest`, decoration tier Lc 30). Recommend the build's container frame colour at rest, so the
   line and the frame read as one, and never `--vb-wire`: in the links' grey the line would read as a link.
2. **The dot.** 12px in the node's colour (the kind's, or the tone's line), ringed 3px in the canvas so the line
   breaks around it. Recommend keep.
3. **The year on the line.** Mono, 11.5px, weight 700, spaced `.14em`, in the muted ink, in a gap cut from the line
   (as a container's title sits in its rule). Recommend keep.
4. **Distances.** Stem 30px across and 46px run down; the other nodes 56px below the lowest timeline node (`REGION_GAP`)
   and, run down, 72px right of the widest dated node (`COL_GAP`); the least step 120px; the line's end 30px past the
   last dot run down. Recommend these: the gaps reuse existing layout numbers, so BE_01 adds only `STEM`, `SIDE_GAP`,
   `MIN_STEP` and `TIMELINE_STEM_AT` (37px, the default skin's date line).
5. **A toned node's date.** The tone's ink (`--vb-tone-ink`, Lc 62.9 to 73.8), the colour the tone makes for text;
   the dot, the entry bar and the edge take the tone's line. Recommend the tone's ink.
6. **The same-date band.** 10px, the line's colour at 32% into the canvas. Run down, the even step (about 300px here)
   makes it a long bar between the two dots. Recommend keep, both forms: it marks exactly the dots that share a value.

Run 2's review (the earlier version of this file) is in git history; every ruling it led to is in PLAN.md § Decisions.
The pages are generated by a script in `temp/design-01-timeline/` (git-ignored): `gen.mjs`, `measure.mjs`, `gen.mjs`,
then `shot.mjs`; `apca.mjs` prints the tables above.
