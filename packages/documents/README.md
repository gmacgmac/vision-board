# packages/documents

Readers for files that come from outside: Word, Excel and zip (D-071). Every file is hostile until read:
a declared size is a claim until counted, a name is suspect until checked, and a refusal leaves nothing,
because nothing here writes. A reader is a pure function of bytes and limits, and a host runs it where a
hang can't reach it (the board: a worker with a deadline, `apps/board/server/chat-read.ts`).

- **Depends on**: `fflate`, exact version (D-071), for DEFLATE only: its `Inflate` stream, never `unzipSync`.
- **Used by**: `apps/board` (`server/chat-read-worker.ts`). Imports nothing from the repo, so nclite can take it.
- **Public API** (`src/index.ts`): `readDocx`, `readWorkbook`, `readCells`, `expandZip`, `zipGuard`, `xmlEvents`,
  `xmlTree`, `decodeXml`, `LIMITS`, `DocumentRefused` and its `RefusalCode`.
- **No words**: a refusal is a code (`src/refused.ts`), never a sentence and never the file's text. A host says it in its own words.

## What each holds to

| Property | Where | Proven by |
|---|---|---|
| An archive's table is checked before anything is inflated; ZIP64, encryption, links and overlaps refused | `src/zip-guard.ts` `zipGuard` | `tests/zip.test.ts` |
| Real bytes are counted; one past the claim ends it | `src/zip-read.ts` `readEntry` | `tests/zip.test.ts` "a bomb" |
| A name that could escape refuses the whole archive | `src/zip-names.ts` `entryPath` | `tests/zip.test.ts` "names that escape" |
| A DOCTYPE fails where it stands; no entity can be declared; every limit ends a read | `src/xml.ts` `xmlEvents` | `tests/xml.test.ts` |
| A Word table's merged cells read in each place they cover | `src/read-docx.ts` `tableGrid` | `tests/docx.test.ts` |
| Excel sizes are counted from cells; a `dimension` record is never read | `src/read-xlsx.ts` `summary` | `tests/xlsx.test.ts` |
| Value and formula both, a shared formula moved to its cell | `src/xlsx-cells.ts` `finished`, `src/a1.ts` `movedFormula` | `tests/xlsx.test.ts` |
| Word's numbers are worked out, headings too | `src/docx-numbering.ts` `readNumbering` | `tests/docx-numbers.test.ts` |
| No drawing vanishes with no word: a marker, its words and links, a count in `found` | `src/ooxml-drawing.ts`, `src/read-docx.ts` `drawingMarkers` | `tests/docx-drawings.test.ts` |
| A workbook's names, links, comments and drawings; a sheet with no cells still says what it holds | `src/xlsx-parts.ts` | `tests/xlsx-parts.test.ts` |
| `cut.next` always moves on; an answer stays within `answerChars` | `src/read-xlsx.ts` `goingOn`, `readCells` | `tests/xlsx-parts.test.ts` |

**Not covered**: a CRC is not checked, so a flipped byte reads as itself. Formulas are not calculated. A drawing's look, its layout and which way an arrow
points are not read, and an embedded object (a `.vsdx`) is named, not opened. A chart is its kind, title, series and stored figures. Word's headers, footers, footnotes and comments
are not read, and the answer names them. `w:start` left out counts from 1, against the schema's 0 [INFERENCE: no real Word here to measure]. The built-in CJK date formats are from
memory of ECMA-376, not a CJK Excel.

The readers' markers (`[SmartArt: ...]`) are labels in the Markdown, not sentences; what a person or agent is told of them is the host's.

The limits are `src/limits.ts`, each a named number; a host may pass tighter ones.

KiroCrew's code is ported here under Apache-2.0: `NOTICE`, `LICENSE-Apache-2.0`.
