// `write_board`'s `import` (D-107, D-108; api.md 198, 201): an export file written as if its items were sent, into a
// new board or the current one. Before the normal write: the upgrade by `v` (`upgradeExport`), the conditioning
// (`conditionExport`), the board (`importTarget`), every container a new one (`freshIds`: an id the board holds or held
// takes the next free `-2`, `-3`), and keys made fresh. Then the items through the normal write path on one batch
// (write-board.ts `writeBatch`), each radial container's centre once its cards are drawn, and last the person's acts.
// Whoever imports, the whole conversation comes in (point 617): each note and reply as a history line keeping its author
// in `from`. The person's import (the page, its cookie) writes every line as the person, with no key, then the places
// and answers as the person's own acts. An agent's import writes as the agent with keys of its own
// (`import-<seq>-<file key>`), so a file's keys never meet the agent's, and leaves out the person's places and answers.
// Each part left out is named in `dropped`.
import type { Drop, ExportFile, UpgradeStep } from '#format';
import {
  LATER_REGION, LIMITS, codePoints, conditionExport, containerKey, forPerson, gone, isRecord, isUpgradeStop, keptFor, laterHome, less,
  upgradeExport,
} from '#format';
import type { LedgerState } from '#actions';
import type { Caller, Ledger } from './ledger.ts';
import { ProblemError, problem } from './problem.ts';
import { importTarget } from './visibility.ts';
import type { IconBatch, WriteResult } from './write-board.ts';
import { writeBatch } from './write-board.ts';
import * as writesWords from './words/writes.ts';

type Rec = Record<string, unknown>;

/** What `import` names: the path's board, `into`, the file as sent, and who writes it. `grants`: an agent is held to
 * the permissions table (false for the folder's one agent, as for `items`); `icons`: the project's icon library. */
export interface ImportArgs {
  board: string; into: 'new' | 'current'; file: unknown; writer: Caller; grants?: boolean; keyHelp?: boolean; icons?: string | undefined;
}

/** One result per item of the file as conditioned, and each part of the file left out, in reading order. */
export interface Imported { results: WriteResult[]; dropped: string[] }

/** At most this many parts are named; the last then says how many more. */
const MAX_DROPPED = 2000;

/** The file's container ids, each as a new container on `board`: the id itself while the board has none by it (now or
 * retired, and never its Later), else the next free `<id>-2`, `<id>-3`, cut to an id's length. */
function freshIds(s: LedgerState, board: string, items: readonly Rec[]): Map<string, string> {
  const taken = (id: string) => id === LATER_REGION || s.index.boards.get(board)?.has(id) === true || s.index.retiredRegions.has(containerKey(board, id));
  const out = new Map<string, string>();
  const given = new Set<string>();
  for (const x of items) {
    const id = x.type === 'region' ? String((x.region as Rec).id) : undefined;
    if (id === undefined || out.has(id)) continue;
    let next = id;
    for (let k = 2; taken(next) || given.has(next); k++) next = `${id.slice(0, 63 - String(k).length)}-${k}`;
    out.set(id, next);
    given.add(next);
  }
  return out;
}

/** The key each file key is written under: the person's own (the person's lines hold none, so it lives only in the
 * batch); an agent's `import-<seq>-<key>`, a prefix none of its keys starts with, or with a number in place of a key
 * too long for it. The same file key always gives the same key. */
function freshKeys(s: LedgerState, writer: Caller): (key: string) => string {
  if (writer.by === 'person') return (key) => key;
  const used = [...(s.keys.get(writer.agent)?.keys() ?? [])];
  let prefix = `import-${s.seq + 1}-`;
  for (let k = 2; used.some((x) => x.startsWith(prefix)); k++) prefix = `import-${s.seq + 1}-${k}-`;
  const given = new Map<string, string>();
  const out = new Set<string>();
  return (key) => {
    let made = given.get(key) ?? `${prefix}${key}`;
    for (let k = 1; !given.has(key) && (codePoints(made) > LIMITS.key || out.has(made)); k++) made = `${prefix}~${k}`;
    given.set(key, made);
    out.add(made);
    return made;
  };
}

/** A file item as the write item it is sent as: its container's new id (a card in Later drawn in `home`, the person's
 * move then puts it back: `personActs`), its keys made fresh, a centre left for later (`centres`: it names a card drawn
 * after it). */
function itemFor(x: Rec, ids: Map<string, string>, key: (k: string) => string, home: string | undefined): Rec {
  const k = x.key === undefined ? {} : { key: key(String(x.key)) };
  if (x.type === 'region') {
    const { center: _center, ...r } = x.region as Rec;
    return { type: 'region', ...k, region: { ...r, id: ids.get(String(r.id)) } };
  }
  if (x.type === 'node') {
    const n = x.node as Rec;
    const region = n.region === LATER_REGION && home !== undefined ? home : String(n.region);
    return { type: 'node', ...k, node: { ...n, region: ids.get(region) ?? region } };
  }
  const end = (e: unknown) => ({ key: key(String((e as Rec).key)) });
  return { type: 'link', ...k, from: end(x.from), to: end(x.to), ...(x.label !== undefined && { label: x.label }) };
}

/** Each radial container's centre, now that its cards are drawn: the container written again with `center`, unless the
 * container itself failed; a centre that can't be set is named. */
function centres(b: IconBatch, file: ExportFile, results: WriteResult[], ids: Map<string, string>, key: (k: string) => string, grants: boolean, dropped: Drop[]): void {
  const at: string[] = [];
  const items = (file.items as Rec[]).flatMap((x, i) => {
    const r = x.type === 'region' ? (x.region as Rec) : undefined;
    if (!r || !isRecord(r.center) || !results[i]?.ok) return [];
    at.push(`items[${i}].region.center`);
    return [{ type: 'region', region: { ...r, id: ids.get(String(r.id)), center: { key: key(String(r.center.key)) } } }];
  });
  writeBatch(b, items, grants).forEach((r, i) => {
    if (!r.ok) dropped.push(less(at[i]!, writesWords.importNotApplied(at[i]!, r.problem.detail)));
  });
}

/** What the lines after the cards need: where they go, who writes them, each file key's card here, what is left out. */
interface After { ledger: Ledger; board: string; writer: Caller; card: (key: string) => number | undefined; dropped: Drop[] }

/** Append `e` as the writer: its `seq`, or undefined when the ledger refuses it, named `at`. */
function put(c: After, at: string, e: Rec): number | undefined {
  try { return c.ledger.append(e, c.writer, { board: c.board }).seq; } catch (err) {
    if (!(err instanceof ProblemError)) throw err;
    c.dropped.push(gone(at, writesWords.importNotApplied(at, err.body.errors?.[0]?.detail ?? err.body.detail)));
    return undefined;
  }
}

/** The card a note's replies go on: its own card, a group's first, or for a container's note the container's first card
 * in the file, else the file's first; undefined when no such card was written. */
function replyCard(c: After, file: ExportFile, note: NonNullable<ExportFile['notes']>[number], container: boolean): number | undefined {
  const nodes = (file.items as Rec[]).filter((x) => x.type === 'node' && x.key !== undefined);
  if (!container) return c.card(note.key ?? note.keys![0]!);
  const id = (file.items as Rec[]).find((x) => x.type === 'region' && x.key === note.key)?.region as Rec | undefined;
  const mine = nodes.filter((x) => (x.node as Rec).region === id?.id);
  return [...mine, ...nodes].map((x) => c.card(String(x.key))).find((n) => n !== undefined);
}

/** The whole conversation, whoever imports (point 617): each note, then the replies to it, as history lines that keep
 * their author in `from`, each on the card or container its key drew here. A note whose card was not written, or that
 * the ledger refuses, is named, its replies with it. */
function conversation(c: After, file: ExportFile, regions: Map<string, string>): void {
  const ver = (id: number) => c.ledger.state().index.nodes.get(id)?.ver;
  const from = { by: 'person' };
  file.notes?.forEach((note, i) => {
    const at = `notes[${i}]`;
    const region = note.key === undefined ? undefined : regions.get(note.key);
    const keys = note.keys ?? (region === undefined ? [note.key!] : []);
    const ids = keys.map((k) => c.card(k));
    const lost = keys.find((_, j) => ids[j] === undefined);
    if (lost !== undefined) return void c.dropped.push(gone(at, writesWords.importNotWritten(at, lost)));
    const seq = put(c, at, region !== undefined ? { type: 'act', action: 'comment', board: c.board, region, text: note.text, from }
      : note.keys ? { type: 'act', action: 'comment', nodes: ids, text: note.text, from }
        : { type: 'act', action: 'comment', n: ids[0], ver: ver(ids[0]!), text: note.text, from });
    if (seq === undefined || !note.thread) return;
    const n = replyCard(c, file, note, region !== undefined);
    note.thread.forEach((r, j) => {
      const where = `${at}.thread[${j}]`;
      if (n === undefined) c.dropped.push(gone(where, writesWords.importNotWritten(where, note.key!)));
      else put(c, where, { type: 'reply', n, to: seq, text: r.text, from: r.from });
    });
  });
}

/** The person's places and answers, as the person's own acts after the conversation (D-107 7): each card in Later moved
 * there, then the pins, then the answers last so a ✓ or ✗ closes the notes before it, as on the board the file came
 * from; one whose card was not written is named. */
function personActs(c: After, file: ExportFile): void {
  const card = (at: string, key: string, then: (id: number) => Rec) => {
    const id = c.card(key);
    if (id === undefined) c.dropped.push(gone(at, writesWords.importNotWritten(at, key)));
    else put(c, at, then(id));
  };
  const ver = (id: number) => c.ledger.state().index.nodes.get(id)?.ver;
  (file.items as Rec[]).forEach((x, i) => {
    if (x.type === 'node' && (x.node as Rec).region === LATER_REGION && x.key !== undefined && c.card(String(x.key)) !== undefined)
      put(c, `items[${i}].node.region`, { type: 'act', action: 'move', n: c.card(String(x.key)), region: LATER_REGION });
  });
  file.pins?.forEach((p, i) => card(`pins[${i}]`, p.key, (n) => ({ type: 'act', action: 'pin', n, x: p.x, y: p.y })));
  file.answers?.forEach((a, i) => card(`answers[${i}]`, a.key, (n) => ({ type: 'act', action: a.answer === 'check' ? 'ack' : 'drop', n, ver: ver(n) })));
}

/** The parts left out as the writer reads them, at most `MAX_DROPPED`, the last saying how many more: the person's
 * worded for a person (point 619), the agent's pointer first. */
const named = (raw: Rec, dropped: Drop[], person: boolean): string[] => {
  if (person) return forPerson(raw, dropped, MAX_DROPPED);
  const words = dropped.map((d) => d.text);
  return words.length <= MAX_DROPPED ? words : [...words.slice(0, MAX_DROPPED - 1), writesWords.importMoreLeftOut(words.length - MAX_DROPPED + 1)];
};

/** Write the export file `args.file` on `args.board` (api.md 198, 201): refused whole, before anything is written, when
 * the file can't be brought to this build's version or the board doesn't fit `into`; else one result per item of the
 * conditioned file, and each part left out. `steps` is for tests (`upgradeExport`). */
export function importFile(ledger: Ledger, args: ImportArgs, steps?: readonly UpgradeStep[]): Imported {
  const { board, into, writer } = args;
  const up = upgradeExport(args.file, steps);
  if (isUpgradeStop(up)) throw problem('invalid', up.stop, { errors: [{ pointer: '/import/file', detail: up.stop }] });
  const conditioned = conditionExport(up);
  const { file, dropped } = keptFor(conditioned.file, writer.by);
  dropped.unshift(...conditioned.dropped);
  const person = writer.by === 'person';
  importTarget(ledger.state(), board, into, person);
  if (into === 'new') ledger.append({ type: 'board', board, title: file.title }, writer);
  const s = ledger.state();
  const items = file.items as Rec[];
  const ids = freshIds(s, board, items);
  const key = freshKeys(s, writer);
  const grants = !person && args.grants !== false;
  const b: IconBatch = {
    ledger, agent: writer.by === 'agent' ? writer.agent : '', board, failed: new Set(), keyHelp: args.keyHelp, insert: false,
    icons: args.icons, person, made: new Map(),
  };
  const results = writeBatch(b, items.map((x) => itemFor(x, ids, key, laterHome(file))), grants);
  // The page shows the person `dropped` alone: an item the normal checks refused is named there too (an agent reads
  // `results`).
  if (person) results.forEach((r, i) => { if (!r.ok) dropped.push(gone(`items[${i}]`, writesWords.importNotApplied(`items[${i}]`, r.problem.errors?.[0]?.detail ?? r.problem.detail))); });
  centres(b, file, results, ids, key, grants, dropped);
  const regions = new Map(items.flatMap((x) => (x.type === 'region' && x.key !== undefined ? [[String(x.key), ids.get(String((x.region as Rec).id))!]] : [])));
  const after: After = { ledger, board, writer, card: (k) => b.made!.get(key(k)), dropped };
  conversation(after, file, regions);
  if (person) personActs(after, file);
  return { results, dropped: named(up, dropped, person) };
}
