---
category: project-docs
type: tracker
status: active
created: 2026-09-30
last_updated: 2026-10-31
scope: The live queue for Vision Board, from founding rules to a board any agent session can use
keywords: [tracker, queue, roadmap]
---

# Vision Board — Tracker

> **A queue of open items.** This file is live state only. The history of what landed is the
> task files under `cortex-tasks/` plus `cortex/LOG.md`. Decisions belong in `docs/decisions.md`,
> architecture in `docs/`, detail in the task file. Keep it short — aim for under ~250 lines.

---

## How this file works

1. **Every item becomes part of a Cortex task.** Work items one at a time, or batch similar items
   into one task. The task's `tracker:` field names the rows, e.g.
   `tracker: cortex-tasks/tracker.md#U2`.
2. **On completion, delete the row** and its detail block. Never strike through or mark done.
3. **A row is removed only when a completed task references it.** The task and its LOG line are
   the record.
4. **A dropped item** (duplicate, won't do, no longer matters) is deleted with one LOG line as its
   record:
   `[[YYYY-MM-DD HH:MM]] [category] Dropped {ID}: {reason} → Notes: \`cortex-tasks/tracker.md\``
5. **IDs are stable and never reused.** The prefix is the bucket the item started in; an item that
   moves bucket keeps its ID. Cross-reference by ID and title.
6. **New items land in the bucket that matches**, not at the bottom.
7. **A problem found outside the current task becomes a row**: the problem and an example. Add a
   solution if known — "unknown" is a valid answer.
8. **A workaround is recorded when it is taken**, with how it ends.
9. **Every item gets the maintainer's explicit go before it starts** (project rule). "Proceed" on
   one item does not carry to the next.

**Buckets** answer *when does this hurt*, not *how hard is it*.

| Bucket | Prefix | Means |
|---|---|---|
| **Urgent** | U | Blocks the current milestone (board v3), loses data, or is the first thing a user sees fail |
| **Near Term** | N | Bites soon in real use |
| **Medium Term** | M | Real debt with a known shape; costs more the longer it waits |
| **Long Term** | L | Needs something else to exist first, or is a bet |
| **Parked** | — | Waiting on a gate: a proof, a validation, a decision. Keeps its original ID |
| **Workarounds** | W | Shortcuts taken on purpose, to resolve or ratify |

---

## Working style for a new chat

1. Read `.kiro/steering/vision-board-proj.md` (the rules) and `docs/principles.md` (why).
2. Replies are one numbered list whose numbers keep counting across headings, short enough to
   answer "1 ok, 4 skip". Long replies go on the board (`sessions/<id>/view-vN.json`).
3. Use Node 22.18 or newer, which runs the `.ts` files directly (`/usr/local/bin/node` is 24.14).
4. Verify by running `npm test` and reading the exit code yourself, and look at UI changes in a
   browser before reporting them done.
5. Protected files (steering, `AGENTS.md`, `CLAUDE.md`, decisions, principles, tokens) change only
   with the maintainer's yes, proposed as exact wording.

---

## Status — 2026-10-01

The walking skeleton runs and the board has been dogfooded on the
`first-look` session (views v1 and v2). The framework interview settled D-005 and D-009 to D-015:
plain Svelte, our own canvas, the Studio component model and the APCA contrast tiers.
The founding decisions D-001 to D-007 are accepted. The
foundation is in: Cortex categories, a flag-only doc fence, D-016 module layers checked by
`npm run verify`, and a generated module map. Next: board v3 Stage 2 (U1).

---

## URGENT

| ID | Item | Why | Source |
|---|---|---|---|
| U1 | Board v3: the last two items | **Problem:** the board v3 plan's stages 1-6 are built and in use; two items remain. **Example:** a decision drawn as a flow of options; a final check of the whole v3 plan. **Solution:** item 7, a decision flow mode (incremental layout), and item 8, the plan's verification. | Maintainer, 2026-10-01 · `cortex-tasks/board/2026-10-01_board-v3/TASK-STATUS.md` |

## NEAR TERM

| ID | Item | Why | Source |
|---|---|---|---|
| N1 | Contrast gate for the three APCA tiers | **Problem:** token colours are hand-picked and unchecked. **Example:** `packages/tokens/src/tokens.css` TODO. **Solution:** port Studio's contrast check, tiered per D-009. | HANDOVER gap 13 |
| N2 | JSON Schema for the view and transcript | **Problem:** rule 6 needs versioned schemas, and today it's a TypeScript validator only. **Example:** `packages/format/src/validate.ts`. **Solution:** schema files, with docs generated from them. Done as U4 step 1 (D-022). | Rule 6 |
| N5 | Install Prettier | **Problem:** D-007 names Prettier as the formatter, and it isn't installed. **Example:** D-014 lists five packages, Prettier isn't one. **Solution:** pin it, add it to `dependencies.md`, add a `format` check to `verify`. | D-007 |
| N9 | Board settings instead of address flags | **Problem:** feature flags are switched by adding `?flags=` to the address, which a person won't know or remember. **Example:** card sizes need `?flags=nodeSize`. **Solution:** a settings panel on the board for flags and board preferences, saved per person; design to be discussed. Include two switches from D-032: hide the dot grid, and a very light blur behind cards (off by default). | Maintainer, 2026-10-05 |
| N10 | Size control crowds the card's top-right corner | **Problem:** the S/M/L control (D-030, option A) and the note pin share the card's top-right border, so it looks bunched. **Example:** a card with a note on `?flags=nodeSize`. **Solution:** unknown; review the control's place by eye once notes beside cards (2e) are in. | Maintainer, 2026-10-05 |
| N11 | The person edits a card's text | **Problem:** only the agent can change a card's text; the person can only ask for a change in a note. **Example:** fixing a wrong word in a finding without a round trip. **Solution:** a person edit becomes a new version of the node in the ledger (D-017, D-018), shown like any other version; design to be discussed. Notes stay append-only: an edited note shows its latest text, earlier text kept in history (chat 664). When the agent next reads the board, the change must reach it wrapped in a short message saying what the person changed and from which version; the agent skill (rule 17) explains how to treat it (chat 718). | Maintainer, 2026-10-05 |
| N12 | Performance budgets enforced | **Problem:** rule 15's budgets are mostly unchecked, and the page re-fetches and re-measures the whole board on every change. **Example:** `controller.ts` `watch` calls `openBoard`; `relayout` measures every card. **Solution:** `docs/specification/performance.md`: incremental updates, per-container layout, measure only changed cards, skip off-screen cards, ledger checkpoint; **Built 2026-10-05 (N12_FE_01): incremental updates, per-container layout, counting and timing tests; follow-up N15.** a 1,000-card page test, a page test that changes 50 cards (and 1) and counts that only those cards and their containers were redrawn, and a page-weight check, before Stage 3. | Maintainer, 2026-10-05 |
| N14 | Remove and purge a sent note | **Problem:** a sent note can't be taken out of history, and the ledger only ever adds lines (D-017), so a hidden note's text stays on disk. **Example:** a note holding something that shouldn't reach AI models in future chats; the board outlives any one chat and becomes context for new ones. **Solution:** Remove hides a sent note from the board and every agent read; Purge also blanks its stored text, after a confirm, recording who and when. Purge is the one exception to append-only, so it needs a decision entry first. It can't recall text an agent already read in its own chat (delete that chat). Purge must also blank the text in `read_ledger`, which today returns every raw line to any agent, including a note's earlier wording and removed notes. 2e leaves the seam. | Maintainer, 2026-10-05 (742-745) |
| N15 | Opening a board reads the whole project ledger | **Problem:** since N12 the page builds its state from the raw ledger, 500 lines per call, so opening a board costs about 200 calls on a 100,000-event project; JavaScript work per batch is still across all cards (only the page's drawing work is proportional). **Example:** a project a year old. **Solution:** open from a server-folded snapshot at a `seq` (the server already folds; checkpoint, performance.md 7), then apply lines after it; drop the page's copy of `getBoard` (`board-data.ts`) once the server shares it. Measure first with a generated 100,000-event project. | N12_FE_01, 2026-10-05 |
| N16 | Read a chosen list of cards in one call | **Problem:** an agent checking several cards before it changes them needs one `show_node` per card, or the whole `get_board`. **Example:** verify cards 12, 15 and 31 before a redraw. **Solution:** one read taking several numbers (contract first, api.md); until then `get_board` covers it. | Maintainer, 2026-10-06 (959, 997) |
| N23 | Rewind to a version | **Problem:** a past version can only be viewed. **Solution:** a Rewind to this version action; design to be discussed (append-only ledger). | Maintainer, 2026-10-07 (154) |
| N26 | Other proposals: content changes, and agents without write access | **Problem:** a proposal can only acknowledge or drop a card. **Example:** an agent that may read a board but not write on it suggests a change to a card. **Solution:** the card proposal box (Stage 5, `bindCardPopover`) carries the new kinds; needs a contract change and a permissions row. | Maintainer, 2026-10-08 (220) |
| N27 | Selection bar covers an open card box | **Problem:** the floating selection bar draws above an open proposal or handover box, hiding its top line. **Solution:** hide or move the bar while a card box is open. | VERIFY, Stage 5, 2026-10-08 |
| N28 | Launcher and desktop app | **Problem:** starting the board means typing `npm run board` in this repo. **Example:** opening the board without a terminal. **Solution:** a launcher on a fixed port with Launch/Stop/Open, a registry of running boards so `vb-mcp` finds its board by folder, a small app built per computer (chat 398, 402, 403). Paused by the maintainer until U12 is in use. | Maintainer, 2026-10-09 |
| N38 | Agents draw a container per area with links between them | **Problem:** in skill v2.5 runs the model drew one container per area with 7-8 links between containers instead of lanes or a phase flow; it also sets `size` on every card and ends with long chat words. **Example:** batch 3 T_01 runs (scenario 17). **Solution:** a firmer skill rule (named areas with handoffs: lanes or a phase flow), or `show_layout` reporting links that leave the container; test against scenario 17. | VERIFY, 2026-10-11 |
| N43 | The "N selected" pill covers content | **Problem:** the floating selection pill draws over what is under it. The container title line and its count are fixed (commit 895763f, point 283). **Example:** a container's count, and a card's title in a past view (review-polish VERIFY_01, item 16). **Solution:** unknown; move the pill clear of the selection, or keep it out of the board area. | Maintainer, 2026-10-16 (186) |

## MEDIUM TERM

| ID | Item | Why | Source |
|---|---|---|---|
| M1 | Versions, change highlights, Confirm these, Approve | **Problem:** you re-read the whole board each version. **Example:** Architect's v1/v2/v3 with Changed and New badges. **Solution:** port the behaviour, not the code. | `docs/vision.md` |
| M3 | Generated pattern index | **Problem:** "does this pattern exist?" has no generated answer yet. **Example:** D-006. **Solution:** generate `docs/patterns/` from each `pattern.json`. | D-006 |
| M5 | App cards are all app; notes go beside them | **Problem:** an app card also holds the person's notes under its panel, so the card is not 100% the app, and Z zooms to the notes too. **Example:** the clip-and-export app card with a long note thread (2026-10-19). **Solution:** an app card holds only its panel; notes on it show in a note beside the card (linked), and Z fills the screen with the panel alone. Until then, hiding a card's notes (card-polish FE_02) covers it. Design to be discussed. | Maintainer, 2026-10-19 |
| M6 | An app card in a wide grid column leaves a blank strip | **Problem:** in grid mode a column wider than an app card stretches the card but not its panel, so a blank strip shows beside the panel. **Example:** an app card in a grid with a wider card in its column (card-polish FE_04, 2026-10-19). **Solution:** unknown; keep an app card at its panel's width in any column, or let the panel grow to the card. | FE_04, 2026-10-19 |
| M4 | A scroll that reaches a card's end pans the board | **Problem:** scrolling a card's text with a trackpad or wheel, the same gesture carries on into panning the board once the text reaches its end, so the board swipes away. **Example:** a long note scrolled hard to the bottom. **Solution:** a scroll gesture that started in a card stays in it; only the next gesture pans (gesture boundaries from a gap in wheel events, trackpad momentum included). Paused 2026-10-16: harder to get right than it looks, and ⌘ + drag already pans from anywhere. | Maintainer, 2026-10-16 (193) |
| M9 | A quick check that picks the page specs for what changed | **Problem:** the full page suite (667 specs, about 5 minutes on 5 workers) is too slow to run after every step of building. **Example:** in the overnight tidy-up each wave ran it twice (the task, then the gate), and TEST_01 spent over an hour of its two in full-suite runs. **Solution:** `npm run test:quick` runs unit tests, `check`, `verify` and only the page specs whose files reach what changed (from the module map, `npm run map`); the full suite runs before a merge or overnight. | Maintainer, 2026-10-27 (point 289) |
| M16 | The words check covers every part that speaks | **Problem:** packages/client is outside the words check and unlisted; packages/agent is excused as developer-only but sends refusals agents read. **Example:** client problem.ts's fallback sentence (VERIFY_01 F7). **Solution:** a client words file and a PARTS row; agent's refusals into a words file, or its reason in words.md corrected. | VERIFY_01 (tidy-up), 2026-10-27 |
| M17 | One pressed state and one button recipe | **Problem:** the pressed offset is written 21 times and four pattern buttons keep their own recipe. **Example:** `translateY(1px)` in 15 sheets (VERIFY_01 F8). **Solution:** a `--vb-press-y` token (the maintainer's yes) read by every press; pattern buttons take `.vb-btn` plus their size. | VERIFY_01 (tidy-up), 2026-10-27 |
| M18 | The board's state hooks carry its prefix | **Problem:** board rules key off generic ancestor names (.panning, [data-dragging], [data-zoom]). **Example:** a host that marks its page [data-dragging] while moving a pane (VERIFY_01 F10). **Solution:** `data-vb-*` / `vb-` names; verify's scope check holds context selectors too. | VERIFY_01 (tidy-up), 2026-10-27 |
| M19 | Format's schema tests sit with format | **Problem:** the schema and OpenAPI tests of packages/format live in apps/board/tests, because ajv's home is the server. **Example:** schema-v18.test.ts (VERIFY_01 F14). **Solution:** decide: a `#board/testing` export of the validator for format's tests, or a decision that the engine owns validation and its tests. | VERIFY_01 (tidy-up), 2026-10-27 |
| M20 | A folder another tab opened keeps a note's words | **Problem:** when another tab opens another folder (`apps/board/src/shell/folder.ts` `folderMoved`), the server has already switched before the page hears of it, so nothing can ask first; only the browser's "Leave site?" asks before the reload, and a Save from the stale page would write to the new folder. **Example:** a note half written in one tab while another tab picks a different folder. **Solution:** unknown; the server refuses an act from a page whose folder is stale, or the switch waits for every open page. | M11_01 (host-fixes-and-svg), 2026-10-27 |
| M23 | Animated GIF and PNG respect less motion | **Problem:** an animated GIF or PNG (APNG) in a card loops for ever, can't be paused and ignores the person's reduce-motion setting (WCAG 2.2.2), unlike an svg written to D-064's guidance. **Example:** a looping GIF in a card on a board someone reads for an hour. **Solution:** unknown; at least the skill tells agents to keep them short (as for svg); perhaps the card shows the first frame under reduce motion with a play control. | SVG_01 (host-fixes-and-svg), 2026-10-27; maintainer agreed (point 308) |
| M24 | A note's words survive its card being redrawn away | **Problem:** when an agent's redraw removes or replaces the card or container a note is being written on, the note closes and its unsaved words are lost with no question (`apps/board/src/board/notes/notes.ts` `place`); there is no moment to ask, since the person didn't act. **Example:** writing a note on card 12 while the agent redraws the board without it. **Solution:** unknown; keep the words and show them (a toast or a parked draft the person can copy or re-attach), never silently drop them. | M11_01 (host-fixes-and-svg), 2026-10-27; maintainer agreed (point 309) |
| M25 | A container's name matches once, on the container | **Problem:** searching a word that is in a container's title rings every card in it. **Example:** "pricing" on a 60-card board gave 13 matches, 11 only by the container's name (search-and-finding VERIFY_01 F5). **Solution:** a container-name match counts once, on the container's title line (ringed, stepped to), not on each card; cards match on their own fields. | VERIFY_01 (search-and-finding), 2026-10-28 |
| M26 | A bot with many requests folds them | **Problem:** a bot asking for nine containers pushes the next bot's group below the access strip's fold. **Example:** two bots, the first with nine requests (search-and-finding VERIFY_01 F12). **Solution:** past three rows a bot's group folds to "and 6 more" with Allow all still covering all; unfolds on click. | VERIFY_01 (search-and-finding), 2026-10-28 |
| M28 | The host-styles check is steady | **Problem:** two timings in `tests/pages/host-styles.spec.ts`. The mini boards' `.vb-size-glyph` arrowheads draw two ways after a far scroll, why not established; the check now shoots off, on, off on a first difference (Plugin Mode FIX_01), and so no longer catches a rule whose effect outlives the sheet. "The board in a 550px pane" sometimes sees the zoom's hidden status text or not. **Example:** plugin wave 3's gate (the pane), FIX_01's runs under load 50 (the gallery); the set's last full run passed both. **Solution:** find why the glyph draws two ways and go back to one pass; give the pane comparison a settled status text. | Orchestrator, 2026-10-28; 2026-10-31 |
| M30 | A remembered command runs only what the person saw | **Problem:** a remembered yes to a runner (`npm test`) runs whatever code the agent writes next, which can read `.env` or call the board as the person. **Example:** agent-access-and-working VERIFY_01 F7. **Solution:** unknown; e.g. a remembered runner yes ends when files it would run change, or runners are asked once per change. | VERIFY_01 (agent access), 2026-10-29 |
| M31 | A whole-folder command says what it reaches | **Problem:** a command on a whole folder (`cp -r .`, `tar`) is asked without saying the folder holds closed files. **Example:** VERIFY_01 F11. **Solution:** the question names the closed files under it, or such a command is refused in a board folder. | VERIFY_01 (agent access), 2026-10-29 |
| M32 | A search of the whole folder skips closed files | **Problem:** a search of the board's whole folder is refused because `.visionboard/agents.json` is always there. **Example:** VERIFY_01 F13. **Solution:** a search walk that leaves refused files out (ripgrep's own ignore files can't be trusted: the agent can write them). | VERIFY_01 (agent access), 2026-10-29 |
| M33 | Old attachments get cleared | **Problem:** attached files stay in `.visionboard/attachments/` for good, and a chip removed before Send leaves its file. **Example:** D-068 ruling 4. **Solution:** a way to clear them (by age, or from the board), decided with the person. | D-068, 2026-10-30 |
| M35 | The board's Send keeps words typed in the composer | **Problem:** the board's Send wipes words the person has typed in the composer. **Example:** type a message, press Send on the board. **Solution:** keep them, or send them with it; decide which. | COMPOSE_01 (chat attachments), 2026-10-30 |
| M36 | A clipped file name can be read without a mouse | **Problem:** a long name on a chip clips with the whole name in a tip, out of reach by keyboard and touch. **Example:** `quarterly-board-pack-final-….pdf`. **Solution:** a way to read it in full for both. | COMPOSE_01 (chat attachments), 2026-10-30 |
| M37 | Gallery heights don't depend on bundle order | **Problem:** `.g-chat` and `.chat-panel` have equal specificity, so a gallery height depends on which stylesheet loads first; a harmless change to the chunks moved screenshots. **Solution:** one wins by specificity, not by order. | COMPOSE_01 (chat attachments), 2026-10-30 |
| M38 | Attaching big files doesn't stall the page | **Problem:** turning a file into base64 runs on the page's main thread. **Example:** ten 10 MB files stall the page about 2.8 s (VERIFY_01 F8, measured once). **Solution:** one file at a time off the main thread, or a streamed upload. | VERIFY_01 (chat attachments), 2026-10-30 |
| M40 | A chat picker spec stops being flaky | **Problem:** `tests/pages/chat-panel.spec.ts` "pickers show their full labels" fails at `el.closest('chat-header')` with one worker and once in three full chat runs at four workers. **Example:** it fails the same way on a clean export of HEAD, so it predates chat attachments (FIX_01). **Solution:** find why the header isn't there yet, then wait for it. | FIX_01 (chat attachments), 2026-10-30 |
| M41 | Launchers can't hide a command from the rules | **Problem:** a command behind a launcher the rules don't know is asked, not judged. **Example:** `busybox git log`, `ionice git log`, `parallel git log`, `env -S "cat .env"` (FIX_01). A person still sees the command and can say no. **Solution:** widen `WRAPPERS` and read `env -S`, or decide a shell can't be fully judged and say so. | FIX_01 (chat attachments), 2026-10-30 |
| M42 | An approval says where a command runs | **Problem:** a command's `cwd` now reaches the policy, but the approval card doesn't show it, so the person sees a relative command without its folder. **Solution:** show `cwd` on the card when it isn't the board's folder (`packages/chat/src/approval/approval-core.ts`). | FIX_01 (chat attachments), 2026-10-30 |
| M43 | PowerPoint and Visio attachments | **Problem:** customers often send architectures as PowerPoint or Visio; `read_attachment` won't cover them at first. **Solution:** pptx is the same zipped XML (slides' text and pictures, as Word); Visio (`.vsdx`) needs its own look. | Maintainer, 2026-10-30 |
| M44 | Expanded attachments don't fill the disk | **Problem:** a 10 MB zip can expand to 200 MB per call, each call makes a new folder (up to 999 per file), and a re-read Word file makes another pictures folder. Nothing limits a day's total. **Solution:** with M33: reuse a folder already expanded from the same file, and a cap on a folder's total. | READ_01 (read attachment), 2026-10-30 |
| M45 | A PDF inside a zip gets its pages | **Problem:** pages are made in the page's frame when a PDF is attached; a PDF expanded from a zip is on the server, which can't render. On Kiro it is a dead end, and the tool says so. **Solution:** the page renders it on request through the same frame. | VERIFY_01 (read attachment), 2026-10-31 |
| M46 | More attachment formats and parts | **Problem:** HEIC, TIFF and BMP attached directly aren't fitted or seen; a poster-size PDF page; Word's headers, footnotes and comments aren't read. **Solution:** add as they turn up in real documents. | VERIFY_01 (read attachment), 2026-10-31 |
| M47 | Read and approve in Chrome and Firefox | **Problem:** the suite runs Chromium builds only; Safari passed a small run in VERIFY_01; Firefox and Google Chrome itself aren't established for the PDF frame. **Solution:** a real look in each, then a project if worth keeping. | VERIFY_01 (read attachment), 2026-10-31 |
| M48 | Settle the plugin's open points, then bring it into nclite | **Problem:** the folder is built and proven on a fake host (Plugin Mode), and `docs/specification/plugin.md` § Open points holds 11 rulings for the maintainer, pictures for a plugin bot first (a `put_image` tool is recommended, not built). `dist/plugin/board/skill.md` hasn't run against scenarios on a real model. **Example:** a bot under a host has no way to name a picture's folder. **Solution:** the maintainer rules on the open points and reads the skill; nclite's list is the last section of `plugin.md`. | Plugin Mode, 2026-10-31 |
| M49 | `x-hosts` lives in the tool table's source | **Problem:** `x-hosts` is read in `scripts/gen-api.mjs` and could move into `toolTable` (`scripts/gen-tools.mjs`), so one file says what a tool is and who gets it. **Example:** PROOF_01's request. **Solution:** move it when next in that code. | PROOF_01, 2026-10-31 |
| M50 | Claude Code is told the board's reason for a closed file | **Problem:** on Claude Code a closed file (`.env`, `.visionboard/agents.json`) is refused by its own `permissions.deny` (`packages/agent/src/claude-args.ts` `claudeDenyRules`) before the board's gate sees it, so the agent reads Claude Code's generic "denied by your permission settings", never the board's sentence for that rule. Kiro gets the board's. **Example:** the Claude Code live test, 3b (`temp/cc-live/cc-b3-inside-closed.log`); the agent still explained it right. **Solution:** let the gate refuse closed files with the rule's words and keep the deny rules as the second line, or say in the skill what the generic refusal means. | Maintainer, 2026-11-02 (390) |

## LONG TERM

| ID | Item | Why | Source |
|---|---|---|---|
| L1 | More layout modes: tree, timeline, matrix, layers, text | **Problem:** the vision lists nine modes and five exist. **Example:** `docs/vision.md` § Layout modes. **Solution:** add each once one container is excellent (v2 item 22). | `docs/vision.md` |
| L2 | Share patterns with Studio and the Uplynk architecture repo | **Problem:** ideas proven here need to reach Uplynk. **Example:** `<vb-node>` for the architecture diagrams. **Solution:** extract into a shared package once a pattern is stable in both. | Maintainer, 2026-10-01 |
| L3 | Hosted version | **Problem:** it may become a product. **Example:** maintainer, framework interview. **Solution:** add SvelteKit (D-012) and swap `packages/agent` for a hosted connection. | D-012 |
| L4 | Expand a long card into a modal | **Problem:** a card with a lot of text grows too tall. **Example:** a finding with a long evidence list. **Solution:** a max card height from a token with a "Show more" control first; a modal that shows the full content later. | Maintainer, 2026-10-02 |
| L5 | Self-host Architect's fonts | **Problem:** Figtree, Bricolage Grotesque and IBM Plex Mono load from Google, which rule 18 forbids, so the board uses system fonts. **Example:** mockup 01b. **Solution:** a decision entry, then bundle the OFL-licensed font files. | D-024, 2026-10-02 |
| L6 | One board views a second ledger | **Problem:** a board shows one folder's ledger only. **Example:** looking at another repo's board, copying a card across, then closing it. **Solution:** unknown; needs U12 first. | Maintainer, 2026-10-09 (407A) |

## PARKED

| ID | Item | Waiting on | Source |
|---|---|---|---|
| — | — | Nothing parked | — |

---

## WORKAROUNDS

| ID | Shortcut | Why taken | How it ends |
|---|---|---|---|
| — | — | No workarounds in place | — |
