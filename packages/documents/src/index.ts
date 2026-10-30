// Front door of `packages/documents` (D-071): readers for files that come from outside, each a pure
// function of bytes and limits that returns data and writes nothing, so a host saves what it keeps and
// runs them where a hang can't reach it. No board import, framework-free, so nclite can take it.
export { LIMITS } from './limits.ts';
export type { Limits } from './limits.ts';
export { DocumentRefused } from './refused.ts';
export type { RefusalCode } from './refused.ts';
export { childNamed, childrenNamed, decodeXml, directText, xmlEvents, xmlTree } from './xml.ts';
export type { XmlAttributes, XmlEvent, XmlNode } from './xml.ts';
export { expandZip } from './expand-zip.ts';
export type { ExpandedFile, ExpandedZip } from './expand-zip.ts';
export { zipGuard } from './zip-guard.ts';
export type { ZipEntry } from './zip-guard.ts';
export { readDocx } from './read-docx.ts';
export type { DocxDocument, DocxPicture } from './read-docx.ts';
export { readCells, readWorkbook } from './read-xlsx.ts';
export type { CellOut, SheetAnswer, SheetSummary, WorkbookSummary } from './read-xlsx.ts';
export type { CellType } from './xlsx-cells.ts';
