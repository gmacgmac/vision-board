// A small XML reader for files we did not write (D-071): events, or a tree of them. It refuses every
// `<!` that is not a comment or CDATA, so a DOCTYPE fails where it stands and no entity can be declared;
// only the five named references and character numbers are read. Every step moves forward with
// `indexOf`, so a hostile file costs one pass. Names lose their prefix (`w:t` is `t`), because writers
// choose their own prefixes; attribute maps have no prototype, so `__proto__` is only a name.
import type { Limits } from './limits.ts';
import { LIMITS } from './limits.ts';
import { refuse } from './refused.ts';

export type XmlAttributes = Readonly<Record<string, string>>;
export type XmlEvent =
  | { type: 'open'; name: string; attrs: XmlAttributes }
  | { type: 'close'; name: string }
  | { type: 'text'; text: string };
export interface XmlNode { name: string; attrs: XmlAttributes; children: (XmlNode | string)[] }

const NAMED: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
const LONGEST_REFERENCE = 12;

const localName = (qname: string) => qname.slice(qname.indexOf(':') + 1);

/** The bytes as text: UTF-16 by its byte-order mark, else UTF-8. Bytes that are neither are refused. */
export function decodeXml(bytes: Uint8Array): string {
  const encoding = bytes[0] === 0xff && bytes[1] === 0xfe ? 'utf-16le' : bytes[0] === 0xfe && bytes[1] === 0xff ? 'utf-16be' : 'utf-8';
  try { return new TextDecoder(encoding, { fatal: true }).decode(bytes); } catch { return refuse('xmlMalformed'); }
}

function reference(body: string): string {
  const named = NAMED[body];
  if (named !== undefined && Object.hasOwn(NAMED, body)) return named;
  const code = /^#x[0-9a-fA-F]+$/.test(body) ? Number.parseInt(body.slice(2), 16) : /^#[0-9]+$/.test(body) ? Number.parseInt(body.slice(1), 10) : Number.NaN;
  if (!(code > 0 && code <= 0x10ffff) || (code >= 0xd800 && code <= 0xdfff)) return refuse('xmlMalformed');
  return String.fromCodePoint(code);
}

/** `raw` with its references read. A reference is a few characters, so a `&` with no `;` near it costs nothing. */
function unescaped(raw: string): string {
  let at = raw.indexOf('&');
  if (at < 0) return raw;
  let out = '';
  let from = 0;
  while (at >= 0) {
    const end = raw.indexOf(';', at);
    if (end < 0 || end - at > LONGEST_REFERENCE) return refuse('xmlMalformed');
    out += raw.slice(from, at) + reference(raw.slice(at + 1, end));
    from = end + 1;
    at = raw.indexOf('&', from);
  }
  return out + raw.slice(from);
}

const isSpace = (c: number) => c === 32 || c === 10 || c === 13 || c === 9;
const endsName = (c: number) => isSpace(c) || c === 47 || c === 62 || c === 61; // space, `/`, `>`, `=`

interface Tag { qname: string; attrs: Record<string, string>; closes: boolean; next: number }

/** The tag whose name starts at `start`. A prefixed attribute keeps its first value by its local name; `xmlns` is left out. */
function readTag(text: string, start: number, limits: Limits): Tag {
  let i = start;
  while (i < text.length && !endsName(text.charCodeAt(i))) i++;
  const qname = text.slice(start, i);
  if (!qname) return refuse('xmlMalformed');
  const attrs: Record<string, string> = Object.create(null) as Record<string, string>;
  let count = 0;
  for (;;) {
    while (isSpace(text.charCodeAt(i))) i++;
    const c = text.charCodeAt(i);
    if (c === 62) return { qname, attrs, closes: false, next: i + 1 };
    if (c === 47 && text.charCodeAt(i + 1) === 62) return { qname, attrs, closes: true, next: i + 2 };
    const nameStart = i;
    while (i < text.length && !endsName(text.charCodeAt(i))) i++;
    const attr = text.slice(nameStart, i);
    while (isSpace(text.charCodeAt(i))) i++;
    if (!attr || text.charCodeAt(i) !== 61) return refuse('xmlMalformed');
    i++;
    while (isSpace(text.charCodeAt(i))) i++;
    const quote = text[i];
    if (quote !== '"' && quote !== "'") return refuse('xmlMalformed');
    const end = text.indexOf(quote, i + 1);
    if (end < 0) return refuse('xmlMalformed');
    const raw = text.slice(i + 1, end);
    if (raw.includes('<')) return refuse('xmlMalformed');
    if (++count > limits.xmlAttributes) return refuse('xmlLimit');
    if (attr !== 'xmlns' && !attr.startsWith('xmlns:') && !(localName(attr) in attrs)) attrs[localName(attr)] = unescaped(raw);
    i = end + 1;
  }
}

/** After `<!` at `at`: a comment is skipped, CDATA is text, and anything else (a DOCTYPE) is refused. */
function declaration(text: string, at: number, inside: boolean): { text?: string; next: number } {
  if (text.startsWith('<!--', at)) {
    const end = text.indexOf('-->', at + 4);
    return end < 0 ? refuse('xmlMalformed') : { next: end + 3 };
  }
  if (!text.startsWith('<![CDATA[', at)) return refuse('xmlDoctype');
  const end = text.indexOf(']]>', at + 9);
  if (end < 0 || !inside) return refuse('xmlMalformed');
  return { text: text.slice(at + 9, end), next: end + 3 };
}

/** The events of `text`, checked as they go: one root, tags that balance, within the limits. */
export function* xmlEvents(text: string, limits: Limits = LIMITS): Generator<XmlEvent> {
  const stack: string[] = [];
  let i = 0;
  let nodes = 0;
  let rooted = false;
  while (i < text.length) {
    const lt = text.indexOf('<', i);
    if (lt !== i) {
      const chunk = text.slice(i, lt < 0 ? text.length : lt);
      if (stack.length > 0) yield { type: 'text', text: unescaped(chunk) };
      else if (chunk.trim()) refuse('xmlMalformed');
      if (lt < 0) break;
      i = lt;
    }
    const next = text.charCodeAt(i + 1);
    if (next === 63) { // `<?`
      const end = text.indexOf('?>', i + 2);
      if (end < 0) refuse('xmlMalformed');
      i = end + 2;
    } else if (next === 33) { // `<!`
      const d = declaration(text, i, stack.length > 0);
      if (d.text) yield { type: 'text', text: d.text };
      i = d.next;
    } else if (next === 47) { // `</`
      const end = text.indexOf('>', i + 2);
      if (end < 0 || stack.pop() !== text.slice(i + 2, end).trim()) refuse('xmlMalformed');
      yield { type: 'close', name: localName(text.slice(i + 2, end).trim()) };
      i = end + 1;
    } else {
      if (rooted && stack.length === 0) refuse('xmlMalformed');
      rooted = true;
      if (++nodes > limits.xmlNodes || stack.length >= limits.xmlDepth) refuse('xmlLimit');
      const tag = readTag(text, i + 1, limits);
      const name = localName(tag.qname);
      yield { type: 'open', name, attrs: tag.attrs };
      if (tag.closes) yield { type: 'close', name };
      else stack.push(tag.qname);
      i = tag.next;
    }
  }
  if (stack.length > 0 || !rooted) refuse('xmlMalformed');
}

/** The whole of `text` as a tree. */
export function xmlTree(text: string, limits: Limits = LIMITS): XmlNode {
  const root: XmlNode = { name: '', attrs: {}, children: [] };
  const path = [root];
  for (const e of xmlEvents(text, limits)) {
    const top = path[path.length - 1]!;
    if (e.type === 'text') top.children.push(e.text);
    else if (e.type === 'close') path.pop();
    else {
      const node: XmlNode = { name: e.name, attrs: e.attrs, children: [] };
      top.children.push(node);
      path.push(node);
    }
  }
  return root.children[0] as XmlNode;
}

/** `node`'s element children named `name`. */
export const childrenNamed = (node: XmlNode, name: string): XmlNode[] => node.children.filter((c): c is XmlNode => typeof c !== 'string' && c.name === name);
/** `node`'s first element child named `name`. */
export const childNamed = (node: XmlNode | undefined, name: string): XmlNode | undefined => node?.children.find((c): c is XmlNode => typeof c !== 'string' && c.name === name);
/** All the text directly inside `node`. */
export const directText = (node: XmlNode): string => node.children.filter((c) => typeof c === 'string').join('');
