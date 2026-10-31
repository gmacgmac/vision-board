// What a workbook holds beside its cells: defined names and external links (F4), each sheet's comments
// and drawings (F2). Sheet by sheet a bad part leaves that part out, so one can't hide the rest.
import { addressOf } from './a1.ts';
import type { Limits } from './limits.ts';
import type { OoxmlPackage } from './ooxml.ts';
import { DocumentRefused } from './refused.ts';
import type { XmlNode } from './xml.ts';
import type { DrawingContents } from './ooxml-drawing.ts';
import { canBeSeen, chartText, markerSafe, pictureName, readDrawing, shapesText, smartArtText, wordsUnder } from './ooxml-drawing.ts';
import { childNamed, childrenNamed, directText, xmlTree } from './xml.ts';

export interface DefinedName { name: string; refersTo: string; sheet?: string; hidden?: true }
export interface ExternalLink { index: number; file?: string; sheets: string[] }
export interface SheetComment { address: string; text: string }
export interface SheetDrawing {
  kind: 'picture' | 'chart' | 'diagram' | 'shapes';
  /** The cell its top left corner sits on. */
  at?: string;
  /** Words read from it; a picture's are its alt text. */
  text?: string;
  /** A picture's name in the folder the workbook answer saves. */
  file?: string;
  /** A picture in a format a model can't be shown. */
  unseeable?: true;
}

const BUILT_IN_NAME = /^_xlnm\./;

/** The names people use in formulas, each with what it refers to. Excel's own (print areas) are left out. */
export function readDefinedNames(root: XmlNode, sheets: string[], limits: Limits): { names: DefinedName[]; cut: boolean } {
  const all = childrenNamed(childNamed(root, 'definedNames') ?? root, 'definedName').filter((d) => d.attrs['name'] && !BUILT_IN_NAME.test(d.attrs['name']));
  const names = all.slice(0, limits.definedNames).map((d): DefinedName => {
    const scope = d.attrs['localSheetId'] === undefined ? undefined : sheets[Number(d.attrs['localSheetId'])];
    return {
      name: d.attrs['name']!.slice(0, limits.nameChars), refersTo: directText(d).slice(0, limits.nameChars),
      ...(scope !== undefined && { sheet: scope }), ...((d.attrs['hidden'] === '1' || d.attrs['hidden'] === 'true') && { hidden: true as const }),
    };
  });
  return { names, cut: all.length > names.length };
}

/** The workbooks a formula's `[1]` means, by that number: the file's own words for where it is, never opened. */
export function readExternalLinks(file: OoxmlPackage, root: XmlNode, main: string, limits: Limits): ExternalLink[] {
  const rels = file.relationships(main);
  return childrenNamed(childNamed(root, 'externalReferences') ?? root, 'externalReference').slice(0, limits.definedNames).map((ref, i) => {
    const part = rels.get(ref.attrs['id'] ?? '')?.target;
    const link: ExternalLink = { index: i + 1, sheets: [] };
    if (part === undefined || !file.has(part)) return link;
    try {
      const book = childNamed(xmlTree(file.text(part)!, limits), 'externalBook');
      const target = book && file.relationships(part).get(book.attrs['id'] ?? '');
      if (target?.external) link.file = target.target.slice(0, limits.nameChars);
      link.sheets = book ? childrenNamed(childNamed(book, 'sheetNames') ?? book, 'sheetName').slice(0, limits.sheets).map((s) => (s.attrs['val'] ?? '').slice(0, limits.sheetNameChars)) : [];
    } catch (err) { if (!(err instanceof DocumentRefused)) throw err; }
    return link;
  });
}

/** The first part `part` relates to of this type. */
function relatedPart(file: OoxmlPackage, part: string, type: RegExp): string | undefined {
  const target = [...file.relationships(part).values()].find((r) => type.test(r.type) && !r.external)?.target;
  return target !== undefined && file.has(target) ? target : undefined;
}

/** A sheet's comments, by the cell each is on. */
export function readComments(file: OoxmlPackage, sheetPart: string, limits: Limits): SheetComment[] {
  const part = relatedPart(file, sheetPart, /\/comments$/);
  if (part === undefined) return [];
  try {
    const root = xmlTree(file.text(part)!, limits);
    return childrenNamed(childNamed(root, 'commentList') ?? root, 'comment').map((c) => ({ address: c.attrs['ref'] ?? '', text: wordsUnder(childNamed(c, 'text') ?? c).slice(0, limits.cellChars) }));
  } catch (err) {
    if (err instanceof DocumentRefused) return [];
    throw err;
  }
}

/** Where an anchor's top left corner is; an absolute one has no cell. */
function anchorCell(anchor: XmlNode): string | undefined {
  const from = childNamed(anchor, 'from');
  const col = Number(directText(childNamed(from, 'col') ?? anchor));
  const row = Number(directText(childNamed(from, 'row') ?? anchor));
  return from && Number.isInteger(col) && Number.isInteger(row) && col >= 0 && row >= 0 ? addressOf({ col: col + 1, row: row + 1 }) : undefined;
}

/** The workbook's pictures across its sheets, each once, named in sheet order: the same name in every call. */
export interface PictureNames { names: Map<string, string>; cut: boolean }

/** A sheet's drawing part as what each anchor holds. */
export function readSheetDrawings(file: OoxmlPackage, sheetPart: string, pictures: PictureNames, limits: Limits): SheetDrawing[] {
  const part = relatedPart(file, sheetPart, /\/drawing$/);
  if (part === undefined) return [];
  const rels = file.relationships(part);
  const out: SheetDrawing[] = [];
  let root: XmlNode;
  try { root = xmlTree(file.text(part)!, limits); } catch (err) {
    if (err instanceof DocumentRefused) return [{ kind: 'shapes' }];
    throw err;
  }
  // Shapes sit in anchors of their own, and connectors join across them, so they are read together.
  const drawn: DrawingContents = { pictures: [], charts: [], diagrams: [], shapes: [], connectors: [] };
  let firstShape: string | undefined;
  for (const anchor of root.children.filter((c): c is XmlNode => typeof c !== 'string')) {
    const d = readDrawing(anchor);
    const at = anchorCell(anchor);
    const place = at === undefined ? {} : { at };
    for (const p of d.pictures) {
      const target = rels.get(p.rel)?.target;
      if (target === undefined || !file.has(target)) continue;
      let name = pictures.names.get(target);
      if (name === undefined && pictures.names.size >= limits.pictures) pictures.cut = true;
      else if (name === undefined) { name = pictureName(pictures.names.size + 1, target); pictures.names.set(target, name); }
      out.push({ kind: 'picture', ...place, ...(p.alt && { text: markerSafe(p.alt) }), ...(name !== undefined && { file: name }), ...(name !== undefined && !canBeSeen(name) && { unseeable: true as const }) });
    }
    for (const rel of d.charts) out.push({ kind: 'chart', ...place, text: markerSafe(chartText(file, rels.get(rel), limits)) });
    for (const rel of d.diagrams) out.push({ kind: 'diagram', ...place, text: markerSafe(smartArtText(file, rels.get(rel), limits)) });
    if (d.shapes.length + d.connectors.length > 0) firstShape ??= at;
    drawn.shapes.push(...d.shapes);
    drawn.connectors.push(...d.connectors);
  }
  if (drawn.shapes.length + drawn.connectors.length > 0) out.push({ kind: 'shapes', ...(firstShape !== undefined && { at: firstShape }), text: markerSafe(shapesText(drawn, limits)) });
  return out;
}
