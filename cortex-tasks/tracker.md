---
category: project-docs
type: tracker
status: active
created: 2026-09-30
last_updated: 2026-11-16
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

## NEAR TERM

| ID | Item | Why | Source |
|---|---|---|---|
| N1 | Contrast gate for the three APCA tiers | **Problem:** token colours are hand-picked and unchecked. **Example:** `packages/tokens/src/tokens.css` TODO. **Solution:** port Studio's contrast check, tiered per D-009. | HANDOVER gap 13 |
| N2 | JSON Schema for the view and transcript | **Problem:** rule 6 needs versioned schemas, and today it's a TypeScript validator only. **Example:** `packages/format/src/validate.ts`. **Solution:** schema files, with docs generated from them. Done as U4 step 1 (D-022). | Rule 6 |
| N5 | Install Prettier | **Problem:** D-007 names Prettier as the formatter, and it isn't installed. **Example:** D-014 lists five packages, Prettier isn't one. **Solution:** pin it, add it to `dependencies.md`, add a `format` check to `verify`. | D-007 |
| N9 | Board settings instead of address flags | **Problem:** feature flags are switched by adding `?flags=` to the address, which a person won't know or remember. **Example:** card sizes need `?flags=nodeSize`. **Solution:** a settings panel on the board for flags and board preferences, saved per person; design to be discussed. Include two switches from D-032: hide the dot grid, and a very light blur behind cards (off by default). | Maintainer, 2026-10-05 |
| N11 | The person edits a card's text | **Problem:** only the agent can change a card's text; the person can only ask for a change in a note. **Example:** fixing a wrong word in a finding without a round trip. **Solution:** a person edit becomes a new version of the node in the ledger (D-017, D-018), shown like any other version; design to be discussed. Notes stay append-only: an edited note shows its latest text, earlier text kept in history (chat 664). When the agent next reads the board, the change must reach it wrapped in a short message saying what the person changed and from which version; the agent skill (rule 17) explains how to treat it (chat 718). | Maintainer, 2026-10-05 |
| N12 | Performance budgets enforced | **Problem:** rule 15's budgets are mostly unchecked, and the page re-fetches and re-measures the whole board on every change. **Example:** `controller.ts` `watch` calls `openBoard`; `relayout` measures every card. **Solution:** `docs/specification/performance.md`: incremental updates, per-container layout, measure only changed cards, skip off-screen cards, ledger checkpoint; **Built 2026-10-05 (N12_FE_01): incremental updates, per-container layout, counting and timing tests; follow-up N15.** a 1,000-card page test, a page test that changes 50 cards (and 1) and counts that only those cards and their containers were redrawn, and a page-weight check, before Stage 3. | Maintainer, 2026-10-05 |
| N14 | Remove and purge a sent note | **Problem:** a sent note can't be taken out of history, and the ledger only ever adds lines (D-017), so a hidden note's text stays on disk. **Example:** a note holding something that shouldn't reach AI models in future chats; the board outlives any one chat and becomes context for new ones. **Solution:** Remove hides a sent note from the board and every agent read; Purge also blanks its stored text, after a confirm, recording who and when. Purge is the one exception to append-only, so it needs a decision entry first. It can't recall text an agent already read in its own chat (delete that chat). Purge must also blank the text in `read_ledger`, which today returns every raw line to any agent, including a note's earlier wording and removed notes. 2e leaves the seam. | Maintainer, 2026-10-05 (742-745) |
| N15 | Opening a board reads the whole project ledger | **Problem:** since N12 the page builds its state from the raw ledger, 500 lines per call, so opening a board costs about 200 calls on a 100,000-event project; JavaScript work per batch is still across all cards (only the page's drawing work is proportional). **Example:** a project a year old. **Solution:** open from a server-folded snapshot at a `seq` (the server already folds; checkpoint, performance.md 7), then apply lines after it; drop the page's copy of `getBoard` (`board-data.ts`) once the server shares it. Measure first with a generated 100,000-event project. | N12_FE_01, 2026-10-05 |
| N16 | Read a chosen list of cards in one call | **Problem:** an agent checking several cards before it changes them needs one `show_node` per card, or the whole `get_board`. **Example:** verify cards 12, 15 and 31 before a redraw. **Solution:** one read taking several numbers (contract first, api.md); until then `get_board` covers it. | Maintainer, 2026-10-06 (959, 997) |
| N23 | Rewind to a version | **Problem:** a past version can only be viewed. **Solution:** a Rewind to this version action; design to be discussed (append-only ledger). | Maintainer, 2026-10-07 (154) |
| N26 | Other proposals: content changes, and agents without write access | **Problem:** a proposal can only acknowledge or drop a card. **Example:** an agent that may read a board but not write on it suggests a change to a card. **Solution:** the card proposal box (Stage 5, `bindCardPopover`) carries the new kinds; needs a contract change and a permissions row. | Maintainer, 2026-10-08 (220) |
| N28 | Launcher and desktop app | **Problem:** starting the board means typing `npm run board` in this repo. **Example:** opening the board without a terminal. **Solution:** a launcher on a fixed port with Launch/Stop/Open, a registry of running boards so `vb-mcp` finds its board by folder, a small app built per computer (chat 398, 402, 403). Paused by the maintainer until U12 is in use. | Maintainer, 2026-10-09 |
| N38 | Agents draw a container per area with links between them | **Problem:** in skill v2.5 runs the model drew one container per area with 7-8 links between containers instead of lanes or a phase flow; it also sets `size` on every card and ends with long chat words. **Example:** batch 3 T_01 runs (scenario 17). **Solution:** a firmer skill rule (named areas with handoffs: lanes or a phase flow), or `show_layout` reporting links that leave the container; test against scenario 17. | VERIFY, 2026-10-11 |
| N46 | A plugin host gives its own read-only words | **Problem:** the person's read-only sentence (`READ_ONLY_PERSON`, "press Edit") assumes the standalone page's Edit button; a host may draw none. **Example:** nclite shows the board read-only and the refusal names a button it lacks. **Solution:** a hook on the engine the host plugs its own words into (maintainer, 405). | ledgers-and-read-only (2026-11-03) PLUGIN_RO_01, point 405 |
| N48 | A container's pill and its cards' tabs agree | **Problem:** selecting one card in a container removes the container's teal border and pill, while its other cards keep their NEW and "N updates" tabs and the toolbar still counts them; `docs/specification/components.md` says they never disagree. **Example:** VERIFY_01 finding 7 (insert-markdown-signals). **Solution:** the pill counts what is still unseen inside, or the doc says what selecting one card does. | insert-markdown-signals VERIFY_01, 2026-11-05 |
| N49 | Two links into one card both show their label | **Problem:** where two links enter one card (after an insert, say), one link's label ("then") is not drawn; the ledger has it. **Example:** VERIFY_01 finding 11 (insert-markdown-signals). **Solution:** the label placer gives each incoming link's label its own spot. | insert-markdown-signals VERIFY_01, 2026-11-05 |
| N50 | A proposal made right after a change shows its tab | **Problem:** a proposal at version 2, written straight after the agent's version-2 change, sometimes never shows its tab on the card (2 of 4 test runs); proposing first and changing after is steady. **Example:** tab-place task notes (2026-11-05). **Solution:** look at `proposal-flow.ts` `refresh` / `answerable` for the order the two lines arrive in. | tab-place task, 2026-11-05 |
| N54 | Size pass back to the budgets | **Problem:** the new node outweighs the footer it replaced; budgets are held temporarily at measured figures. **Example:** page 201.3 KB of 200; plugin view JS 195,500 of 190,000; CSS 24,950 of 22,000. **Solution:** a size pass (lazy parts, dead CSS, `data-edges` qualifiers) until the original budgets pass, then restore them. | Node Overhaul close (T_04, VERIFY_01, FIX_01-05) |
| N55 | A fast page suite | **Problem:** the page suite takes about 13 minutes on 4 workers (1,068 tests, 2,628 s of test time). **Example:** the timing report of 2026-11-18: `host-styles.spec.ts`'s two gallery tests take 265 s and 258 s (4.7 and 4.9 min alone after the timeline, limit raised to 8 min), 20% of all test time and the floor under the wall clock; screenshot tests are 18%; then `gallery`, `layout-controls`, `chat-attach-gallery`, `board` (each layout mode, 29 s). **Solution:** split host-styles into one test per gallery section (so it spreads across workers), same for the other whole-gallery tests; one board server per worker where specs allow; record per-test timing on every full run; then M9 (pick the specs for what changed). Target: the full suite under 5 minutes. | Maintainer, 2026-11-18; Node Overhaul close |

## MEDIUM TERM

| ID | Item | Why | Source |
|---|---|---|---|
| M51 | Stream board updates as the agent writes | **Problem:** an agent sends a whole update in one message, so a node changes all at once. **Example:** "give me more context" on a node; the person sees nothing until the agent finishes. **Solution:** stream an update into the node as it is written, drawn as "Agent writing" with changes underlined and struck (design DD-17, artboard 12); needs a streaming path from agent to board. | Maintainer, 2026-11-15 |
| M1 | Versions, change highlights, Confirm these, Approve | **Problem:** you re-read the whole board each version. **Example:** Architect's v1/v2/v3 with Changed and New badges. **Solution:** port the behaviour, not the code. | `docs/vision.md` |
| M3 | Generated pattern index | **Problem:** "does this pattern exist?" has no generated answer yet. **Example:** D-006. **Solution:** generate `docs/patterns/` from each `pattern.json`. | D-006 |
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
| M48 | Run the plugin skill live, then bring the plugin into nclite | **Problem:** the folder is built and proven on a fake host (Plugin Mode); `docs/specification/plugin.md` § Open points are all settled (2026-11-02: points 377, 391, D-075 to D-082). `dist/plugin/board/skill.md` hasn't run against scenarios on a real model. **Example:** a bot under a host is told to put pictures in the board folder its host names (D-077); no real model has tried it. **Solution:** a short live run of the skill on a real model; then nclite, whose list is the last section of `plugin.md` (378: tested there). | Plugin Mode, 2026-10-31; 2026-11-02 |
| M49 | `x-hosts` lives in the tool table's source | **Problem:** `x-hosts` is read in `scripts/gen-api.mjs` and could move into `toolTable` (`scripts/gen-tools.mjs`), so one file says what a tool is and who gets it. **Example:** PROOF_01's request. **Solution:** move it when next in that code. | PROOF_01, 2026-10-31 |
| M50 | Claude Code is told the board's reason for a closed file | **Problem:** on Claude Code a closed file (`.env`, `.visionboard/agents.json`) is refused by its own `permissions.deny` (`packages/agent/src/claude-args.ts` `claudeDenyRules`) before the board's gate sees it, so the agent reads Claude Code's generic "denied by your permission settings", never the board's sentence for that rule. Kiro gets the board's. **Example:** the Claude Code live test, 3b (`temp/cc-live/cc-b3-inside-closed.log`); the agent still explained it right. **Solution:** let the gate refuse closed files with the rule's words and keep the deny rules as the second line, or say in the skill what the generic refusal means. | Maintainer, 2026-11-02 (390) |
| M55 | Agent reads of the ledger find their place fast | **Problem:** `read_ledger` scans every event on every call. **Example:** 20,000,000 event visits to open a board at 100,000 lines. **Solution:** binary search for the cursor and slice (`apps/board/server/engine/reads.ts` `readLedger`). | `cortex-tasks/board/2026-11-16_board-format_research_ledger-review.md` R12, S2 |
| M56 | The page opens a board from a snapshot | **Problem:** the page loads the whole project ledger, 500 lines per call, to open a board; the first thing to break as a ledger grows. **Example:** tracker N15. **Solution:** a server-folded snapshot plus the lines after it (`live.ts`, `reads.ts`, `openapi.json`). | `cortex-tasks/board/2026-11-16_board-format_research_ledger-review.md` R13, S1 |
| M57 | `check_responses` reads from its cursor | **Problem:** it walks every act of every board on every wake. **Example:** cost grows with every act ever made. **Solution:** read acts per board from the cursor (`pending.ts` `responsesAfter`, `latestMarks`; `fold.ts` `LedgerState.acts`). | `cortex-tasks/board/2026-11-16_board-format_research_ledger-review.md` R14, S3 |
| M58 | One table of act shapes | **Problem:** every new act is edited into several sets. **Example:** the node overhaul adds `ask`, `direction`, `skin`, `icon`. **Solution:** a row per action (`ledger-shape.ts`, `ledger.ts`, `packages/actions/src/registry.ts`, the act schema). | `cortex-tasks/board/2026-11-16_board-format_research_ledger-review.md` R15, H8 |
| M59 | Realistic ledger timings and budgets | **Problem:** the one size budget is measured on lines unlike real ones. **Example:** no budget for `read_ledger` or `check_responses`. **Solution:** a current-format timing ledger and budgets at 100,000 lines (`server-start.timing.ts`, `perf-ledger.ts`, `performance.md`). | `cortex-tasks/board/2026-11-16_board-format_research_ledger-review.md` R16, S5 |
| M60 | Ask now with node-only or session context | **Problem:** Ask now gives the agent the node plus the board; the `node` and `session` contexts are recorded but not built. **Example:** a node-only exchange that should not pull the board. **Solution:** build both and a control for the setting. | Node Overhaul PLAN call 1 |
| M61 | Accept a changed library icon | **Problem:** a project icon's drawing can change after boards use it. **Example:** an agent redraws `x-queue`. **Solution:** a page control to accept the new drawing. | Node Overhaul PLAN call 12 |
| M62 | The key-help button covers a panned node | **Problem:** the fixed "?" button sits over marks of a node panned under it. **Example:** "Bookmark item 24" was partly hidden (FIX_01). **Solution:** keep marks clear of fixed chrome, or move the button. | Node Overhaul close (T_04, VERIFY_01, FIX_01-05) |
| M63 | A container's hover tip stays open after a zoom | **Problem:** a zoom that moves the tip's anchor from under a still pointer leaves it open. **Example:** it once ate an Esc (FIX_01). **Solution:** close tips on zoom. | Node Overhaul close (T_04, VERIFY_01, FIX_01-05) |
| M64 | The router's jog and a shared line | **Problem:** a straight main line jogs where a card has a second link on the same side; seed 174 of `routing.test.ts` shares about 180px of line. **Solution:** keep the main line's port centred; fix the shared run. | Node Overhaul close (T_04, VERIFY_01, FIX_01-05) |
| M65 | The crowded header at 1530-1550px | **Problem:** the crowded full bar overlaps by 5px just above the 1500 breakpoint; Flows' width moved the tiers (full from 1428px, Edit from about 1513px). **Solution:** remeasure or narrow Flows. | Node Overhaul close (T_04, VERIFY_01, FIX_01-05) |
| M66 | Command Lens plate marks have no minimum zoomed out | **Problem:** plate marks shrink with the node (about 5-10px at 40%). **Example:** VERIFY_01 should-fix 6. **Solution:** the maintainer's call; the smallest change grows the plate's type. | Node Overhaul close (T_04, VERIFY_01, FIX_01-05) |
| M67 | Drop the always-present `data-edges` | **Problem:** every node carries it now; about 74 selectors qualify on it. **Solution:** remove it with a screenshot pass. | Node Overhaul close (T_04, VERIFY_01, FIX_01-05) |
| M68 | Remeasure container collapse thresholds | **Problem:** the narrow (408/568px) and rail (249/275px) thresholds were set for six layout icons; there is one button now. **Solution:** remeasure. | Node Overhaul close (T_04, VERIFY_01, FIX_01-05) |
| M69 | Branching never adds crossings: test it again | **Problem:** "branches never cross more than the stacked flow" is no longer tested after T_04. **Solution:** restore the property test. | Node Overhaul close (T_04, VERIFY_01, FIX_01-05) |
| M70 | Unread replies on the board | **Problem:** the box marks replies read as it opens, so the amber unread edge never shows; `updateSignals` and `--vb-badge-updated` disagree. **Solution:** rule which is meant. | Node Overhaul close (T_04, VERIFY_01, FIX_01-05) |
| M71 | Frozen gallery fixture bodies describe the old node | **Problem:** `gallery.ledger.jsonl` lines 65, 123, 125, 144, 146, 156, 260, 272, 334 describe the footer; `legacy-folds.test.ts` pins them. **Solution:** a ruling: rewrite in a migration-safe way or leave. | Node Overhaul close (T_04, VERIFY_01, FIX_01-05) |
| M72 | Retire `notes-hide` and `notes-show` | **Problem:** the page no longer sends them. **Solution:** a format step (D-103). | Node Overhaul close (T_04, VERIFY_01, FIX_01-05) |
| M73 | The app frame's click-in is the only behaviour | **Problem:** `vb-app-frame` `clickIn` is always true now. **Solution:** remove the option. | Node Overhaul close (T_04, VERIFY_01, FIX_01-05) |
| M74 | Gallery: the changed-cards history box draws no rows | **Problem:** a gallery sample's history box is empty. **Solution:** feed it rows. | Node Overhaul close (T_04, VERIFY_01, FIX_01-05) |
| M75 | Fold kind, action and mode icons into the icon set | **Problem:** `KIND_ICON`, `ACTION_ICON`, `MODE_ICON` live outside the one icon set. **Solution:** fold them in (architecture rule 8). | Node Overhaul close (T_04, VERIFY_01, FIX_01-05) |
| M76 | A hover pause on the number's menu | **Problem:** open question whether the number's menu should open on a hover pause. **Solution:** the maintainer's call. | Node Overhaul close (T_04, VERIFY_01, FIX_01-05) |
| M77 | Ctrl+press on a Mac | **Problem:** Ctrl+press on a node now keeps the board's meaning (select or pan) and never opens the actions list. **Solution:** check it suits trackpad users. | Node Overhaul close (T_04, VERIFY_01, FIX_01-05) |
| M78 | Gallery samples: two older faults | **Problem:** the "Branches on rows" sample runs past its section; the selection bar sample's caption names Remove, which its bar lacks. **Solution:** fix both. | Node Overhaul close (T_04, VERIFY_01, FIX_01-05) |
| M79 | Tune momentum detection on a real trackpad | **Problem:** FIX_05's decay and rise numbers (4 events, 1.5x, 3px, 15%) are untested on the maintainer's hardware. **Solution:** a look on his machine; tune the named constants in `wheel-latch.ts`. | Node Overhaul close (T_04, VERIFY_01, FIX_01-05) |
| M80 | Select a container | **Problem:** the open-corner frame's selected style is ready (`data-selected`) but nothing sets it. **Solution:** decide whether a container can be selected on its own. | Node Overhaul close (T_04, VERIFY_01, FIX_01-05) |
| M81 | Seen on a read-only board | **Problem:** a read-only board can't record what the person looked at (DO-05). **Solution:** left for later. | Node Overhaul close (T_04, VERIFY_01, FIX_01-05) |
| M82 | Which layout modes to keep | **Problem:** U16's "fewer layouts" was left open: one control now offers all six. **Solution:** the maintainer's call once used. | Node Overhaul close (T_04, VERIFY_01, FIX_01-05) |
| M83 | Fonts in the plugin | **Problem:** nclite's stylesheet check refuses `@font-face`, so the plugin brings no font (option C). **Solution:** option A, nclite lets a plugin's sheet name a woff2 in its own folder (an nclite change). | Node Overhaul close (T_04, VERIFY_01, FIX_01-05) |
| M85 | The year on a timeline at Fit | **Problem:** the year label on a timeline's line is 11.5px in the world, about 6px on screen at Fit, and it is the only place a day's year shows. **Solution:** a `ZOOM_RULES` row that keeps it a readable minimum, as container titles are; the maintainer's call (point 597: left for now). | Timeline VERIFY_01 (S2) |
| M86 | Links around a timeline's line | **Problem:** run down, a link from a card left of the line to one on its right can run along the line over several dots. **Solution:** the router treats the line and its dots as an obstacle it crosses once, at right angles (point 600). | Timeline VERIFY_01 (S1) |
| M87 | Date order moves a card without `moveBefore` | **Problem:** a container's date order can move a card already in the page; where the browser has no `moveBefore` (Safari today) a loaded app panel reloads and a focused card loses focus, when an agent's write changes the order. **Solution:** check in Safari; keep focus across the move, and hold an app card's place where the browser can't move it alive. | Timeline FIX_03 |
| M88 | The same-date band, and the date's size | **Problem:** the same-date band is faint in dark (Lc 0-12); the maintainer wonders if the timeline date (23px) is a little large. **Solution:** look again when used (point 604: leave for now); both are token changes. | Timeline result review |
| M89 | Small things from export, import and print | **Problem:** a container imported into its own board keeps its title (two "Review" side by side); Command Lens prints its Tick and Cross rows (an empty form on paper); the agent's `dropped` repeats one line per answer; a refused item's pointer can name the wrong card when conditioning removed an earlier one. **Solution:** each a small fix when used. | Export, import and print VERIFY_01 |

## LONG TERM

| ID | Item | Why | Source |
|---|---|---|---|
| L2 | Share patterns with Studio and the Uplynk architecture repo | **Problem:** ideas proven here need to reach Uplynk. **Example:** `<vb-node>` for the architecture diagrams. **Solution:** extract into a shared package once a pattern is stable in both. | Maintainer, 2026-10-01 |
| L3 | Hosted version | **Problem:** it may become a product. **Example:** maintainer, framework interview. **Solution:** add SvelteKit (D-012) and swap `packages/agent` for a hosted connection. | D-012 |
| L4 | Expand a long card into a modal | **Problem:** a card with a lot of text grows too tall. **Example:** a finding with a long evidence list. **Solution:** a max card height from a token with a "Show more" control first; a modal that shows the full content later. | Maintainer, 2026-10-02 |
| L6 | One board views a second ledger | **Problem:** a board shows one folder's ledger only. **Example:** looking at another repo's board, copying a card across, then closing it. **Solution:** unknown; needs U12 first. | Maintainer, 2026-10-09 (407A) |
| L7 | Containers as screens, and a board as big as its content | **Problem:** long rows in a free container become uncomfortable, and an infinite canvas has no natural screen. **Example:** maintainer's vision, 2026-11-16: a container grows towards 16:9; zoomed in it fills the screen and locks, like a desktop, with no reflow; apps in front are live and those behind show a snapshot; shortcuts step between them; a node can be anything, an app or a browser. **Solution:** experiment once the URGENT items are done: the board drawn to the extent of its content, rules for a container's size and place, and the zoom-and-lock. | Maintainer, 2026-11-16 |
| L8 | A radial view for relationship nodes | **Problem:** radial layout today is not helpful for ordinary nodes. **Example:** Obsidian's graph: headline nodes, relationships drawn as links, details in a popover on hover. **Solution:** define relationship nodes and a radial skin for them; radial mode stays until then. | Maintainer, 2026-11-16 |
| L9 | Ledger state split into current and history, then checkpoints | **Problem:** memory and start time grow with the file. **Example:** a checkpoint of today's state would be as big as the ledger. **Solution:** split `LedgerState`, then checkpoint (`fold.ts`, `board-view.ts`). | `cortex-tasks/board/2026-11-16_board-format_research_ledger-review.md` R17 |
| L10 | Sealed ledger segments | **Problem:** one ever-growing file in a synced folder. **Example:** a long-lived project board. **Solution:** sealed segments; needs a decision (D-017). | `cortex-tasks/board/2026-11-16_board-format_research_ledger-review.md` R18 |
| L11 | Streamed updates kept out of the ledger | **Problem:** streaming (M51) would flood the ledger. **Example:** a node rewritten word by word. **Solution:** short-lived stream messages, one `node` line at the end. | `cortex-tasks/board/2026-11-16_board-format_research_ledger-review.md` R19 |
| L12 | One writer for a host's ledger folder | **Problem:** two writers on a host's `dir` lose a line silently. **Example:** two nclite windows. **Solution:** a lock, or the written single-opener rule (`plugin.md` open point 14). | `cortex-tasks/board/2026-11-16_board-format_research_ledger-review.md` R20, H11 |
| L13 | What "stored" promises | **Problem:** D-075 leans on a stored line, but lines are not flushed. **Example:** power loss right after an answer. **Solution:** flush each line, or say plainly the last lines can be lost; needs a decision. | `cortex-tasks/board/2026-11-16_board-format_research_ledger-review.md` R21, H12 |
| L14 | Show skipped ledger lines | **Problem:** a skipped line changes the board without a word. **Example:** a malformed line from a hand edit. **Solution:** surface `Ledger.problems` on the page. | `cortex-tasks/board/2026-11-16_board-format_research_ledger-review.md` R22, H13 |
| L15 | Private marks carry their person | **Problem:** a bookmark is one person's, but the line does not say whose. **Example:** a second person on the board. **Solution:** `person` on private marks (D-018). | `cortex-tasks/board/2026-11-16_board-format_research_ledger-review.md` R23 |
| L16 | A card's identity as `id` in the file | **Problem:** `n` means two things. **Example:** H9. **Solution:** only if another change already touches every line; a decision replacing part of D-041. | `cortex-tasks/board/2026-11-16_board-format_research_ledger-review.md` R24 |
| L17 | Raise the migration floor | **Problem:** the upgrade chain only grows. **Example:** steps for formats no ledger holds. **Solution:** by decision, delete the oldest steps. | `cortex-tasks/board/2026-11-16_board-format_research_ledger-review.md` R25 |

## PARKED

| ID | Item | Waiting on | Source |
|---|---|---|---|
| — | — | Nothing parked | — |

---

## WORKAROUNDS

| ID | Shortcut | Why taken | How it ends |
|---|---|---|---|
| — | — | No workarounds in place | — |
