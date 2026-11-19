// `write_board`'s `import` (D-107, D-108; api.md 198, 201): an export file written as if its items were sent, into a
// new board or the current one. Before the normal write: the upgrade by `v` (`upgradeExport`), the conditioning
// (`conditionExport`), the board (`importTarget`), every container a new one (`freshIds`: an id the board holds or held
// takes the next free `-2`, `-3`), and keys made fresh. Then the items through the normal write path on one batch
// (write-board.ts `writeBatch`), each radial container's centre once its cards are drawn, and last the person's acts.
// Who writes decides what goes. The person's import (the page, its cookie) writes every line as the person, with no
// key, then the answers, places and notes as the person's own acts; the agent's replies on a note are the agent's words,
// so they are left out. An agent's import writes as the agent with keys of its own (`import-<seq>-<file key>`), so a
// file's keys never meet the agent's, and leaves out the person's acts. Each part left out is named in `dropped`.
import type { ExportFile, UpgradeStep } from '#format';
import { LATER_REGION, LIMITS, codePoints, conditionExport, containerKey, isRecord, isUpgradeStop, keptFor, upgradeExport } from '#format';
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

/** A file item as the write item it is sent as: its container's new id, its keys made fresh, a centre left for later
 * (`centres`: it names a card drawn after it). */
function itemFor(x: Rec, ids: Map<string, string>, key: (k: string) => string): Rec {
  const k = x.key === undefined ? {} : { key: key(String(x.key)) };
  if (x.type === 'region') {
    const { center: _center, ...r } = x.region as Rec;
    return { type: 'region', ...k, region: { ...r, id: ids.get(String(r.id)) } };
  }
  if (x.type === 'node') {
    const n = x.node as Rec;
    return { type: 'node', ...k, node: { ...n, region: ids.get(String(n.region)) ?? n.region } };
  }
  const end = (e: unknown) => ({ key: key(String((e as Rec).key)) });
  return { type: 'link', ...k, from: end(x.from), to: end(x.to), ...(x.label !== undefined && { label: x.label }) };
}

/** Each radial container's centre, now that its cards are drawn: the container written again with `center`, unless the
 * container itself failed; a centre that can't be set is named. */
function centres(b: IconBatch, file: ExportFile, results: WriteResult[], ids: Map<string, string>, key: (k: string) => string, grants: boolean, dropped: string[]): void {
  const at: string[] = [];
  const items = (file.items as Rec[]).flatMap((x, i) => {
    const r = x.type === 'region' ? (x.region as Rec) : undefined;
    if (!r || !isRecord(r.center) || !results[i]?.ok) return [];
    at.push(`items[${i}].region.center`);
    return [{ type: 'region', region: { ...r, id: ids.get(String(r.id)), center: { key: key(String(r.center.key)) } } }];
  });
  writeBatch(b, items, grants).forEach((r, i) => {
    if (!r.ok) dropped.push(writesWords.importNotApplied(at[i]!, r.problem.detail));
  });
}

/** The person's notes, places and answers, as the person's own acts after the cards (D-107 7), the answers last so a ✓
 * or ✗ closes the notes before it, as on the board the file came from: each on the card or container its key drew
 * here; one whose card was not written, or that the ledger refuses, is named. */
function personActs(ledger: Ledger, board: string, file: ExportFile, made: Map<string, number>, regions: Map<string, string>, dropped: string[]): void {
  const put = (at: string, e: Rec) => {
    try { ledger.append(e, { by: 'person' }, { board }); } catch (err) {
      if (!(err instanceof ProblemError)) throw err;
      dropped.push(writesWords.importNotApplied(at, err.body.errors?.[0]?.detail ?? err.body.detail));
    }
  };
  const card = (at: string, key: string, then: (id: number) => Rec) => {
    const id = made.get(key);
    if (id === undefined) dropped.push(writesWords.importNotWritten(at, key));
    else put(at, then(id));
  };
  const ver = (id: number) => ledger.state().index.nodes.get(id)?.ver;
  file.notes?.forEach((note, i) => {
    const at = `notes[${i}]`;
    const region = note.key === undefined ? undefined : regions.get(note.key);
    if (region !== undefined) return put(at, { type: 'act', action: 'comment', board, region, text: note.text });
    if (note.key !== undefined) return card(at, note.key, (n) => ({ type: 'act', action: 'comment', n, ver: ver(n), text: note.text }));
    const ids = (note.keys ?? []).map((k) => made.get(k));
    const lost = (note.keys ?? []).find((_, j) => ids[j] === undefined);
    if (lost !== undefined) return void dropped.push(writesWords.importNotWritten(at, lost));
    put(at, { type: 'act', action: 'comment', nodes: ids, text: note.text });
  });
  file.pins?.forEach((p, i) => card(`pins[${i}]`, p.key, (n) => ({ type: 'act', action: 'pin', n, x: p.x, y: p.y })));
  file.answers?.forEach((a, i) => card(`answers[${i}]`, a.key, (n) => ({ type: 'act', action: a.answer === 'check' ? 'ack' : 'drop', n, ver: ver(n) })));
}

/** At most `MAX_DROPPED` parts, the last saying how many more. */
const capped = (dropped: string[]): string[] =>
  (dropped.length <= MAX_DROPPED ? dropped : [...dropped.slice(0, MAX_DROPPED - 1), writesWords.importMoreLeftOut(dropped.length - MAX_DROPPED + 1)]);

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
  const results = writeBatch(b, items.map((x) => itemFor(x, ids, key)), grants);
  centres(b, file, results, ids, key, grants, dropped);
  const regions = new Map(items.flatMap((x) => (x.type === 'region' && x.key !== undefined ? [[String(x.key), ids.get(String((x.region as Rec).id))!]] : [])));
  if (person) personActs(ledger, board, file, b.made!, regions, dropped);
  return { results, dropped: capped(dropped) };
}
