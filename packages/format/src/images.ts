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
 * (`bytes` is a Latin-1 string, one character per byte, `at` is the offset). */
export interface ImageType {
  readonly extensions: readonly string[];
  readonly contentType: string;
  readonly magic: readonly (readonly { readonly at: number; readonly bytes: string }[])[];
}

/** Every limit on an image, in one table. svg is not here on purpose: it can carry script. */
export const IMAGE_LIMITS = {
  /** The most one image file may hold, in bytes. */
  maxBytes: 8 * MB,
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
  },
} as const satisfies { types: Record<string, ImageType> } & Record<string, unknown>;

export type ImageName = keyof typeof IMAGE_LIMITS.types;
const NAMES = Object.keys(IMAGE_LIMITS.types) as ImageName[];

/** How many bytes from the start of a file `imageTypeOf` needs to see. */
export const IMAGE_HEAD_BYTES = Math.max(...NAMES.flatMap((n) => IMAGE_LIMITS.types[n].magic.flatMap((m) => m.map((p) => p.at + p.bytes.length))));

/** The words for why an image is not shown, in plain language: the route's problems and the
 * page's "image not shown" text both use them. `type` is the only one that is about the file's
 * type; `notReal` takes the type its name claims. */
export const IMAGE_WORDS = {
  empty: 'no file name',
  outside: 'must be inside the images folder',
  slash: 'use / between folders',
  dot: "names can't start with a dot",
  blank: 'empty folder name',
  chars: 'only letters, digits, - _ and .',
  long: `names are ${NAME_CHARS} characters at most`,
  deep: `more than ${IMAGE_LIMITS.depth} folders`,
  type: `only ${NAMES.slice(0, -1).join(', ')} or ${NAMES.at(-1)}`,
  missing: 'not found',
  tooBig: `over ${IMAGE_LIMITS.maxBytes / MB} MB`,
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

const SCHEME = /^[A-Za-z][A-Za-z0-9+.-]*:/;

/** Why `path` can't be an image under the images folder, in the words of `IMAGE_WORDS`; nothing when
 * it can. `path` is as a card's Markdown writes it, not decoded: a `%` is refused like any other
 * odd character, so no encoding can hide a `..`. It must be a plain relative path of names
 * (`IMAGE_LIMITS.name`) at most `depth` folders deep, ending in a file name of an allowed type.
 * This is the one path check: the board's route and the Markdown renderer both call it. */
export function imagePathProblem(path: string): string | undefined {
  if (path === '') return IMAGE_WORDS.empty;
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
  return imageTypeByName(path) ? undefined : IMAGE_WORDS.type;
}
