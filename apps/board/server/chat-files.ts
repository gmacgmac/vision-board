// The files the person attaches to a chat message (D-068, api.md 164): each is saved at
// `.visionboard/attachments/<YYYY-MM-DD>/<n>-<name>`, and the agent opens it by that path. A name is
// hostile until `attachmentName` has made it plain, and `<n>` means no two files clash and no name
// is special (`.env`, `CON`). Every step from the data folder down must be a plain folder, never a
// link, so a file's real path is the path written. A path a page sends back is believed only when
// `attachedFile`, the one check, finds a file of that exact shape there, or inside a plain folder of
// that shape, which only the board makes (`saveBeside`, `saveCopy`, D-071). The board never serves these
// files: no route reads them; the agent does, with its own tools (`ACCESS_RULES`). They stay out of the
// project's git: the board's own `.gitignore` names the folder (D-069 ruling 3).
import fs from 'node:fs';
import path from 'node:path';
import { ignoreInGit } from './agents.ts';
import { writeFileAtomic } from './atomic-file.ts';
import { KIB } from './body.ts';
import { DATA_DIR } from './ledger.ts';
import type { PointerError } from './problem.ts';
import { ProblemError, problem } from './problem.ts';
import * as serverChatWords from './words/server-chat.ts';

const ATTACHMENTS_DIR = 'attachments';
const NAME_MAX = 80;
const EXTENSION = /\.[A-Za-z0-9_-]{1,16}$/;
const STANDIN = 'file';
const NEW_FOLDER_TRIES = 999;
const NEW_FOLDER_TAIL = 4; // room for the `-<n>` of a new folder
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const SAVED = /^(\d+)-([A-Za-z0-9_-][A-Za-z0-9._-]{0,79})$/;
/** One step inside a folder the board made: no dot first, so no `..`, `.env` or `.git`. */
const INSIDE = /^[A-Za-z0-9_-][A-Za-z0-9._-]{0,79}$/;
/** How deep inside such a folder: as deep as an archive may go, and one for a folder expanded inside another. */
const INSIDE_DEPTH = 32;

/** The largest file: 10 MB (D-068 ruling 3). */
export const ATTACHMENT_BYTES = 10 * KIB * KIB;
/** `attach_chat_file`'s body limit: that file as base64, and room for its name and type. */
export const ATTACHMENT_BODY_BYTES = Math.ceil(ATTACHMENT_BYTES / 3) * 4 + 4 * KIB;

/** The largest picture the agent's provider took when measured, and the most a copy may be (D-071). */
export const PICTURE_BYTES = 5 * KIB * KIB;
const PAGES_SUFFIX = '-pages';
const FITTED_SUFFIX = '-fitted';
const PAGE_FILE = /^page-(\d{3})-of-(\d+)\.png$/;
const FITTED_FILE = /^fitted\.(?:png|jpg)$/;
const PNG_START = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG_START = [0xff, 0xd8, 0xff];

/** A saved file, as `attach_chat_file` answers it and `message_in.files` carries it (the schema's `attachedFile`).
 *  `label` is the name the person's file has, display only: it is shown as text and never reaches the prompt. */
export interface AttachedFile { name: string; path: string; size: number; label?: string }

export const fileTooLarge = () => problem('too-large', serverChatWords.thisFileIsOverThe);

/**
 * `raw` as a safe name: only its last path part, accents folded, anything else `_`, no leading or
 * trailing `.`, `-` or `_`, no run of dots, at most 80 characters, the extension kept. Compatibility forms
 * are folded first, so a fullwidth `／` counts as the `/` it reads as.
 */
export function attachmentName(raw: string): string {
  const base = raw.normalize('NFKD').replace(/\p{M}/gu, '').split(/[/\\]/).pop()!;
  const clean = base.replace(/[^A-Za-z0-9._-]+/g, '_').replace(/\.{2,}/g, '.');
  const extension = clean.replace(EXTENSION, '') === '' ? '' : (EXTENSION.exec(clean)?.[0] ?? ''); // `.env` is a name, not an extension
  const tidy = (s: string) => s.replace(/^[._-]+/, '').replace(/[._-]+$/, '');
  const stem = tidy(clean.slice(0, clean.length - extension.length)).slice(0, NAME_MAX - extension.length);
  return `${tidy(stem) || STANDIN}${extension}`;
}

/** Whether `p` is itself a file or a folder (a link is neither), with its size. */
function plain(p: string, want: 'file' | 'folder'): fs.Stats | undefined {
  try {
    const stat = fs.lstatSync(p);
    return (want === 'file' ? stat.isFile() : stat.isDirectory()) ? stat : undefined;
  } catch { return undefined; }
}

/** The day's folder, made if need be, a step at a time so nothing is made through a link. */
function dayFolder(folder: string, day: string): string {
  const root = path.join(folder, DATA_DIR, ATTACHMENTS_DIR);
  for (const dir of [root, path.join(root, day)]) {
    try { fs.mkdirSync(dir, { recursive: true }); } catch { /* something else is there: the check below says so */ }
    if (!plain(dir, 'folder')) throw problem('conflict', serverChatWords.theFileCouldNotBe);
  }
  return path.join(root, day);
}

/** Per day's folder, the highest number saved or named by a message while this server runs: a number stays taken once
 * its file is deleted, so a message still waiting never comes to name other bytes. Waiting messages live in
 * this server's memory too, so nothing that waits outlives what this knows. */
const taken = new Map<string, number>();
const take = (dir: string, n: number) => { taken.set(dir, Math.max(taken.get(dir) ?? 0, n)); };

/** One more than the highest number in the folder, or taken. */
function nextNumber(dir: string): number {
  return fs.readdirSync(dir).reduce((most, name) => Math.max(most, Number(/^\d+/.exec(name)?.[0] ?? 0)), taken.get(dir) ?? 0) + 1;
}

/** The bytes of `data`, which must be standard base64: `Buffer` reads anything, so what it read must write back the same. */
function decoded(data: string): Buffer {
  const bytes = Buffer.from(data, 'base64');
  if (bytes.toString('base64') !== data) throw problem('bad-request', serverChatWords.theFileIsNotValid);
  return bytes;
}

/** Save one attached file in board folder `folder` (a real path). The save runs in one go, so two uploads never share a number. */
export function saveAttachment(folder: string, input: { name: string; type: string; data: string }, now = new Date()): AttachedFile {
  const bytes = decoded(input.data);
  if (bytes.length > ATTACHMENT_BYTES) throw fileTooLarge();
  const day = now.toISOString().slice(0, 10);
  const dir = dayFolder(folder, day);
  ignoreInGit(path.join(folder, DATA_DIR), `${ATTACHMENTS_DIR}/`);
  const name = attachmentName(input.name);
  const number = nextNumber(dir);
  const saved = `${number}-${name}`;
  writeFileAtomic(path.join(dir, saved), bytes, 0o600);
  take(dir, number);
  return { name, path: [DATA_DIR, ATTACHMENTS_DIR, day, saved].join('/'), size: bytes.length };
}

/** The file at `rel`, a path a page or an agent sent, when it is one the board could have written and is still there: the exact shape, and no link at any step. */
export function attachedFile(folder: string, rel: string): AttachedFile | undefined {
  const [data, attachments, day, saved, ...inside] = rel.split('/');
  const name = SAVED.exec(saved ?? '')?.[2];
  if (data !== DATA_DIR || attachments !== ATTACHMENTS_DIR || !DAY.test(day ?? '') || !name) return undefined;
  if (inside.length > INSIDE_DEPTH || !inside.every((step) => INSIDE.test(step))) return undefined;
  const steps = [day!, saved!, ...inside];
  let at = path.join(folder, DATA_DIR, ATTACHMENTS_DIR);
  if (!plain(at, 'folder')) return undefined;
  for (const step of steps.slice(0, -1)) {
    at = path.join(at, step);
    if (!plain(at, 'folder')) return undefined;
  }
  const stat = plain(path.join(at, steps[steps.length - 1]!), 'file');
  return stat && { name: inside[inside.length - 1] ?? name, path: rel, size: stat.size };
}

/** What a message's `files` name, each by `attachedFile`, its label kept as it came; `invalid` at `/files/<i>` for any other, and for a path named twice. */
export function attachedFiles(folder: string, items: { path: string; label?: string }[]): AttachedFile[] {
  const files: AttachedFile[] = [];
  const errors: PointerError[] = [];
  const named = new Set<string>();
  items.forEach(({ path: rel, label }, i) => {
    const file = named.has(rel) ? undefined : attachedFile(folder, rel);
    named.add(rel);
    if (file && file.size <= ATTACHMENT_BYTES) {
      files.push({ ...file, ...(label !== undefined && { label }) });
      const [dayDir, saved] = [rel.split('/').slice(0, 3).join('/'), rel.split('/')[3]!];
      take(path.join(folder, dayDir), Number.parseInt(saved, 10));
    } else errors.push({ pointer: `/files/${i}`, detail: serverChatWords.thisIsNotAFile });
  });
  if (errors.length) throw problem('invalid', serverChatWords.theMessageNamesFilesThat, { errors });
  return files;
}

/** A waiting message's `files`, checked again as it goes: each by `attachedFile`, so it is the one check. */
export function stillThere(folder: string, files: AttachedFile[]): { there: AttachedFile[]; gone: AttachedFile[] } {
  const isThere = (f: AttachedFile) => attachedFile(folder, f.path) !== undefined;
  return { there: files.filter(isThere), gone: files.filter((f) => !isThere(f)) };
}

/** A message as it goes, its files checked again: one deleted while it waited is left out, and `said` tells the person
 * (by the name they know) and the agent (by the saved name: a label never reaches the prompt) which. */
export function checked<M extends { files?: AttachedFile[]; beside?: Record<string, Beside> }>(folder: string, msg: M): { msg: M; said?: { person: string; agent: string } } {
  if (!msg.files) return { msg };
  const { files: _, ...rest } = msg;
  const { there, gone } = stillThere(folder, msg.files);
  const beside = Object.fromEntries(there.flatMap((f) => { const b = besideOf(folder, f.path); return b ? [[f.path, b]] : []; }));
  return {
    msg: { ...rest, ...(there.length > 0 && { files: there }), ...(Object.keys(beside).length > 0 && { beside }) } as M,
    ...(gone.length > 0 && { said: { person: serverChatWords.fileGoneForThePerson(gone.map((f) => f.label ?? f.name)), agent: serverChatWords.fileGoneForTheAgent(gone.map((f) => f.name)) } }),
  };
}

/** `text`, then the line `checked` gave; the line alone when the message has nothing else to say. */
export const withSaid = (text: string, line: string | undefined, alone = false): string => (alone && line ? line : [text, line].filter(Boolean).join('\n\n'));

/** What the page made of an attached file, by what is on disk now: a PDF's pages (`first` to `last`, `saved` of `total`), or a picture's fitted copy. */
export type Beside = { kind: 'pages'; folder: string; first: string; last: string; saved: number; total: number } | { kind: 'fitted'; path: string };

const startsWith = (bytes: Uint8Array, start: number[]) => start.every((b, i) => bytes[i] === b);

/** The folder a copy of `rel` goes in: its name less the extension, and `suffix`, within the limit for one step. */
function copiesFolder(rel: string, suffix: string): string {
  const stem = path.posix.basename(rel).replace(/\.[^.]*$/, '');
  return `${path.posix.dirname(rel)}/${stem.slice(0, NAME_MAX - suffix.length)}${suffix}`;
}

const notACopy = (pointer: string, detail: string) => problem('invalid', serverChatWords.theCopyWasNotSaved, { errors: [{ pointer, detail }] });

/**
 * A picture the page made of the attached file `of.path`, a PDF's page or a fitted copy, in a folder beside it. The page checked it
 * when the sandboxed frame handed it over, and it is checked again here. The server names it, nothing is written over anything, and no step is a link.
 */
export function saveCopy(folder: string, input: { data: string; of: { path: string; page?: number | undefined; pages?: number | undefined } }): AttachedFile {
  const { path: rel, page, pages } = input.of;
  const bytes = decoded(input.data);
  if (bytes.length > PICTURE_BYTES) throw problem('too-large', serverChatWords.thisCopyIsOverThe);
  if (!attachedFile(folder, rel) || rel.split('/').length !== 4) throw notACopy('/of/path', serverChatWords.thisIsNotAFile);
  if (page !== undefined && page > pages!) throw notACopy('/of/page', serverChatWords.thereIsNoSuchPage(page, pages!));
  const png = startsWith(bytes, PNG_START);
  if (!png && (page !== undefined || !startsWith(bytes, JPEG_START))) throw notACopy('/data', serverChatWords.thisIsNotAPicture);
  const dir = copiesFolder(rel, page === undefined ? FITTED_SUFFIX : PAGES_SUFFIX);
  const at = path.join(folder, dir);
  try { fs.mkdirSync(at, { mode: 0o700 }); } catch { /* there already, for the page before: the check below says what it is */ }
  if (!plain(at, 'folder')) throw problem('conflict', serverChatWords.theNewFolderCouldNot);
  const name = page === undefined ? `fitted.${png ? 'png' : 'jpg'}` : `page-${String(page).padStart(3, '0')}-of-${String(pages).padStart(3, '0')}.png`;
  try { fs.writeFileSync(path.join(at, name), bytes, { flag: 'wx', mode: 0o600 }); } catch { throw problem('conflict', serverChatWords.thisCopyIsAlreadySaved); }
  return { name, path: `${dir}/${name}`, size: bytes.length };
}

/** What is saved beside the attached file `rel`, read now: only plain files of the names `saveCopy` gives. */
export function besideOf(folder: string, rel: string): Beside | undefined {
  const plainIn = (dir: string, shape: RegExp) => (plain(path.join(folder, dir), 'folder')
    ? fs.readdirSync(path.join(folder, dir)).filter((n) => shape.test(n) && plain(path.join(folder, dir, n), 'file')).sort() : []);
  const fitted = copiesFolder(rel, FITTED_SUFFIX);
  const [copy] = plainIn(fitted, FITTED_FILE);
  if (copy) return { kind: 'fitted', path: `${fitted}/${copy}` };
  const dir = copiesFolder(rel, PAGES_SUFFIX);
  const saved = plainIn(dir, PAGE_FILE);
  const [first, last] = [saved[0], saved[saved.length - 1]];
  return first && last ? { kind: 'pages', folder: dir, first, last, saved: saved.length, total: Number(PAGE_FILE.exec(first)![2]) } : undefined;
}

/** One file `saveBeside` saved: `from` is its name in what it came from, untrusted, when the saved name differs. */
export interface SavedFile { path: string; size: number; from?: string }

/** `name`, or with `-<n>` before its extension for n above 1, within the limit for one step. */
function numbered(name: string, n: number): string {
  const extension = EXTENSION.exec(name)?.[0] ?? '';
  const tail = n > 1 ? `-${n}` : '';
  return `${name.slice(0, name.length - extension.length).slice(0, NAME_MAX - extension.length - tail.length)}${tail}${extension}`;
}

/** Each path as the board's own: every step through `attachmentName`, and a taken name gets another. Names are compared without case, as a disk may. */
function ownPaths(paths: string[]): string[] {
  const folders = new Map<string, string>();
  const taken = new Set<string>();
  const claim = (parent: string, raw: string) => {
    const name = attachmentName(raw);
    for (let n = 1; ; n++) {
      const candidate = `${parent}${numbered(name, n)}`;
      if (!taken.has(candidate.toLowerCase())) { taken.add(candidate.toLowerCase()); return candidate; }
    }
  };
  return paths.map((p) => {
    const parts = p.split('/');
    let own = '';
    parts.slice(0, -1).forEach((part, i) => {
      const key = parts.slice(0, i + 1).join('/');
      if (!folders.has(key)) folders.set(key, `${claim(own, part)}/`);
      own = folders.get(key)!;
    });
    return claim(own, parts[parts.length - 1]!);
  });
}

/** A new folder for `name` in `parent`: another name when it is taken, as Finder does. `mkdir` fails on anything there, so this never goes over or through it. */
function newFolder(parent: string, name: string): string {
  for (let n = 1; n <= NEW_FOLDER_TRIES; n++) {
    const candidate = n > 1 ? `${name}-${n}` : name;
    try {
      fs.mkdirSync(path.join(parent, candidate), { mode: 0o700 });
      return candidate;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'EEXIST') break;
    }
  }
  throw problem('conflict', serverChatWords.theNewFolderCouldNot);
}

/**
 * `files` saved in a new folder beside the attached file `rel`, named after it and `suffix`: nothing is
 * ever written over anything, each name is the board's own, whatever is asked, and a failure leaves no folder.
 */
export function saveBeside(folder: string, rel: string, suffix: string, files: { path: string; bytes: Uint8Array }[]): { folder: string; files: SavedFile[] } {
  if (!attachedFile(folder, rel)) throw problem('conflict', serverChatWords.theNewFolderCouldNot);
  ignoreInGit(path.join(folder, DATA_DIR), `${ATTACHMENTS_DIR}/`);
  const parentRel = path.posix.dirname(rel);
  const parent = path.join(folder, parentRel);
  const stem = path.posix.basename(rel).replace(/\.[^.]*$/, '');
  const name = newFolder(parent, `${stem.slice(0, NAME_MAX - suffix.length - NEW_FOLDER_TAIL)}${suffix}`);
  const own = ownPaths(files.map((f) => f.path));
  try {
    const saved = files.map((f, i) => {
      const target = path.join(parent, name, own[i]!);
      fs.mkdirSync(path.dirname(target), { recursive: true, mode: 0o700 });
      fs.writeFileSync(target, f.bytes, { flag: 'wx', mode: 0o600 });
      return { path: `${parentRel}/${name}/${own[i]}`, size: f.bytes.length, ...(own[i] !== f.path && { from: f.path }) };
    });
    return { folder: `${parentRel}/${name}`, files: saved };
  } catch (err) {
    fs.rmSync(path.join(parent, name), { recursive: true, force: true });
    throw err instanceof ProblemError ? err : problem('conflict', serverChatWords.theNewFolderCouldNot);
  }
}

/** The bytes of the plain file `rel` (`attachedFile` has passed it): no link is followed even now, and the size is the one read. Undefined when it changed under us or is over `limit`. */
export function attachedBytes(folder: string, rel: string, limit: number): Uint8Array | undefined {
  let fd: number;
  try { fd = fs.openSync(path.join(folder, rel), fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW); } catch { return undefined; }
  try {
    const stat = fs.fstatSync(fd);
    if (!stat.isFile() || stat.size > limit) return undefined;
    const bytes = new Uint8Array(stat.size);
    let read = 0;
    while (read < bytes.length) {
      const n = fs.readSync(fd, bytes, read, bytes.length - read, read);
      if (n === 0) return undefined;
      read += n;
    }
    return bytes;
  } finally { fs.closeSync(fd); }
}
