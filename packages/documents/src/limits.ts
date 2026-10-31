// What one document may cost. Every reader takes these as an argument (a pure function of bytes and
// limits), so a host can run tighter ones and a test can reach them cheaply. VERIFY_01 measures them.
const MIB = 1024 * 1024;

export const LIMITS = {
  /** Zip: entries in one archive, and what the central directory may hold for each (`zipGuard`). */
  entries: 2000,
  centralEntryBytes: 512,
  /** Zip: real bytes out of one entry, and out of the whole archive or one call. */
  entryBytes: 100 * MIB,
  totalBytes: 200 * MIB,
  /** Zip: folders deep, and the length of one entry's path. */
  depth: 16,
  pathChars: 512,
  /** XML: how deep, how many elements, how many attributes on one. */
  xmlDepth: 256,
  xmlNodes: 2_000_000,
  xmlAttributes: 256,
  /** One answer's text, well under what an agent's tool takes (Claude Code saves text over 50,000 characters to a file). */
  answerChars: 40_000,
  /** Word: the whole Markdown made (a host shows `answerChars` of it), the columns of one table, the pictures of one document. */
  markdownChars: 2_000_000,
  tableColumns: 64,
  pictures: 200,
  /** A drawing: the things named in one marker, a chart's series and each one's points. */
  markerItems: 100,
  chartSeries: 16,
  chartPoints: 32,
  /** Excel: sheets listed, a sheet's name, the sheet XML counted for the list, cells in one answer, one cell's text, merged ranges kept, shared strings, names, and a name's or a link's text. */
  sheets: 256,
  sheetNameChars: 255,
  scanBytes: 128 * MIB,
  cells: 2000,
  cellChars: 8192,
  definedNames: 500,
  nameChars: 512,
  mergedRanges: 1000,
  sharedStrings: 2_000_000,
} as const;

export type Limits = { readonly [K in keyof typeof LIMITS]: number };
