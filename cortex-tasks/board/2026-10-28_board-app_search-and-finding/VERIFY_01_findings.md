# VERIFY_01 findings: Search and Finding

> **Task**: [VERIFY_01_search-verification.md](./VERIFY_01_search-verification.md) · **Plan**: [PLAN.md](./PLAN.md)
> **Run**: 2026-10-28, branch `feat/search` at `1049a68`, `VB_TEST_PORT=5600`.

Looked at as a first-time person on a 60-card board (ten containers of six, a note-only word, a
reply-only word, an accented card, a container-only word), then NEW and updated cards, three
proposals, and two bots asking for access (one for nine containers). Scratch probes in `temp/`,
deleted after.

## Evidence

| Check | Result |
|---|---|
| `npm test` | 1,827 unit pass, 14 timing pass |
| `npm run check` | 0 errors, 0 warnings |
| `npm run verify` | ok, 15 warnings (none new but `tests/pages/proposals.spec.ts` 408 lines, F11) |
| `node scripts/gen-api.mjs --check` | current |
| Page specs on 5600 (`search`, `search-perf`, `find-keeps-marks`, `proposals`, `access-by-bot`, `go-to-card`, `board-host`, `fresh-cards`, `open-list`, `gallery`) | 120 passed. Rings APCA Lc 56.6 light, 63.7 dark; search keystrokes on 1,000 cards median 6.1 ms, first 38.4 ms, nothing drawn again |
| Search on the 60-card board | "pric", "pricing": best first is "Annual pricing tier" (title). "annual pricing" and "pricing annual": the same 2 hits. "cafe" finds "Café budget", "resume" and "naive" find "Résumé … naïve" in the text. "renewal" finds the card by its note ("in a note"), "quarterly" by its reply ("in a reply"), "perks" by its container ("in the container's name"). "zebra": "No matches", nothing dimmed. "12": digits, no search; Enter goes to card 12 |
| Stepping at three zooms (21 %, 37 %, 64 %) | ↓/↑ wrap and bring each match into view at every zoom; Esc clears rings, dim and the box. Typing alone does not show the best match when it is off screen (F4) |
| Marks kept | Search Enter, search ↓ then Enter, digits, the "N new" list, the open list and each of the three Review rows: NEW on the added card and "1 update" on the changed one stay, the toolbar's "2 new" stays, no card seen line. The person's click on the card sends `seen {n, ver}`, the tab and the count go, and stay gone after a reload |
| Review list | Three proposals, zoomed out past where controls show: the list reads "5 · Trial length · Check: agreed in chat: 14 days" and so on; each row zooms to 100 %, the card in view, its proposal box open, focus in the box |
| Access by bot | Heading "2 agents ask for access"; groups "pricing-site asks for access to 9 containers" and "docs-site asks for access to draw on this board"; "Allow all 9 requests from pricing-site" granted only those nine, one toast ("pricing-site can now write in 9 containers"), docs-site's request left. Labels: the skill's `join` line (v3.16) and the side panel's `chatLabel(agent, folder)` say the folder's name; the `join` tool itself does not (F7) |
| Under a host (fake host, `board-host-fixture.ts`) | `/` typed in a host field stays the host's ("/x"); `/` in board A leaves board B deaf. But the box `/` opens is drawn by no one and the next letter is a board shortcut (F6) |
| Gallery | "Search the board", "Review list" and the by-bot requests sections, light and dark, looked at; axe and screenshots pass in their specs |

## Findings

Severity: **High** blocks the criterion as the person meets it; **Medium** the person is slowed or
misled; **Low** polish or a document.

### F1. The box is still headed "Go to card" while it searches (Medium; small, this set)

- Seen: `/` opens a box headed "Go to card"; its field's accessible name is "Go to card"
  (`GoToCard.svelte` label `commonWords.goToCard`), while the key list calls `/` "Find a card by its
  words" and the field's placeholder says "Card number or words". A screen reader user pressing `/`
  hears "Go to card", not a search.
- Fix: with `search`, the label reads "Find a card" (a new `shell/words/shell-go-to-card.ts`
  `findACard`; digits-only box keeps "Go to card"). Tests that find the field by name follow
  (`search.spec.ts` `field`, `search-perf.spec.ts`); `search-{light,dark}` and the gallery's search
  section re-baselined; components.md § Go to card and search item 7 names the label. Owner:
  SEARCH_02's files.

### F2. The count and the part run together: "2 of 3 Card 4, in the title" (Medium; small, this set)

- Seen: `GoToCard.svelte` puts `found.count` and `found.part` in two spans with a space between;
  on screen the bold count separates them a little, but the status is one polite announcement,
  "1 of 13 Card 1, in the title and the container's name", which reads as one phrase. At 21 % zoom
  (the 60-card board's fit) the box is the only place the person can read, and "Card 3" says
  nothing about which card.
- Fix: one sentence from the words file, e.g. `board/words/go-to-card.ts`
  `matchAt(at, count, n, parts)` → "2 of 3: card 4, in the title" (the visual keeps the bold
  count; the separator is in the words, not the markup). Optional, the maintainer's call: name the
  card's title too ("2 of 3: card 4, Student plan, in the container's name"). Tests: the texts in
  `search.spec.ts` and `go-to-card-search.test.ts`.

### F3. The current match looks like every other match (Medium; small, this set)

- Seen: on the 60-card board with 13 matches, at 21 % and 64 % zoom, which ring is "3 of 13"
  cannot be told at a glance. Computed styles: match `outline 2px`, current `outline 3px` of the
  same `--vb-state-context`, plus an 8 px halo of `--vb-state-context-soft`, which is close to the
  canvas in both themes (light about rgb(247 239 226), dark about rgb(50 44 33)). The APCA test
  measures both rings against the canvas (both 56.6 light, 63.7 dark); nothing checks that the
  current one differs.
- Fix: `styles/board.css` (tokens only): give the current match a mark of its own that reads at
  any zoom, e.g. a second ring outside the first (`box-shadow: 0 0 0 calc(…/ var(--vb-zoom))
  var(--vb-state-context)` at an offset) with the matches kept thin; add to `search.spec.ts`'s APCA
  test that the current ring's outer edge differs from a match's (width or colour). The maintainer
  looks, light and dark.

### F4. Typing never shows the best match when it is off screen (Medium; maintainer's ruling)

- Seen: zoomed in (37 %, 64 %), "pricing" says "1 of 13 Card 1" while card 1 is off the stage. To
  see it the person steps away (↓) and back (↑), or presses Enter, which goes and closes the box.
  SEARCH_02 chose this on purpose ("Typing does not pan … Refine with the maintainer").
- Proposal (`[needs-human-input]`): when typing pauses (about 300 ms) and the current match is
  wholly off screen, bring it in by `revealPan`'s rule, selecting nothing; no pan while any of it
  shows. Tracker row if not now: "Search: the best match shown when typing pauses (M7 refine)".

### F5. A container's name rings every card in it (Medium; tracker row)

- Seen: "pricing" gives 13 matches, 11 of them only by the container's name: five cards of
  "Pricing" (the sixth has it in its title) and the six of "Office and pricing perks". That container's title is cut on the canvas
  ("OFFICE AND …"), so six ringed cards show no reason until the person steps onto each. The rings
  then say less than "where the matches are".
- Proposal, tracker row (M7 refine): a container-name match is one match on the container (its
  title ringed, counted once, "in the container Office and pricing perks"), ranked after cards that
  match in their own words; SEARCH_01 already noted a container document kind as later work.

### F6. Under a host, `/` opens a box nobody draws, and the next letters are shortcuts (High for plugin mode; small guard, this set)

- Seen (fake host, a temp copy of `board-host.spec.ts`'s setup): a click in board A, then `/`:
  `status.go` becomes `{ text: '' }`, no `.vb-go` exists (the box is `shell/GoToCard.svelte`, the
  standalone shell's), focus stays on the board root, and typing `h` hid the answered cards
  (`status.hide` true). So a person searching for "hiring" under nclite fires H, I, R, N, G. The
  plan's host criterion holds (keys stay inside the root: a host field keeps "/x", board B hears
  nothing; `keys.test.ts`), the rest does not.
- Fix in this set: bind `/` only where the page draws the box: the controller passes `search`
  only when the host says it draws the go box (a host capability on `BoardHost`, the standalone
  shell says yes), else `open('/')` is false and `/` is the host's; a `board-host.spec.ts` test
  (`/` then `h` in a host board: hide stays off). Tracker row (plugin mode, M8): the box itself as a
  framework-free piece in `packages/ui` (principles § Shared pieces are shared), so a host gets
  search without drawing it. Digits under a host have the same undrawn box today (no letters, so no
  shortcuts fire); the same guard covers them.

### F7. The `join` tool still says "such as \"Pricing chat\"" (Medium; small, this set)

- Seen: the skill (v3.16) and the side panel say to join with the folder's name (ruling 321), but
  the tool an MCP client reads says: Pass a short `label`, such as "Pricing chat"; its `label`
  property says the same. Sources: `packages/format/schema/openapi.json` (the `join` operation),
  `packages/format/schema/api/join-request.schema.json` (`label`), and
  `packages/format/schema/events/join.schema.json`; generated into `tools.generated.json` (format
  and mcp), `packages/cli/src/commands.generated.ts`, `docs/specification/api-reference.md`. A
  client without the skill labels by the example, and the grouped strip names "Pricing chat".
- Fix: the source sentences say "your working folder's name (the repository or worktree folder,
  not a path)", then `npm run gen`; check the tool-description size budget (api.md 45 to 48).
  Owner: orchestrator (schema and generated files).

### F8. The search README misses its second user (Low; small doc fix, this set)

- Seen: `packages/search/README.md` "Used by: `packages/actions` (the `SearchDoc` type …)", but
  `apps/board/src/board/find/go-to-card.ts` imports `search` and `searchIndex` from `#search`.
- Fix: "Used by" adds `apps/board` (`board/find/go-to-card.ts` `createMatches`). Owner: orchestrator
  (`cortex/REGISTRY.md` flags this README).

### F9. components.md § Go to card and search says nothing of a host's box (Low; with F1 and F6)

- Seen: items 1 and 7 say `/` and a digit open the box (`shell/GoToCard.svelte`); under a host
  that box is the host's to draw from `status.go`, and none does (F6). Item 7's one host sentence
  ("Under a host `/` acts only inside the board's root") is true but is the whole host story.
- Fix: with F6, item 7 says where `/` is bound and why, citing the new `board-host.spec.ts` test;
  with F1, item 2 and 7 name the box's label in each mode. Owner: SEARCH_02's section.

### F10. `docs/specification/performance.md`: the search keystroke row (SEARCH_02-R4; Low)

Proposed row, after "One change shown":

| What | Budget | Measured on | Checked by |
|---|---|---|---|
| A search keystroke | under 50 ms (median of the keystrokes), the first, which builds the index, under 100 ms; no card updated, measured or placed, no container laid out, no fetch | typing "the sta" in the box on the 1,000-card board | `tests/pages/search-perf.spec.ts`; the engine alone in `packages/search/tests/search.timing.ts` (index of 1,000 under 100 ms, a 3-word query under 5 ms) |

Numbers as the specs hold them (`search-perf.spec.ts` `toBeLessThan(50)`, `toBeLessThan(100)`).
This run: median 6.1 ms, first 38.4 ms, 50 marked, no work counted.

### F11. `tests/pages/proposals.spec.ts` is 408 lines (Low; small, this set or tracker)

- Seen: `npm run verify` warns (aim about 300); it was 301 before REVIEW_01. Fix: the Review list
  tests (`farBoard`, the three Review tests after it and the two Review list gallery tests) move to
  `tests/pages/proposals-review.spec.ts` (its screenshots move with it), no test
  changed.

### F12. Nine requests from one bot push the next bot below the strip's fold (Low; tracker row)

- Seen at 1440 × 900: the strip is capped at 360 px and scrolls (scroll height 449); pricing-site's
  nine rows fill it and docs-site's group starts at y 420, below the strip's bottom (412). The
  heading's "2 agents" says there is another, nothing shows that the strip scrolls.
- Proposal, tracker row (accessByBot refine): a bot with more than three requests shows its heading,
  Allow all and a "Show 9" toggle, rows folded, so every bot's heading is in view.

### F13. The `reviewList` flag's description says Review always opens a list (Low; small, this set)

- Seen: `packages/format/src/flags.ts` `reviewList`: "Review opens a list of the cards with
  proposals"; with proposals on one card Review stays a button that goes straight there
  (`finder.ts` `reviewRows`, `proposals-notice.spec.ts`).
- Fix: "… a list of the cards with proposals (on two or more cards; one card, it goes straight
  there) …". Owner: orchestrator (flags.ts).

## Noticed outside this set

- After a Review row zoomed to 100 %, the "1 selected" pill sat over the neighbouring card's title
  ("Desk booki…", card 50). The pill is the selectionPill's (stage5-follow-ups FE_02), not this set.

## Success criteria (PLAN.md)

| Criterion | Holds? | Evidence; what is open |
|---|---|---|
| `/` opens the box; letters search; digits still go by number; Esc clears | Yes, standalone; no under a host | `search.spec.ts`, the 60-card probe; open F1, F6 |
| Matches ring, the rest dim, "3 of 12", ↓/↑ step, Enter goes; which part matched is shown | Yes, with gaps | `search.spec.ts`, `go-to-card-search.test.ts`, probe at three zooms; open F2, F3, F4, F5 |
| Going to a card from search, Go to card, any list or the Review list never clears NEW or updated; a click or an act does | Yes | `find-keeps-marks.spec.ts`, `search.spec.ts`, `proposals.spec.ts`; probe: every finder kept "2 new" and wrote no card seen line; a click wrote one and cleared the mark through a reload |
| Review opens a list; choosing a row goes to the card and opens its proposal box | Yes | `proposals.spec.ts`, probe (three rows, zoomed out, each reached at 100 % with its box); F11, F13 |
| Requests group by bot, one Allow all per bot, the heading counts bots; labels are folder names | Yes for the strip, the skill and the side panel; the `join` tool says otherwise | `access-by-bot.spec.ts`, `chat-access.test.ts`, probe; open F7, F12 |
| Every state in the gallery, light and dark; full suite green; the maintainer looks | Gallery yes; full suite green at the wave 2 gate (734 passed), the set's specs green here (120); the maintainer's look is open | `gallery.spec.ts`, `search.spec.ts` and the sections' screenshot tests; looked at light and dark |
