// The files the person attaches to a chat message (D-068, api.md 164): each is saved at
// `.visionboard/attachments/<YYYY-MM-DD>/<n>-<name>`, and the agent opens it by that path. A name is
// hostile until `attachmentName` has made it plain, and `<n>` means no two files clash and no name
// is special (`.env`, `CON`). Every step from the data folder down must be a plain folder, never a
// link, so a file's real path is the path written. A path a page sends back is believed only when
// `attachedFile`, the one check, finds a file of that exact shape there. The board never serves these
// files: no route reads them; the agent does, with its own tools (`ACCESS_RULES`). They stay out of the
// project's git: the board's own `.gitignore` names the folder (D-069 ruling 3).
import fs from 'node:fs';
import path from 'node:path';
import { ignoreInGit } from './agents.ts';
import { writeFileAtomic } from './atomic-file.ts';
import { KIB } from './body.ts';
import { DATA_DIR } from './ledger.ts';
import type { PointerError } from './problem.ts';
import { problem } from './problem.ts';
import * as serverChatWords from './words/server-chat.ts';

const ATTACHMENTS_DIR = 'attachments';
const NAME_MAX = 80;
const EXTENSION = /\.[A-Za-z0-9_-]{1,16}$/;
const STANDIN = 'file';
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const SAVED = /^(\d+)-([A-Za-z0-9_-][A-Za-z0-9._-]{0,79})$/;

/** The largest file: 10 MB (D-068 ruling 3). */
export const ATTACHMENT_BYTES = 10 * KIB * KIB;
/** `attach_chat_file`'s body limit: that file as base64, and room for its name and type. */
export const ATTACHMENT_BODY_BYTES = Math.ceil(ATTACHMENT_BYTES / 3) * 4 + 4 * KIB;

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

/** The file at `rel`, a path a page sent, when it is one `saveAttachment` could have written and is still there: the exact shape, and no link at any step. */
export function attachedFile(folder: string, rel: string): AttachedFile | undefined {
  const [data, attachments, day, saved, ...rest] = rel.split('/');
  const name = SAVED.exec(saved ?? '')?.[2];
  if (data !== DATA_DIR || attachments !== ATTACHMENTS_DIR || !DAY.test(day ?? '') || !name || rest.length > 0) return undefined;
  const root = path.join(folder, DATA_DIR, ATTACHMENTS_DIR);
  if (!plain(root, 'folder') || !plain(path.join(root, day!), 'folder')) return undefined;
  const stat = plain(path.join(root, day!, saved!), 'file');
  return stat && { name, path: rel, size: stat.size };
}

/** What a message's `files` name, each by `attachedFile`, its label kept as it came; `invalid` at `/files/<i>` for any other, and for a path named twice. */
export function attachedFiles(folder: string, items: { path: string; label?: string }[]): AttachedFile[] {
  const files: AttachedFile[] = [];
  const errors: PointerError[] = [];
  const named = new Set<string>();
  items.forEach(({ path: rel, label }, i) => {
    const file = named.has(rel) ? undefined : attachedFile(folder, rel);
    named.add(rel);
    if (file) {
      files.push({ ...file, ...(label !== undefined && { label }) });
      take(path.dirname(path.join(folder, rel)), Number.parseInt(path.basename(rel), 10));
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
export function checked<M extends { files?: AttachedFile[] }>(folder: string, msg: M): { msg: M; said?: { person: string; agent: string } } {
  if (!msg.files) return { msg };
  const { files: _, ...rest } = msg;
  const { there, gone } = stillThere(folder, msg.files);
  return {
    msg: { ...rest, ...(there.length > 0 && { files: there }) } as M,
    ...(gone.length > 0 && { said: { person: serverChatWords.fileGoneForThePerson(gone.map((f) => f.label ?? f.name)), agent: serverChatWords.fileGoneForTheAgent(gone.map((f) => f.name)) } }),
  };
}

/** `text`, then the line `checked` gave; the line alone when the message has nothing else to say. */
export const withSaid = (text: string, line: string | undefined, alone = false): string => (alone && line ? line : [text, line].filter(Boolean).join('\n\n'));
