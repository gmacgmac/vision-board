# VERIFY_01 — One check per ruling

Model: standard · Ports: 8740

Check each of PLAN § Decisions 1-6 once, with evidence (commands, outputs, screenshots), in a temporary HOME, never
port 4466, never a real Finder dialog: 1 each allowed and refused kind of folder; 2 the MCP answers `wrong-folder`
from a folder outside the open one and never finds a board above its working folder; 3 a label on a short elbow sits
in the gap, a long one is a tag with hover, print shows labels whole (PDF); 4 the skill sentence and the eval result
recorded by T_03; 5 agent and person chat text computed sizes equal; 6 the plugin calls `print(ask)` with look and
orientation (the plugin test host), no `@page` names or print theme attribute in the board's CSS, an over-limit
import refused before posting. Fix nothing; list fixes.

## Implementation Notes

### VERIFY_01 (2026-11-20, standard) - one check per ruling

Evidence folder: `temp/verify01/` (a folder that already existed there; my files: `home/` the temporary HOME, `proj/`, `other/`, `above/`, `mcp.mjs`, `pdf.mjs`, `zoom.mjs`, `chatsize.mjs`, `labels-print.pdf/.png`, `labels-print-zoom.png`, and logs `pw.log`, `plug.log`, `chat.log`, `server.log`, `static.log`; if an older file there shared one of those names it was overwritten). Ports 8740/8741 only, both stopped. `HOME` was `temp/verify01/home` for every command (Playwright browsers read from the real cache path, read only).

| # | Ruling | Result |
|---|---|---|
| 1 | Folders | PASS (unit + API tests; no real Finder) |
| 2 | No hunting | PASS live; wording nit |
| 3 | Link labels | PASS on screen; print whole PASS with a nit |
| 4 | Skill sentence + eval | PASS (eval result read from T_03's notes, not re-run) |
| 5 | Chat text size | PASS |
| 6 | Print through the host | PASS |

**1** `node --test` on `folder-places`, `api-folder-chooser`, `api-project`, `api-cloud-places`, `recent` and `packages/mcp/tests/{project,session,tools}`: 82 pass, 0 fail. `folder-places.test.ts` runs the real `placeProblem(placesOf(home))`: allowed home itself, under home, `/Volumes/Example-Drive`, `/Volumes/Share/team/atlas`, `/Users/Shared`, `/Users/Shared/team`; refused `/` and `/Users` (holds-home), `/Users/someone[/projects]` and `/Users/examples` (other-home), `/Volumes` itself, `/System/Library`, `/Library`, `/Applications`, `/usr/local/src`, `/private/var/folders`, `/opt/atlas` (system), and any dotted part (`.config`, `.timemachine`, `.cache`: hidden). `api-folder-chooser.test.ts` covers the same through the server with the injected chooser (typed path outside home refused until a pick; recent keeps it trusted; home and `/Users/Shared` open; line break refused). Only not seen: the real Finder dialog (by rule) and the real `/Volumes`, `/Users` (the tests stand in temp roots).

**2** Live: board on 8740 (`VB_PROJECT=temp/verify01/proj`), `vb-mcp` run per working folder (`mcp.mjs`, `list_boards`): cwd `other/` (a folder outside): `isError`, "The board has switched to .../proj. Your work is in .../other. Ask the person to open it again; don't join here." (wrong-folder); cwd `above/deep/er` (a board folder, `above/.visionboard`, sits two levels up): the same wrong-folder, the MCP names `above/deep/er` as its folder and never finds `above`; cwd `proj` and `proj/sub`: the boards list; cwd `other` with `VB_PROJECT=proj`: the boards list. Unit: `packages/mcp/tests/project.test.ts` "no walk up".

**3** On screen: `layout-controls.spec.ts` (12 pass: place tests, hover/focus/Esc, light and dark baselines + axe). Baseline `link-labels-light-darwin.png` looked at: "feeds" on its upright piece, "next" just above its short level piece in the gap, "when a note fits no theme" centred on its upright, "once every note has been read" is the tag "once..." with a hairline border, and the Stacked sample puts "unblocks" just right of the line; the third sample floats the whole label (hover). Never a bare dot. Print: gallery in print emulation, `temp/verify01/labels-print.pdf` (and the 2x `labels-print-zoom.png`): the tag's short words are hidden, the whole label "once every note has been read" is shown, wrapped on two lines.

**4** `skills/vision-board/source/references/layouts.md` line 21 (built to `skills/vision-board/references/layouts.md` and `dist/plugin/vision-board/references/layouts.md`): "Label a link only when it means more than "next" ("blocks", "feeds", "needs"), in short, simple words; anything longer goes in a card's body."; the worked example's link label is "blocks". Status line v3.38. T_03's eval record (NOTES.md "Skill v3.38"): live Haiku 5.5, plugin, 16 runs, 113/114, $0.0424, the one miss `insert-step` reads-references (since v3.35); dry run 114/114. I did not re-run it (rule). No `tests/evals/bot/out/2026-11-20*` run folder is in this worktree, so the record is the notes alone.

**5** Gallery, both colour schemes, computed font-size: person bubble 16px; all nine agent bubbles 16px; agent paragraph (`.vb-md-p`) 16px (`chatsize.mjs`). `chat.spec.ts` 12 pass incl. the new size test. The one rule is `chat-host.css` `chat-message .chat-bubble { --vb-md-text: var(--chat-text); }`, scoped to the chat, so card text (13px, 654) is not touched; I did not measure a card body.

**6** `tests/plugin` `print.spec.ts` (3), `read-only`, `round-trip`: 8 pass. Fake host records: two prints, each `keys` = `look, orientation, title`, `title` "Plans", `look` dark then light, `orientation` portrait/landscape from the fit, no `content`; `<html>` attributes unchanged; root attributes during the print only `data-vb-print`, `data-vb-print-border`; a rejected print shows the host's sentence via `notify` as an error; no print hook, no Print item. `grep -E "@page|print-theme"` over `apps/board/src` and `packages/*/src`: only `shell/page-files.ts` (the standalone host's own paper rule) and a comment in `print.css`; the built `dist/plugin/vision-board/view/board.css` and `board.js`: 0 `@page`, 0 `print-theme`. Import: `board-files.test.ts` "import refuses a file over the host's limit with words, before reading or sending it": `importFile` returns the "That file is over 1 MB..." problem and no `import` call is logged; a file at the limit goes. (Unit level; no plugin-host spec drives an over-limit import.) `plugin-types.test.ts` 20 pass (shapes held equal to the contract).

### Findings and fixes to list (none made)
1. **Print, the whole label covers card corners and the arrowhead.** In the print of the gallery sample "once every note has been read" wraps on two lines (about 110px wide) in a gap of about 72px, so its box overlaps the corners of cards 1 and 2 and hides the arrowhead of that link (`labels-print-zoom.png`). Words are whole (PLAN 3 met), but a printed page loses the arrowhead. Fix: in `board.css` `@media print`, give a long whole label room by drawing it below the line outside the card box, or cap its width to the gap, or keep it out of the arrowhead.
2. **wrong-folder wording says "switched" when the board never was in that folder.** The text "The board has switched to X. Your work is in Y." is shown to an agent that simply started outside the open folder. Fix: one sentence for "started in another folder than the board's" in the words file (the `switched` form fits only a folder change).
3. **No plugin-host spec for the over-limit import** (only a unit test with fakes): add one to `tests/plugin` if the promise should be held end to end.
4. **`skills/vision-board/scenarios.md`** (lines 247, 320, 402, 890, 895) still shows "then" as a link label; the agent does not read it, but it teaches the old example. Fix with the next skill edit (eval fixtures keep "then" on purpose).
5. T_03's eval result cannot be seen as a run folder here; consider keeping its record under `tests/evals/bot/out/` or in the tracker.
6. T_01's openapi wording and T_02/T_04's open Requests (TASK-STATUS) are still open; not re-checked here.
