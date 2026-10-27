// Images in cards (D-048, docs/specification/images.md): which files the board shows in a card and
// the one check of a path to one. An image is a file under the project's `.visionboard/images/`
// that a card's Markdown names as `![alt](path)`; the board serves it at `/board-images/<path>`.
// This is the one place the limits and the path check live: the server's route and the Markdown
// renderer both call `imagePathProblem`, so the two can't disagree. Pure string logic: it reads no
// file and touches no DOM, so it runs in the page and in the server alike.

/** Where images live in a project, under `.visionboard/`. */
export const IMAGES_DIR = 'images';

/** The board's route for an image: this, then the path inside the images folder. Outside /api. */
export const IMAGE_ROUTE = '/board-images/';

const MB = 1024 * 1024;
const NAME_CHARS = 100;

/** One image type: the file extensions it goes by, its content type and the bytes its files start
 * with. `magic` lists the ways a file may start; a file matches one when every part is there
 * (`bytes` is a Latin-1 string, one character per byte, `at` is the offset). svg is text and has no
 * such bytes: `svgProblem` reads its opening instead. */
export interface ImageType {
  readonly extensions: readonly string[];
  readonly contentType: string;
  readonly magic: readonly (readonly { readonly at: number; readonly bytes: string }[])[];
}

/** Every limit on an image, in one table. svg is here as a picture only (D-064, the svgImages flag):
 * D-048 left it out because it can carry script, which is true only of an svg opened as a page;
 * the page shows it only through <img>, where a browser runs none of its script and loads nothing it
 * names, and the route serves it under a policy that allows no script, so its address opened on its
 * own runs nothing on the board's origin either. An svg that needs script is an app card (D-047). */
export const IMAGE_LIMITS = {
  /** The most one image file may hold, in bytes. */
  maxBytes: 8 * MB,
  /** The most one svg may hold: it is text the browser parses whole, so it gets less room. */
  svgMaxBytes: 1 * MB,
  /** How far into an svg its opening (anything before its root element, and that element's opening
   * tag) must end: `svgProblem` reads no further. */
  svgHeadBytes: 4096,
  /** The most folders a path may go down from the images folder. */
  depth: 8,
  /** The most characters one name (a folder or the file) may have. */
  nameChars: NAME_CHARS,
  /** One name: letters, digits, `-`, `_` and `.`, not starting with a dot (so never `..`). */
  name: new RegExp(`^[A-Za-z0-9_-][A-Za-z0-9_.-]{0,${NAME_CHARS - 1}}$`),
  types: {
    png: { extensions: ['png'], contentType: 'image/png', magic: [[{ at: 0, bytes: '\x89PNG\r\n\x1a\n' }]] },
    jpeg: { extensions: ['jpg', 'jpeg'], contentType: 'image/jpeg', magic: [[{ at: 0, bytes: '\xff\xd8\xff' }]] },
    webp: { extensions: ['webp'], contentType: 'image/webp', magic: [[{ at: 0, bytes: 'RIFF' }, { at: 8, bytes: 'WEBP' }]] },
    gif: { extensions: ['gif'], contentType: 'image/gif', magic: [[{ at: 0, bytes: 'GIF87a' }], [{ at: 0, bytes: 'GIF89a' }]] },
    svg: { extensions: ['svg'], contentType: 'image/svg+xml', magic: [] },
  },
} as const satisfies { types: Record<string, ImageType> } & Record<string, unknown>;

export type ImageName = keyof typeof IMAGE_LIMITS.types;
const NAMES = Object.keys(IMAGE_LIMITS.types) as ImageName[];

/** The types without svg: what is allowed while the svgImages flag is off. */
const RASTER = NAMES.filter((n) => n !== 'svg');
/** How many bytes from the start of a file `imageTypeOf` and `svgProblem` need to see. */
export const IMAGE_HEAD_BYTES = Math.max(IMAGE_LIMITS.svgHeadBytes, ...NAMES.flatMap((n) => IMAGE_LIMITS.types[n].magic.flatMap((m) => m.map((p) => p.at + p.bytes.length))));

/** "only a, b or c" for a list of type names. */
const only = (names: readonly string[]): string => `only ${names.slice(0, -1).join(', ')} or ${names.at(-1)}`;

/** The words for why an image is not shown, in plain language: the route's problems and the
 * page's "image not shown" text both use them. `type` and `typeNoSvg` (the svgImages flag off) are
 * the ones about the file's type; `imageNotReal` takes the type its name claims. */
export const IMAGE_WORDS = {
  empty: 'no file name',
  outside: 'must be inside the images folder',
  web: 'no images from the internet',
  slash: 'use / between folders',
  dot: "names can't start with a dot",
  blank: 'empty folder name',
  chars: 'only letters, digits, - _ and .',
  long: `names are ${NAME_CHARS} characters at most`,
  deep: `more than ${IMAGE_LIMITS.depth} folders`,
  type: only(NAMES),
  typeNoSvg: only(RASTER),
  missing: 'not found',
  tooBig: `over ${IMAGE_LIMITS.maxBytes / MB} MB`,
  svgTooBig: `over ${IMAGE_LIMITS.svgMaxBytes / MB} MB`,
  svgSize: 'needs a viewBox, or a width and height',
  svgEntity: "an svg can't declare entities",
} as const;

/** The reason for a file whose bytes are not the type its name says. */
export const imageNotReal = (type: ImageName): string => `not a real ${type}`;

const EXTENSIONS = new Map<string, ImageName>(NAMES.flatMap((n) => IMAGE_LIMITS.types[n].extensions.map((e): [string, ImageName] => [e, n])));

/** The type a path's extension names (in any case; `jpg` is `jpeg`), or nothing. */
export function imageTypeByName(path: string): ImageName | undefined {
  const ext = /\.([A-Za-z0-9]+)$/.exec(path)?.[1];
  return ext === undefined ? undefined : EXTENSIONS.get(ext.toLowerCase());
}

/** The type a file's first bytes say it is (`IMAGE_HEAD_BYTES` are enough), or nothing. */
export function imageTypeOf(head: Uint8Array): ImageName | undefined {
  const starts = ({ at, bytes }: { at: number; bytes: string }) =>
    head.length >= at + bytes.length && [...bytes].every((c, i) => head[at + i] === c.charCodeAt(0));
  return NAMES.find((n) => IMAGE_LIMITS.types[n].magic.some((parts) => parts.every(starts)));
}

const SVG_NS = 'http://www.w3.org/2000/svg';
/** An svg's opening: an optional BOM, then any white space, processing instructions (the XML
 * declaration), comments and a doctype, then the root `<svg` and its attributes up to `>` (group 1).
 * Each alternative starts with its own character, so a long run can't make it backtrack. */
const SVG_OPENING = /^(?:\xef\xbb\xbf)?(?:\s|<\?[\s\S]*?\?>|<!--[\s\S]*?-->|<!DOCTYPE(?:[^[>]|\[[^\]]*\])*>)*<svg(?=[\s/>])((?:[^>"']|"[^"]*"|'[^']*')*)>/;
const ATTRIBUTE = /([^\s=]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
/** A length that gives the picture a size: a positive number, in px or another absolute unit, or none. */
const LENGTH = /^\s*(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?\s*(?:px|pt|pc|mm|cm|in|em|ex)?\s*$/i;
const positive = (v: string | undefined): boolean => v !== undefined && LENGTH.test(v) && parseFloat(v) > 0;
/** A viewBox: four numbers, the last two (its width and height) above 0. */
const viewBoxOk = (v: string | undefined): boolean => {
  const n = (v ?? '').trim().split(/[\s,]+/).map(Number);
  return n.length === 4 && n.every(Number.isFinite) && n[2]! > 0 && n[3]! > 0;
};

/** Why the first bytes of a file named `.svg` (`IMAGE_HEAD_BYTES` are enough) are not one the board
 * shows, in `IMAGE_WORDS`' words; nothing when they are. It must open, within `svgHeadBytes`, an
 * `<svg>` root in the SVG namespace that says its size (a `viewBox`, or a `width` and a `height`), so
 * the browser never falls back to its 300 by 150 default; a doctype that declares entities is
 * refused (a picture never needs one, and expanding them costs the browser). Its script is not
 * looked for: the browser runs none of it in an <img>, and the route's policy stops it elsewhere. */
export function svgProblem(head: Uint8Array): string | undefined {
  let text = '';
  for (const b of head.subarray(0, IMAGE_LIMITS.svgHeadBytes)) text += String.fromCharCode(b);
  const root = text.search(/<svg[\s/>]/);
  if (/<!ENTITY/i.test(root < 0 ? text : text.slice(0, root))) return IMAGE_WORDS.svgEntity;
  const opening = SVG_OPENING.exec(text);
  if (!opening) return imageNotReal('svg');
  const attrs = new Map([...opening[1]!.matchAll(ATTRIBUTE)].map((m): [string, string] => [m[1]!, m[2] ?? m[3]!]));
  if (attrs.get('xmlns') !== SVG_NS) return imageNotReal('svg');
  return viewBoxOk(attrs.get('viewBox')) || (positive(attrs.get('width')) && positive(attrs.get('height'))) ? undefined : IMAGE_WORDS.svgSize;
}

/** Why a file whose name says `type` is not shown, from its first bytes (`IMAGE_HEAD_BYTES`): they
 * must be that type's (`imageTypeOf`), or for svg pass `svgProblem`. Nothing when it is shown. */
export function imageHeadProblem(type: ImageName, head: Uint8Array): string | undefined {
  if (type === 'svg') return svgProblem(head);
  return imageTypeOf(head) === type ? undefined : imageNotReal(type);
}

/** The most a file of `type` may hold, and the words when it holds more. */
export const imageCap = (type: ImageName): { bytes: number; words: string } =>
  type === 'svg' ? { bytes: IMAGE_LIMITS.svgMaxBytes, words: IMAGE_WORDS.svgTooBig } : { bytes: IMAGE_LIMITS.maxBytes, words: IMAGE_WORDS.tooBig };

/** What a caller allows: `svg` is the svgImages flag (on unless said otherwise); off, an svg is
 * refused as any other type, in the words of the time before svg (`typeNoSvg`). */
export interface ImageAllow { readonly svg?: boolean }

const SCHEME = /^[A-Za-z][A-Za-z0-9+.-]*:/;
/** An internet address: `http:`, `https:` or `//` at the start (other schemes are not the internet). */
const WEB = /^(https?:|\/\/)/i;

/** Why `path` can't be an image under the images folder, in the words of `IMAGE_WORDS`; nothing when
 * it can. `path` is as a card's Markdown writes it, not decoded: a `%` is refused like any other
 * odd character, so no encoding can hide a `..`. It must be a plain relative path of names
 * (`IMAGE_LIMITS.name`) at most `depth` folders deep, ending in a file name of an allowed type
 * (`allow`: svg only with the svgImages flag on). This is the one path check: the board's route and the Markdown renderer both call it. */
export function imagePathProblem(path: string, { svg = true }: ImageAllow = {}): string | undefined {
  if (path === '') return IMAGE_WORDS.empty;
  if (WEB.test(path)) return IMAGE_WORDS.web;
  if (SCHEME.test(path) || path.startsWith('/') || path.startsWith('\\')) return IMAGE_WORDS.outside;
  if (path.includes('\\')) return IMAGE_WORDS.slash;
  const names = path.split('/');
  for (const [i, name] of names.entries()) {
    if (name === '') return i === names.length - 1 ? IMAGE_WORDS.empty : IMAGE_WORDS.blank;
    if (name === '..') return IMAGE_WORDS.outside;
    if (name.startsWith('.')) return IMAGE_WORDS.dot;
    if (name.length > IMAGE_LIMITS.nameChars) return IMAGE_WORDS.long;
    if (!IMAGE_LIMITS.name.test(name)) return IMAGE_WORDS.chars;
  }
  if (names.length - 1 > IMAGE_LIMITS.depth) return IMAGE_WORDS.deep;
  const type = imageTypeByName(path);
  if (!svg) return type && type !== 'svg' ? undefined : IMAGE_WORDS.typeNoSvg;
  return type ? undefined : IMAGE_WORDS.type;
}
