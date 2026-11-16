// The icon library's one check (D-100 3, api.md 185; ledger review § 4 O4). A library drawing is path data in an SVG
// wrapper, never markup: the server writes one fixed form (`iconFileText`), and a file is used only when it is exactly
// that form (`iconFileProblem`: a pattern over the whole text, then each `d` by the path grammar, `iconPathProblem`),
// on add and on every read, because a file can arrive by hand, by git or by a sync. The page never puts a file's text
// into the page: it takes the checked `d` strings (`iconPathsOf`) and builds the elements itself, as the node does
// with its own icons. Pure string logic with no `node:` import: the server and the page share it, as they share
// `imagePathProblem`. No XML parser: nothing outside the fixed form is ever read as markup.
import { codePoints } from './ledger-shape.ts';
import * as words from './words/format-icons.ts';

/** The box every icon is drawn on, built-in and library alike: `viewBox="0 0 24 24"`. */
export const ICON_BOX = 24;

/** The fixed opening of every icon file. */
const SVG_OPEN = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${ICON_BOX} ${ICON_BOX}">`;
const PATH_OPEN = '<path d="';
const PATH_CLOSE = '"/>';
const SVG_CLOSE = '</svg>\n';

const PATHS = 8;
const PATH_CHARS = 2000;
const TITLE_CHARS = 80;

/** Every limit on a library drawing, in one table. */
export const ICON_LIMITS = {
  /** The most paths one drawing holds. */
  paths: PATHS,
  /** The most characters one path's `d` holds. */
  pathChars: PATH_CHARS,
  /** The most characters (code points) a title holds: a few words saying what it shows. */
  titleChars: TITLE_CHARS,
  /** The largest number a path may hold, either sign: room for any drawing on the box, none for one written to
   * overflow a reader. */
  number: 1000,
  /** The most characters an icon file holds: room for the fixed form at every limit above, a title written as `&amp;`
   * at worst (icon-file.test.ts holds it). A plain number, so the page carries nothing for it until it reads a file. */
  fileChars: 16_600,
} as const;

/** What a path's `d` may hold: the path letters, digits, `.`, `,`, `-`, `e` and spaces. ASCII only, so a look-alike
 * letter from another script never passes. */
const PATH_OUTSIDE = /[^MmLlHhVvCcSsQqTtAaZz0-9.,\-e ]/u;
/** One token of a `d`: a path letter, a number (an `e` only as its exponent), or the space and commas between. */
const TOKEN = /[MmLlHhVvCcSsQqTtAaZz]|-?(?:\d+\.?\d*|\.\d+)(?:e-?\d+)?|[ ,]+/y;

/** A character as a refusal names it: quoted, with its code point, so a look-alike letter shows what it is. */
const named = (ch: string): string => `${JSON.stringify(ch)} (U+${ch.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0')})`;

/** Why `d` is not a path the board draws, in plain words; undefined when it is. Only the grammar's characters, a move
 * first, every number readable and within `ICON_LIMITS.number`. Arity is the browser's: a malformed path draws less,
 * never anything else. */
export function iconPathProblem(d: string): string | undefined {
  if (d.length > PATH_CHARS) return words.pathTooLong(d.length, PATH_CHARS);
  if (d.trim() === '') return words.pathEmpty;
  const odd = PATH_OUTSIDE.exec(d);
  if (odd) return words.pathChar(named(odd[0]), odd.index);
  let first = true;
  for (let at = 0; at < d.length;) {
    TOKEN.lastIndex = at;
    const m = TOKEN.exec(d);
    if (!m) return words.pathToken(d.slice(at, at + 12), at);
    const t = m[0];
    at += t.length;
    if (/^[ ,]/.test(t)) continue;
    if (first && t !== 'M' && t !== 'm') return words.pathStart;
    first = false;
    if (/\d/.test(t) && !(Math.abs(Number(t)) <= ICON_LIMITS.number)) return words.pathNumber(t.slice(0, 24), ICON_LIMITS.number);
  }
  return undefined;
}

/** `&`, `<` and `>` as a title holds them in the file; the page reads the title back as text. */
const escapeTitle = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const unescapeTitle = (s: string): string => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

/** The one form the server writes: the svg with the box, an optional title, then a `path` with a `d` and nothing else
 * for each path, on one line. Checks nothing: the server runs `iconFileProblem` on what it made before writing it. */
export const iconFileText = (paths: readonly string[], title?: string): string =>
  `${SVG_OPEN}${title ? `<title>${escapeTitle(title)}</title>` : ''}${paths.map((d) => `${PATH_OPEN}${d}${PATH_CLOSE}`).join('')}${SVG_CLOSE}`;

/** What a title may not hold: a control character, or an invisible or direction-changing mark. */
const TITLE_OUTSIDE = /[\u0000-\u001f\u007f\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff]/u;

/** Why `title` can't be an icon's title, in plain words; undefined when it can: a few words, no control character
 * and no invisible or direction-changing mark (it is shown as text, never as markup). */
export function iconTitleProblem(title: string): string | undefined {
  if (title.trim() === '') return words.titleEmpty;
  const n = codePoints(title);
  if (n > TITLE_CHARS) return words.titleTooLong(n, TITLE_CHARS);
  const odd = TITLE_OUTSIDE.exec(title);
  return odd ? words.titleChar(named(odd[0])) : undefined;
}

const esc = (s: string): string => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
/** A title's text: no markup, no control character, no invisible or direction-changing mark, and only the three
 * escapes `iconFileText` writes. */
const TITLE_TEXT = '(?:[^<>&\\u0000-\\u001f\\u007f\\u200b-\\u200f\\u202a-\\u202e\\u2066-\\u2069\\ufeff]|&(?:amp|lt|gt);)+';
/** The whole file, start to end (the form `iconFileText` writes and nothing else), and one path in it. Built on first
 * use, so a bundle that never reads a file carries no work for them. */
let forms: { file: RegExp; path: RegExp } | undefined;
const formsOf = (): { file: RegExp; path: RegExp } => (forms ??= {
  file: new RegExp(`^${esc(SVG_OPEN)}(?:<title>(${TITLE_TEXT})</title>)?((?:${esc(PATH_OPEN)}[^"]*${esc(PATH_CLOSE)})+)${esc(SVG_CLOSE)}$`),
  path: new RegExp(`${esc(PATH_OPEN)}([^"]*)${esc(PATH_CLOSE)}`, 'g'),
});
/** What each element of the fixed form may carry. */
const ALLOWED: Readonly<Record<string, readonly string[] | undefined>> = { svg: ['xmlns', 'viewBox'], title: [], path: ['d'] };
const clipped = (s: string): string => JSON.stringify(s.length > 40 ? `${s.slice(0, 40)}…` : s);

/** The first thing in `text` the fixed form never holds: a declaration, a comment or CDATA, another element, or another
 * attribute; undefined when every tag is one the form has (the file is still off its form). */
function oddity(text: string): string | undefined {
  for (const m of text.matchAll(/<([!?/]?)([^\s<>/]*)([^<>]*)>?/g)) {
    const [, mark, name = '', rest = ''] = m;
    if (mark === '!' || mark === '?') return clipped(`<${mark}${name}`);
    const attrs = Object.hasOwn(ALLOWED, name) ? ALLOWED[name] : undefined;
    if (attrs === undefined) return words.foundElement(clipped(name));
    if (mark === '/') continue;
    for (const a of rest.matchAll(/([^\s=/]+)\s*=/g)) if (!attrs.includes(a[1]!)) return words.foundAttribute(clipped(a[1]!), name);
  }
  return undefined;
}

/** A checked drawing: its `d` strings and its title, when the file has one. */
export interface IconDrawing { paths: string[]; title?: string }

/** `text` read as an icon file: the drawing, or why it is refused. */
function readIconFile(text: string): IconDrawing | { problem: string } {
  const max = ICON_LIMITS.fileChars;
  if (text.length > max) return { problem: words.fileTooLong(text.length, max) };
  if (text.startsWith('﻿')) return { problem: words.fileBom };
  if (text.includes('\r')) return { problem: words.fileCr };
  const { file, path } = formsOf();
  const m = file.exec(text);
  if (!m) {
    const found = oddity(text);
    return { problem: found === undefined ? words.fileForm : words.fileHolds(found) };
  }
  const title = m[1] === undefined ? undefined : unescapeTitle(m[1]);
  const bad = title === undefined ? undefined : iconTitleProblem(title);
  if (bad !== undefined) return { problem: bad };
  const paths = [...m[2]!.matchAll(path)].map((p) => p[1]!);
  if (paths.length > PATHS) return { problem: words.tooManyPaths(paths.length, PATHS) };
  for (const [i, d] of paths.entries()) {
    const why = iconPathProblem(d);
    if (why !== undefined) return { problem: words.pathAt(i + 1, why) };
  }
  return { paths, ...(title !== undefined && { title }) };
}

/** Why `text` is not an icon file the board uses, in plain words; undefined when it is exactly the fixed form
 * `iconFileText` writes, with every `d` passing `iconPathProblem`. */
export const iconFileProblem = (text: string): string | undefined => {
  const r = readIconFile(text);
  return 'problem' in r ? r.problem : undefined;
};

/** The checked drawing in `text`: its `d` strings and title; undefined when `iconFileProblem` refuses the file, so no
 * path leaves here unchecked. */
export const iconPathsOf = (text: string): IconDrawing | undefined => {
  const r = readIconFile(text);
  return 'problem' in r ? undefined : r;
};
