// What a drawing holds, for a reader that can't look at it (F2): the pictures, SmartArt, charts, shapes and
// connectors in Word's `w:drawing` and Excel's anchors, which are the same DrawingML. It reports what is
// there in markers, short labels in square brackets, so nothing vanishes with no word. It reads words, links,
// titles and stored figures; how a thing looks, where it sits and which way an arrow points it does not.
import type { Limits } from './limits.ts';
import type { OoxmlPackage, OoxmlRelationship } from './ooxml.ts';
import { DocumentRefused } from './refused.ts';
import type { XmlNode } from './xml.ts';
import { childNamed, childrenNamed, directText, xmlTree } from './xml.ts';

export interface DrawingShape { id: string | undefined; label: string; hasText: boolean }
export interface DrawingConnector { from: string | undefined; to: string | undefined }
export interface DrawingContents {
  pictures: { rel: string; alt: string }[];
  charts: string[];
  diagrams: string[];
  shapes: DrawingShape[];
  connectors: DrawingConnector[];
}

/** The picture formats a model's provider takes (platform.claude.com/docs/en/build-with-claude/vision). */
const SEEABLE = /\.(?:png|jpe?g|gif|webp)$/i;
const OTHER_PICTURE = /\.(?:bmp|tiff?|svg|emf|wmf)$/i;
/** The name a picture is saved under, its extension from a short list so a part's name decides nothing. */
export const pictureName = (n: number, target: string): string => `picture-${n}${(SEEABLE.exec(target) ?? OTHER_PICTURE.exec(target))?.[0].toLowerCase() ?? '.bin'}`;
export const canBeSeen = (name: string): boolean => SEEABLE.test(name);

const elements = (n: XmlNode) => n.children.filter((c): c is XmlNode => typeof c !== 'string');

/** The first element named `name` at or under `node`. */
function find(node: XmlNode, name: string): XmlNode | undefined {
  for (const c of elements(node)) {
    if (c.name === name) return c;
    const under = find(c, name);
    if (under) return under;
  }
  return undefined;
}

/** All the words under `node`, a space between paragraphs. */
export function wordsUnder(node: XmlNode): string {
  if (node.name === 't' && elements(node).length === 0) return directText(node); // `dgm:t` holds paragraphs; `a:t` and `w:t` hold text
  const parts = elements(node).filter((c) => c.name !== 'rPh').map(wordsUnder).filter(Boolean);
  return parts.join(node.name === 'r' || node.name === 'hyperlink' ? '' : ' ').trim();
}

function readShape(node: XmlNode, out: DrawingContents): void {
  const pr = find(node, 'cNvPr');
  const ends = find(node, 'cNvCnPr') ?? find(node, 'cNvCxnSpPr');
  const box = childNamed(node, 'txbx') ?? childNamed(node, 'txBody');
  if (node.name === 'cxnSp' || (ends && !box)) {
    out.connectors.push({ from: ends && childNamed(ends, 'stCxn')?.attrs['id'], to: ends && childNamed(ends, 'endCxn')?.attrs['id'] });
    return;
  }
  const text = box ? wordsUnder(box) : '';
  out.shapes.push({ id: pr?.attrs['id'], label: text || (pr?.attrs['name'] ?? ''), hasText: Boolean(text) });
}

function walk(node: XmlNode, out: DrawingContents, given: string): void {
  let alt = given;
  for (const c of elements(node)) {
    if (c.name === 'Fallback') continue;
    if (c.name === 'docPr') alt ||= c.attrs['descr'] ?? '';
    else if (c.name === 'blip') { if (c.attrs['embed']) out.pictures.push({ rel: c.attrs['embed'], alt }); }
    else if (c.name === 'chart' && c.attrs['id']) out.charts.push(c.attrs['id']);
    else if (c.name === 'relIds' && c.attrs['dm']) out.diagrams.push(c.attrs['dm']);
    else if (c.name === 'wsp' || c.name === 'sp' || c.name === 'cxnSp') readShape(c, out);
    else if (c.name === 'pic') walk(c, out, find(c, 'cNvPr')?.attrs['descr'] || alt);
    else walk(c, out, alt);
  }
}

/** What is in a drawing, in the order it stands. */
export function readDrawing(node: XmlNode): DrawingContents {
  const out: DrawingContents = { pictures: [], charts: [], diagrams: [], shapes: [], connectors: [] };
  walk(node, out, '');
  return out;
}

const listed = (items: string[], limits: Limits) => items.slice(0, limits.markerItems).join('; ') + (items.length > limits.markerItems ? '; ...' : '');

/** The shapes' words and what joins what: `Firewall; Proxy. Connectors: Firewall → Proxy; 1 joined to nothing`. */
export function shapesText({ shapes, connectors }: DrawingContents, limits: Limits): string {
  const labels = new Map(shapes.map((s) => [s.id, s.label]));
  const joined = connectors.filter((c) => labels.has(c.from) && labels.has(c.to)).map((c) => `${labels.get(c.from)} → ${labels.get(c.to)}`);
  const loose = connectors.length - joined.length;
  const links = [...joined, ...(loose > 0 ? [`${loose} joined to nothing named`] : [])];
  return [listed(shapes.map((s) => s.label).filter(Boolean), limits), links.length > 0 ? `Connectors: ${listed(links, limits)}` : ''].filter(Boolean).join('. ');
}

/** A marker's text from a part that may be damaged: a bad part is one marker that says so, not a refused document. */
function fromPart(file: OoxmlPackage, rel: OoxmlRelationship | undefined, read: (root: XmlNode) => string, limits: Limits): string {
  if (!rel || rel.external || !file.has(rel.target)) return '';
  try { return read(xmlTree(file.text(rel.target)!, limits)); } catch (err) {
    if (err instanceof DocumentRefused) return '';
    throw err;
  }
}

/** SmartArt's boxes and links, from its data part: what the person typed, and which box is under which. */
export function smartArtText(file: OoxmlPackage, rel: OoxmlRelationship | undefined, limits: Limits): string {
  return fromPart(file, rel, (root) => {
    const boxes = new Map<string, string>();
    for (const pt of childrenNamed(childNamed(root, 'ptLst') ?? root, 'pt')) {
      const type = pt.attrs['type'] ?? 'node';
      const words = childNamed(pt, 't');
      if ((type === 'node' || type === 'asst') && words && pt.attrs['modelId']) boxes.set(pt.attrs['modelId'], wordsUnder(words));
    }
    const links = childrenNamed(childNamed(root, 'cxnLst') ?? root, 'cxn').filter((c) => (c.attrs['type'] ?? 'parOf') === 'parOf')
      .flatMap((c) => (boxes.get(c.attrs['srcId'] ?? '') && boxes.get(c.attrs['destId'] ?? '') ? [`${boxes.get(c.attrs['srcId'] ?? '')} → ${boxes.get(c.attrs['destId'] ?? '')}`] : []));
    return [listed([...boxes.values()].filter(Boolean), limits), links.length > 0 ? `Links: ${listed(links, limits)}` : ''].filter(Boolean).join('. ');
  }, limits);
}

const values = (node: XmlNode | undefined, limits: Limits): string[] => {
  const out: string[] = [];
  const go = (n: XmlNode) => {
    for (const c of elements(n)) {
      if (out.length >= limits.chartPoints) return;
      if (c.name === 'v') out.push(directText(c));
      else go(c);
    }
  };
  if (node) go(node);
  return out;
};

/** A chart's kind, title and each series' name, the file's stored figures and where they come from. It draws nothing. */
export function chartText(file: OoxmlPackage, rel: OoxmlRelationship | undefined, limits: Limits): string {
  return fromPart(file, rel, (root) => {
    const chart = childNamed(root, 'chart') ?? root;
    const title = childNamed(chart, 'title');
    const kinds = elements(childNamed(chart, 'plotArea') ?? chart).filter((c) => c.name.endsWith('Chart'));
    const series = kinds.flatMap((k) => childrenNamed(k, 'ser')).slice(0, limits.chartSeries).map((ser) => {
      const cats = values(childNamed(ser, 'cat') ?? childNamed(ser, 'xVal'), limits);
      const nums = childNamed(ser, 'val') ?? childNamed(ser, 'yVal');
      const points = values(nums, limits).map((v, i) => (cats[i] ? `${cats[i]} ${v}` : v));
      const source = nums && find(nums, 'f');
      return [values(childNamed(ser, 'tx'), limits).join(' '), points.join(', '), source ? `from ${directText(source)}` : ''].filter(Boolean).join(': ');
    });
    return [kinds[0]?.name.replace(/Chart$/, ''), title && wordsUnder(title), ...series].filter(Boolean).join('. ');
  }, limits);
}

/** Text for a marker: no square brackets from the file, on one line. */
export const markerSafe = (text: string): string => text.replace(/[[\]\s]+/g, ' ').trim();
