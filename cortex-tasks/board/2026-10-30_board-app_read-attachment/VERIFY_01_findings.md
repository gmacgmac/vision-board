# VERIFY_01 findings: Read Attachment

> Run 2026-10-31 on tag `read/wave-2`, port 6300, a fake agent, the real server, page, frame and MCP server. Scripts and
> files: `temp/verify-01/` (git-ignored). Nothing in the repo changed but this file, the task file, TASK-STATUS and the LOG.

## The answers, as a person would give them

| Question | Answer from what comes back |
|---|---|
| What does cell F20 calculate? | **Mostly.** `F19*(1+TaxRate)+Contingency+'Q1 2026'!D9`, value 299350. What `TaxRate` and `Contingency` are, nothing says (F4). |
| What does the table in section 2 say? | **The table, yes**: `gridSpan` and `vMerge` read right. **Which section, only by counting**: "2." is gone from the heading (F3). |
| What does the diagram connect? | **A PNG in Word, yes. A PDF's page, yes, in the suite's browser and not in a full Chromium build (F1).** SmartArt, a chart, shapes drawn in Word, a Visio picture, or a picture on an Excel sheet: **no, and nothing says so (F2).** |
| Does a hostile file reach anything? | **No.** Every archive, XML, path and picture tried was refused or held. It has not been shown that a real pdf.js exploit stays held; see Not run. |

**Blocking: F1, F2, F3.** F1 is the one to fix first: it stops the PDF half of the set in the browser people use.

## Blocking

### F1. On a full Chromium build, every good PDF says "can't be read here", and no big picture gets a copy

- **Steps**: `node temp/verify-01/race.ts 12` attaches a good PDF 12 times. `VB_CHROMIUM=<binary>` picks the browser.
  `chat-attach-pages.spec.ts` on the full build: `VB_FULL=<binary> npx playwright test --config temp/verify-01/pw-full.config.ts`.
- **Happened**:

  | Browser | Good PDFs drawn |
  |---|---|
  | Chrome for Testing 149, Mac, full build (`~/Library/Caches/ms-playwright/chromium-1228`) | **0 of 12** |
  | Chromium 156, Linux, full build | **1 of 12** |
  | Chromium 156, Linux, `--disable-features=IsolateSandboxedIframes` | 12 of 12 |
  | Headless shell 153, the suite's browser | 12 of 12 |
  | WebKit 26.6 | 4 of 4 |

  A 3000 px PNG on the Chrome for Testing build: "No copy that fits could be made". The agent is told only the original. The spec's first test fails there (the run is
  serial, so it stops at that one); all 25 pass on the headless shell.
- **Cause**: `apps/board/src/shell/pdf-pages.ts`, the `make(heard, () => setTimeout(() => { if (waiting.for === 'ready' && settle) finish(new Late()); }))` line. It treats "no `ready` one tick after `load`"
  as "no script ran". A sandboxed frame in its own process sends `ready` after `load`: traced at `load` 327 ms, `ready` 330 ms, too late. In the headless shell they
  land in the same millisecond, `load` first, so it passes by a hair. Hearing `load` 1.5 s late (`full-patched.ts`, in the page only, as a stand-in for a fix) makes the Chrome for Testing build draw the PDF and fit the picture.
- **Should**: a slow `ready` is not a missing one. The step deadline (`STEP_MS`) already catches a frame that never speaks, so the load check needs a real grace or can go. Add a run of this
  spec on a full build, since the suite's browser doesn't show this. D-072's "Chromium is all the suite runs" should say which.
- **Not established**: Google Chrome itself is not on this Mac. [INFERENCE] It behaves as its testing build does. The live look will show it at once.
- **Blocking**: yes. PLAN success criterion 3 fails where people work.

### F2. A diagram that isn't a plain picture vanishes from Word and Excel, and the answer reads as complete

- **Steps**: `node temp/verify-01/read-real.mjs` reads `docs/solution-design.docx` and `docs/capacity-plan.xlsx`; `read-more.mjs` reads `docs/openpyxl.xlsx`. The first two are hand-built to the schema; openpyxl is a real writer.
- **Happened** (Word's `note` names only "headers, footers, footnotes, comments"; Excel's answers have no `note`):

  | In the file | What comes back |
  |---|---|
  | SmartArt under "Pipeline" | `## Pipeline (SmartArt)`, then the next heading. No marker, no word. |
  | A chart under "Latency" | The same. Its title and figures are in the file. |
  | Shapes drawn in Word, joined by connectors | `Firewall  Proxy  Vault`. The connectors, which are the point, are gone. |
  | A Visio object's preview | `![](picture-2.emf)`, saved and listed. The provider takes only JPEG, PNG, GIF and WebP (platform.claude.com/docs/en/build-with-claude/vision), so the agent can't see it, and nothing says so. Its embedded `.vsdx` is not mentioned. |
  | A picture and a chart on an Excel sheet | `Topology`: 0 cells, `"cells":[]`. It reads as an empty sheet. The picture is at `xl/media/image1.png` and never comes out. |
  | A comment on Excel's F20 | Gone, with no note; Word at least names its comments. |

- **Should**: at the least, a marker where each stood and a `note` for each kind ("a SmartArt diagram here was not read"), so the agent tells the person instead of answering from half a document. Next, Excel's pictures
  saved as Word's are, an EMF named as unseeable, SmartArt's text and edges from `word/diagrams/data*.xml`, chart titles and series. `packages/documents/README.md` already lists Excel's pictures under Not covered; the agent is never told.
- **Blocking**: yes, for the words, since D-071's Why is "customer architectures, where the diagram is the point". Reading them is a choice for the maintainer; Visio files themselves stay M43.

### F3. Word's numbers are dropped or invented

- **Steps**: as F2. A heading style linked to a multilevel list is how numbered corporate templates work; the file is hand-built to that shape.
- **Happened**:

  | Word shows | The Markdown says |
  |---|---|
  | `2. Network Design`, `2.1 Zones` | `# Network Design`, `## Zones` |
  | a list starting at `5.`, then `5.1` | `1. Item five stands first`, `  1. Clause five point one` |
  | `(c)`, `(d)` (lower letters, starting at c) | `1. Encrypt at rest`, `2. Encrypt in transit` |
  | `I.`, `II.` | `1.`, `2.` |

  python-docx's plain `List Number` reads right; simple lists are not the problem.
- **Should**: compute each number from `w:start`, `w:numFmt` and `w:lvlText`, in headings too (`paragraph` returns a heading before it looks at numbering). "Section 2" and "clause 5.1" are how a person asks, and a wrong number stated as fact is worse than none.
- **Blocking**: yes. `readNumbering` already reads the format; `w:start` and `w:lvlText` sit beside it.

## Not blocking

### F4. A formula's names can't be looked up

- **Steps**: `read_attachment` on `docs/capacity-plan.xlsx`, `sheet: Summary`, `range: F20`; then with no sheet.
- **Happened**: `F19*(1+TaxRate)+Contingency+'Q1 2026'!D9`. No call returns `definedNames`, so `TaxRate` is a guess (`Rates!B2` holds 0.2, unlabelled). F22's `[1]Rates!$B$2` names a linked file that nothing identifies.
- **Should**: the workbook answer lists each name and what it refers to, and the external links. Small, and it finishes the question this set is for. Do it with F2.

### F5. A PDF inside a zip is a dead end on Kiro

- **Steps**: expand `docs/customer-pack.zip`, then `read_attachment` on the PDF inside it.
- **Happened**: "open any other file with your own read tool". No pages exist, since the page only makes them for what is attached directly, and the PLAN measured Kiro's read tool failing on a PDF. The tool's description ("on the pictures the message names beside it") is untrue here. chat.md notes this gap for a picture in a zip, not for a PDF.
- **Should**: the folder answer's `note` names the PDFs and says to ask the person to attach them on their own. `overTheLimit` is the pattern.

### F6. An answer can be far bigger than an agent can take in one go

- **Steps**: `node temp/verify-01/read-sizes.mjs` (`hostile/budget.xlsx`, 18 KB; `hostile/long.docx`, 13 KB).
- **Happened**: 2000 cells: 249,364 characters. Word: 203,138. [INFERENCE] about 60,000 tokens each. Claude Code's docs (code.claude.com/docs/en/mcp): a warning at 10,000 tokens, a limit of 25,000, and text results over 50,000 characters saved to a file. Kiro's handling: not established.
- **Should**: try `budget.xlsx` in the live look on Kiro; it is a tiny file. If it fails, the caps should follow what an agent can take, not what the reader can make. Past 200,000 characters a Word file's rest stays out of reach (READ_01 said so; the note is honest).

### F7. `cut.next` can send an agent round for ever

- **Steps**: `node temp/verify-01/read-more.mjs hostile`, `wide-row.xlsx` (60 cells of 8000 characters in one row).
- **Happened**: 32 cells, then "Ask for the range A1:XFD1048576 next", the range just asked. Followed, the same 32 cells and the same words, about 64,000 tokens a turn [INFERENCE]. `readCells` restarts at the row of the first cell not given, so one row over the cap never moves. It needs an over-long row or more than 2000 columns, so it is rare, and a hostile file can do it on purpose.
- **Should**: when `next` is the range asked, continue by column within the row.

### F8. One big sheet hides the whole workbook

- **Steps**: `read-sizes.mjs`, `hostile/one-big-sheet.xlsx` (2.6 MB, one sheet of 1.1 million cells, one of a single cell).
- **Happened**: no list of sheets, and any range on the big sheet: "its XML is nested too deep or has too many parts". The small sheet answers, if you know its name; nothing gives it. `readWorkbook` counts every sheet under `xmlNodes` (2,000,000), which is about a million cells. A 1.5 million-cell sheet ran into that limit in 0.7 s, so the limit is not protecting time.
- **Should**: the names always come back, with sizes where they could be counted; a range reads as far as it needs. A raw-data tab is common in the workbooks people send.

### F9. Smaller things a person would trip on

Steps for all: `node temp/verify-01/read-real.mjs`, `read-more.mjs`, `office-misc.mjs`.

| What | Happened | Should |
|---|---|---|
| Dates in built-in formats 31 and 57 (zh-CN, ja-JP; the IDs are from memory of ECMA-376, no CJK Excel here) | `46023`, a number | `BUILTIN_DATES` takes 27-36 and 50-58 too |
| `[h]:mm`, 1.5 | `1900-01-01T12:00:00`; it means 36 hours | an elapsed format is a number, or says so |
| `_x000D_` in a string | kept as text | decoded |
| Currency and percent | `1000`, `0.31`: "GBP" and "%" exist only in the format, which isn't returned | return the format code |
| A workbook no one calculated (openpyxl) | `{"type":"text","value":null,"formula":...}` with no word | `note` that the file holds no calculated value; the type isn't text |
| Range `$F$20`, as formulas write it | refused, with a clear way on | accept it |
| Hidden column G, hidden row 25, Word's hidden text ("Secret margin 40 percent.") | plain, unmarked | mark them: the person can't see what the agent may quote. READ_01 raised this too |
| A tracked change | only the result; no word that it is tracked | a `note` |
| A link | "The runbook", URL gone | keep the URL |
| A password-protected Office file (OLE bytes) | "it is not an archive, whatever its name says" | say it may be protected or an old format, and to ask for a copy, as an encrypted zip does |
| HEIC, TIFF, BMP attached directly (`page-hostile.ts`) | the chip says nothing; the agent gets a path the provider can't take | a BMP can get a PNG copy in the frame; the others a chip note. An iPhone's photo of a whiteboard is a HEIC |
| A page far bigger than A3 (`docs/poster-a0.pdf`, 9 pt labels on A0) | 2000 px wide, so about 5 px text: seen in `shots/poster.png`, IP addresses barely legible, no zoom, and on Kiro no original to open | cut such a page into tiles, or say the page was scaled down hard |

### F10. The doc audit

Symbols named in api.md 167-168, chat.md § Attaching and the README all exist; each section names its test files. Unit and spec runs below. What doesn't hold:

| Claim | Where | Problem |
|---|---|---|
| "Chromium is all the suite runs" | D-072 (protected: for the maintainer) | It runs the headless shell, which hides F1 |
| "Held by `chat-attach-pages.spec.ts`" | chat.md, api.md 168 | Holds on the headless shell only (F1) |
| "A picture or a PDF: use your own read tool, on the pictures the message names beside it" | `read_attachment`'s description, api-reference.md | Untrue for a file from a zip (F5) |
| `PICTURE_BYTES`: "The largest picture the agent's provider took when measured" | `chat-files.ts` | Never measured near it: 220 KB taken, 9.7 MB rejected (PLAN Current State). See § The caps |
| "Whether Kiro's read tool opens a picture is not established here" | chat.md § Attaching | D-071 records it measured |
| The frame's policy, listed | api.md 168 | Leaves out `wasm-unsafe-eval` (D-072 ruling 4) |
| "the agent can't write there" | api.md 167, D-069 ruling 4, `chat-files.ts` | True of file tools and known commands. `mkdir`, `unzip -o -d` and `tar -C` there ask, so a yes lets it write. No harm found: a link is refused either way, and what's planted is only read as untrusted. Say it as it is |
| "about 4.8 MB" | chat.md | A number no test reads (4,798,934 bytes today). Delete it or test it |
| `updated: 2026-10-30` | chat.md, api.md frontmatter | Both changed 2026-10-31 in git |
| `pdfjs-dist` row | dependencies.md | Run 2's request is still open: `standard_fonts/LICENSE_FOXIT`, `LICENSE_LIBERATION`, `cmaps/LICENSE` aren't named, though those files ship in the frame's script |

## The two limits PAGES_01 named

**A machine with no CJK font draws boxes the blank check can't see.** Run: Chromium 156 on Linux with only DejaVu (`FONTCONFIG_FILE`), `--disable-features=IsolateSandboxedIframes` to get past F1, `temp/verify-01/nocjk.ts`.
`docs/cjk-not-embedded.pdf` drew four boxes (`shots/nocjk/`); the chip said nothing, and the agent was told the pages as usual. `docs/cjk-embedded.pdf` drew correctly on the same machine (same PNG size as on the Mac; size only, I did not open that one).

- **Does it matter?** Little. It takes a PDF that doesn't embed its fonts and a machine with no CJK font, in the browser's machine, not the server's. macOS has one (seen here); Windows not run. And it isn't silent to the one reading it: [INFERENCE] an agent looking at boxes can see they are boxes and say so. **What I'd do**: nothing in code now. Keep chat.md's sentence and add a tracker line if a customer in Asia hits it. If wanted cheaply: `measureText` of one CJK character against a character no font has, in the worker.

**Only the person is told a page may be incomplete.** `blank` reaches the chip and stops there, as the prompt is built from the disk (`besideOf`, `filesBlock`). The agent gets a white picture and a line saying "Its pages as pictures".

- **Does it matter?** Yes, more than the first. [INFERENCE] The agent will say "page 3 is blank" as a fact, and the person, who may have seen the note, has no reason to doubt it. That is the wrong-answer failure this set is meant to end. **What I'd do**: carry it in the name, the trick the total already uses: `page-003-of-040-blank.png`, `PAGE_FILE` taking the tail and `besideLine` adding "page 3 drew nothing where it has text, and may be incomplete". The same flag already crosses `checkedAnswer`. Small; do it with F2's words.
- `blank` only catches a wholly white page with `showText`. A 30000 x 30000 picture in `image-bomb.pdf` also came out white, with no word, as it has no text. Only a hostile file did: A0 scans at 300 dpi, RGB and grey, drew.

## The caps, for the live look

**5 MB: probably too high on some routes, and it was never measured.** Claude's vision docs (platform.claude.com/docs/en/build-with-claude/vision) give 10 MB on the Claude API and 5 MB on Amazon Bedrock, both base64-encoded. Base64 grows by a third, so raw 7.5 MB and 3.75 MB. `PICTURE_BYTES` is 5 MiB of raw bytes, and the page and the server both hold copies to that. Measured so far: 220 KB taken, 9.7 MB refused, which fits either route. Which route Kiro takes is not established.

- **Live look**: attach `temp/verify-01/docs/about-4.5mb.png` (4.3 MB, 5.7 MB as base64; 1500 x 900; its label reads "Firewall connects to DMZ"). It is under the cap, so no copy is made and it goes straight to the provider. **Blocking if it is refused**; then the cap is about 3.5 MB, one constant. Not run: no real CLI here.

**2000 px: right, keep it.** The same docs: 8000 px a side at most, 3000 px when a request holds more than 20 images, and pictures downscaled past a long edge of 2,576 px (Claude 4.7 and later) or 1,568 px (others). A 30-page PDF can pass 20 images, and 2000 stays under that stricter limit. `shots/fitted.png` from a 3000 px diagram is sharp. It does nothing for F9's A0 poster.

**30 pages is a real cost to the conversation.** A Letter page at 1224 x 1584 is 44 x 57 = 2,508 visual tokens, by the docs' sum (each side over 28, rounded up, multiplied); 30 of them are about 75,000 tokens, resent each turn. The agent needs to open only what it needs. Whether it does, watch in the live look.

## Passed

- **Routes**: the paperclip, a drop on the composer and a paste each gave pages or a copy; the prompt named them, with the untrusted line. A drop on the board: not exercised by my script (it reached no handler as I sent it); `chat-attach-drop.spec.ts` covers it, not re-run.
- **Diagram, no text**: `diagram-no-text.pdf` reached the agent as a page picture with every label readable (`shots/no-text.png`), on the headless shell; WebKit's chip said ready too (its picture not opened). CJK embedded and not, zh and ko, drew on the Mac. A Word PNG came out whole, with its alt text.
- **Excel**: shared formulas moved right past `LOG10`, `$B$5`, `'Rates'!B2`, string literals; merged ranges, rich text, phonetics, errors, booleans, array formulas, a hidden sheet marked, a lying `dimension`, a sparse last cell.
- **Word**: a table's `gridSpan` and `vMerge`, a style loop, a table span of 999,999,999, a text box.
- **Zip**: Python, `ditto` and Info-ZIP archives; new folder each time, nothing overwritten; `__MACOSX` left out and counted; a name in Chinese kept as `from`; `.env` lands as `env`, `.git` as `git`; a zip inside a zip.
- **Hostile archives, all refused in about 50 ms, nothing left, board answering within 2 ms throughout**: `../`, absolute, backslash, fullwidth, device names, 600-character and 40-deep names, 2500 entries, duplicates, a link, a real ZIP64 (`zip -fz`), encrypted, Deflate64, a size that lies, a local name that differs, overlapping entries (10 x 60 MB from 62 KB), 150 MB and 270 MB bombs, a script-prefixed zip, not a zip.
- **Hostile XML**: billion laughs and an external entity in Word and Excel, 200,000 deep, 700,000 paragraphs, a bad address, an out-of-range shared string, `__proto__` as a shared formula's id, a part name that escapes: refused or harmless.
- **Paths**: `.env`, `/etc/passwd`, `../`, the ledger, `agents.json`, absolute, encoded, `./`, `//`, a trailing `/`, backslash, case changed, `~`, a link to a file, a link to a folder, a link inside a real folder, a dot-name inside: all refused, with no file's content in the answer.
- **Races**: deleting files as reads start, 20 Word reads with the file deleted mid-way, 12 at once (4 run, 8 "too many"), a slot free afterwards, no stray folder, server up.
- **Renderer stalls**: `ops-bomb.pdf` (2 GB of operators) stopped at 30 s, the chip said so, the PDF still went, worst page stall 119 ms. A 20000 x 20000 PNG was fitted in 2 s. A 5000-page PDF: "30 of 5000". Lying headers, a page loop, a huge page, encrypted and not-a-PDF: each said so or drew. No page crash.
- **Script**: a PDF with `/OpenAction` JavaScript drew its page, and the spec's reach test passes. On the Chrome for Testing build, with F1 stood in for, in the live frame: origin `null`, `fetch` to the board blocked, `parent.document`, `top.location`, `localStorage`, `cookie` blocked; in a worker `RTCPeerConnection`, `location.assign` and `document` are undefined and `fetch` blocked.
- **Access rules**: board-made folders (`-pictures`, `-pages`, `-fitted`, a zip's) read allowed, write refused, in `accessFor`, Claude's `Edit(.../.visionboard/attachments/**)`, and Kiro's `fs_write` deny and 2.x `write` `deniedPaths`, each printed from its generator (`temp/verify-01/access.ts`, `kiro-write.ts`). `rm`, `mv`, `>`, `sed -i`, `cp` onto, `touch`, `ln -s`, `chmod`, `git checkout` refused. An unknown command asks (D-069). The tool needs no yes on either adapter (`mcp__vision-board__*`; `@vision-board`).
- **Flag off**: both off: no frame, no pages, the prompt as before; the operation `not-found`, `/pdf-frame` 404. Server off with the page on: a chip says it can't be read, and the file goes. The tool stays listed, as READ_01's open request says.
- **Checks**: `chat-attach-pages` and `chat-lazy` specs on 6300: 25 passed. 130 unit tests (`packages/documents`, `chat-read`, `api-read-attachment`, `pdf-pages`, `chat-files`, `api-chat-files`, `policy-attachments`). `npm run verify` ok (26 warnings), `gen --check` current. Full unit and page suites not run.

## Not run

- **Real Word and Excel**: not on this Mac. `capacity-plan.xlsx` and `solution-design.docx` are hand-built to the schema; real writers used: openpyxl 3.1.5 and python-docx 1.1.2 (from local image `nclite-agent:0.1.77`, no network, nothing pulled), textutil (writes no styles or tables, so its file says little). Numbers and Pages didn't answer a scripted export in 45 s, so I stopped both, which I had started.
- **A real pdf.js exploit**: none to hand. The frame's walls were tested from inside it, not by breaking in.
- **Google Chrome, Firefox, Windows**, any real CLI (no test starts one), the `vb read-attachment` call (its `--help` ran; my call used the wrong form), and the design look at the chip's states.
