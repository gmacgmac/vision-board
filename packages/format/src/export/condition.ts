// An export file's conditioning (D-107, PLAN decision 6): after the upgrade, before the write. It keeps what an export
// carries (containers, cards and links as keyed write items; the person's answers, places and notes by those keys),
// drops everything else and names each drop where it was (`items[3].node.glow`), and fills a required title with its
// default. A container's or a card's field is judged by the ledger's own check (`shapeFieldProblems`), so this module
// knows only which fields an item needs and which of them has a default. What names the board a file came from (a card's
// number, `n`, `base`, `insert`, a container's `center` by number) means nothing on another board, so it goes too; a
// radial container names its centre by `{ key }` of a card in the file. Every key names one item: a later item with an
// earlier one's key is left out. The normal write checks run after. Pure.
import { LATER_REGION } from '../ledger.ts';
import { LIMITS, codePoints, fromProblems, shapeFieldProblems } from '../ledger-shape.ts';
import { NODE_TYPES } from '../node-types.ts';
import { isRecord } from '../records.ts';
import { normaliseTimeline } from '../timeline.ts';
import { KINDS } from '../view.ts';
import type { Kind } from '../view.ts';
import * as formatExportWords from '../words/format-export.ts';
import * as formatLedgerWords from '../words/format-ledger.ts';
import type { ExportFile } from './index.ts';

type Rec = Record<string, unknown>;

/** The conditioned file, and each part left out, in reading order. */
export interface Conditioned { file: ExportFile; dropped: Drop[] }

/** One part of a file an import leaves out (point 619): `at` its pointer (`items[3].node.glow`), `out` true when the whole
 * part went (a card, a link, a note), false for a field of it; `text` the agent's words, pointer first. A person reads
 * the parts worded by `forPerson` (person.ts). */
export interface Drop { at: string; out: boolean; text: string }
export const gone = (at: string, text: string): Drop => ({ at, out: true, text });
export const less = (at: string, text: string): Drop => ({ at, out: false, text });

/** What an export file holds, at the top and on each kind of item. */
const TOP = ['v', 'title', 'items', 'answers', 'pins', 'notes'];
const ITEM_FIELDS: Readonly<Record<string, readonly string[]>> = {
  region: ['type', 'key', 'region'], node: ['type', 'key', 'node'], link: ['type', 'key', 'from', 'to', 'label'],
};
/** An item's fields that name its own board: a card to update (`n`), the version read (`base`), where to insert. */
const OF_ITS_BOARD = new Set(['n', 'base', 'insert']);

const isText = (v: unknown): v is string => typeof v === 'string' && /\S/u.test(v);

/** Why `v` is not text of at most `max` code points, named `at`; undefined when it is. */
function textProblem(v: unknown, at: string, max: number): string | undefined {
  if (!isText(v)) return formatLedgerWords.required(at);
  return codePoints(v) > max ? formatLedgerWords.upToCharacters(at, max) : undefined;
}

/** `raw`'s fields that `fields` names (an undefined one counts as left out); each other field dropped and named. Undefined
 * when `raw` is not an object, named. */
function known(raw: unknown, at: string, fields: readonly string[], dropped: Drop[]): Rec | undefined {
  if (!isRecord(raw)) return void dropped.push(gone(at, formatExportWords.notAnEntry(at)));
  const out: Rec = {};
  for (const [k, v] of Object.entries(raw)) {
    if (v === undefined) continue;
    if (fields.includes(k)) out[k] = v;
    else dropped.push(less(at, OF_ITS_BOARD.has(k) ? formatExportWords.fromItsBoard(`${at}.${k}`) : formatExportWords.unknownField(`${at}.${k}`)));
  }
  return out;
}

/** The entries of list `raw`, each with where it was; not a list (and not left out), named. */
function listOf(raw: unknown, at: string, dropped: Drop[]): [string, unknown][] {
  if (raw === undefined) return [];
  if (!Array.isArray(raw)) return dropped.push(gone(at, formatExportWords.notAList(at))), [];
  return raw.map((x, i) => [`${at}[${i}]`, x]);
}

/** A container's or a card's body: each field the ledger knows and accepts kept, any other dropped and named, a
 * container's `center` kept as `{ key }` (by number it is of its board), a card's `timeline` normalised first (the write
 * edge's forms). A refused required field is reported back, not named, for the caller to default or to leave the item out. */
function body(shape: 'region' | 'node', raw: Rec, at: string, dropped: Drop[]): { out: Rec; refused: Map<string, string> } {
  const out: Rec = {};
  const refused = new Map<string, string>();
  const required = shape === 'region' ? ['id', 'title'] : ['region', 'kind', 'title'];
  for (const [k, v] of Object.entries(raw)) {
    if (v === undefined) continue;
    if (shape === 'region' && k === 'center') { center(v, `${at}.center`, out, dropped); continue; }
    const value = shape === 'node' && k === 'timeline' ? normaliseTimeline(v) ?? v : v;
    const problems = shapeFieldProblems(shape, k, value, `${at}.`);
    if (problems === undefined) dropped.push(less(at, formatExportWords.unknownField(`${at}.${k}`)));
    else if (!problems.length) out[k] = value;
    else if (required.includes(k)) refused.set(k, problems[0]!);
    else dropped.push(less(at, formatExportWords.refused(problems[0]!)));
  }
  return { out, refused };
}

/** A container's centre: `{ key }` of a card, kept for `linked` to check against the file's cards; a card number is of
 * its board; anything else is refused. */
function center(v: unknown, at: string, out: Rec, dropped: Drop[]): void {
  if (typeof v === 'number') return void dropped.push(less(at, formatExportWords.fromItsBoard(at)));
  if (isRecord(v) && Object.keys(v).length === 1 && !textProblem(v.key, '', LIMITS.key)) out.center = v;
  else dropped.push(less(at, formatExportWords.refused(formatExportWords.centerByKey(at))));
}

/** A required title: kept, else its default; one that was there and was refused is named. */
function titled(b: { out: Rec; refused: Map<string, string> }, at: string, fallback: string, dropped: Drop[]): void {
  if (b.out.title !== undefined) return;
  const why = b.refused.get('title');
  if (why) dropped.push(less(at, formatExportWords.replaced(why, fallback)));
  b.out.title = fallback;
}

/** A required field with no default: kept, else the item is left out, named with why. */
function needs(b: { out: Rec; refused: Map<string, string> }, field: string, at: string, dropped: Drop[], why?: string): boolean {
  if (b.out[field] !== undefined) return true;
  dropped.push(gone(at, formatExportWords.itemLeftOut(why ?? b.refused.get(field) ?? formatExportWords.missing(at, field))));
  return false;
}

function region(raw: unknown, at: string, dropped: Drop[]): Rec | undefined {
  if (!isRecord(raw)) return void dropped.push(gone(at, formatExportWords.itemLeftOut(formatExportWords.missing(at, 'region'))));
  const b = body('region', raw, `${at}.region`, dropped);
  if (!needs(b, 'id', `${at}.region`, dropped)) return undefined;
  titled(b, at, formatExportWords.untitledContainer, dropped);
  return b.out;
}

function node(raw: unknown, at: string, dropped: Drop[]): Rec | undefined {
  if (!isRecord(raw)) return void dropped.push(gone(at, formatExportWords.itemLeftOut(formatExportWords.missing(at, 'node'))));
  const b = body('node', raw, `${at}.node`, dropped);
  const kind = typeof raw.kind === 'string' && !KINDS.includes(raw.kind as Kind) ? formatExportWords.unknownKind(at, raw.kind) : undefined;
  if (!needs(b, 'kind', `${at}.node`, dropped, kind) || !needs(b, 'region', `${at}.node`, dropped)) return undefined;
  titled(b, at, formatExportWords.untitledCard, dropped);
  return b.out;
}

/** A link's ends by `{ key }` only: a number names a card on the board it came from. */
function link(out: Rec, at: string, dropped: Drop[]): Rec | undefined {
  for (const end of ['from', 'to'] as const) {
    const ref = out[end];
    const why = typeof ref === 'number' ? formatExportWords.byNumber(`${at}.${end}`)
      : !isRecord(ref) || Object.keys(ref).length !== 1 || textProblem(ref.key, '', LIMITS.key) ? formatExportWords.missing(at, end) : undefined;
    if (why) return void dropped.push(gone(at, formatExportWords.itemLeftOut(why)));
  }
  const label = out.label === undefined ? undefined : textProblem(out.label, `${at}.label`, LIMITS.linkLabel);
  if (label) { dropped.push(less(at, formatExportWords.refused(label))); delete out.label; }
  return out;
}

/** One item, on its own: an export's three kinds, each field known, its body conditioned. */
function item(raw: unknown, at: string, dropped: Drop[]): Rec | undefined {
  const type = isRecord(raw) ? raw.type : undefined;
  if (isRecord(raw) && (typeof type !== 'string' || !Object.hasOwn(ITEM_FIELDS, type))) {
    return void dropped.push(gone(at, formatExportWords.notInAnExport(at, String(type))));
  }
  const out = known(raw, at, ITEM_FIELDS[type as string] ?? [], dropped);
  if (!out) return undefined;
  const key = out.key === undefined ? undefined : textProblem(out.key, `${at}.key`, LIMITS.key);
  if (key) { dropped.push(less(at, formatExportWords.refused(key))); delete out.key; }
  if (type === 'link') return link(out, at, dropped);
  const made = type === 'region' ? region(out.region, at, dropped) : node(out.node, at, dropped);
  return made && { ...out, [type as string]: made };
}

/** The keys an export's other parts may name: the cards (with their kind) and the containers. */
interface Keys { cards: Map<string, Kind>; containers: Set<string> }

/** The items that name what the file holds: a card whose container is in the file (or the board's Later), a link
 * between two of its cards; each other one left out, named. */
function linked(all: [string, Rec][], dropped: Drop[]): { items: Rec[]; keys: Keys } {
  const seen = new Set<string>();
  const items = all.filter(([at, x]) => {
    const key = x.key === undefined ? undefined : String(x.key);
    if (key === undefined || !seen.has(key)) return key === undefined || seen.add(key);
    return void dropped.push(gone(at, formatExportWords.itemLeftOut(formatExportWords.keyTaken(at, key))));
  });
  const regions = new Set<string>([LATER_REGION]);
  const keys: Keys = { cards: new Map(), containers: new Set() };
  for (const [, x] of items) {
    if (x.type !== 'region') continue;
    regions.add(String((x.region as Rec).id));
    if (x.key !== undefined) keys.containers.add(String(x.key));
  }
  const nodes = items.filter(([at, x]) => {
    if (x.type !== 'node') return true;
    const { region: r, kind } = x.node as Rec;
    if (!regions.has(String(r))) return void dropped.push(gone(at, formatExportWords.itemLeftOut(formatExportWords.noContainer(at, String(r)))));
    if (x.key !== undefined) keys.cards.set(String(x.key), kind as Kind);
    return true;
  });
  const kept = nodes.filter(([at, x]) => {
    if (x.type !== 'link') return true;
    const end = (['from', 'to'] as const).map((e) => String((x[e] as Rec).key)).find((k) => !keys.cards.has(k));
    return end === undefined || void dropped.push(gone(at, formatExportWords.itemLeftOut(formatExportWords.noSuchKey(at, end))));
  });
  for (const [at, x] of kept) {
    const c = x.type === 'region' ? (x.region as Rec).center : undefined;
    if (!isRecord(c) || keys.cards.has(String(c.key))) continue;
    dropped.push(less(at, formatExportWords.refused(formatExportWords.noSuchKey(`${at}.region.center`, String(c.key)))));
    delete (x.region as Rec).center;
  }
  return { items: kept.map(([, x]) => x), keys };
}

/** The person's ✓ and ✗, each on a card of the file that asks for one. */
function answer(raw: unknown, at: string, keys: Keys, dropped: Drop[]): Rec | undefined {
  const out = known(raw, at, ['key', 'answer'], dropped);
  if (!out) return undefined;
  const kind = keys.cards.get(String(out.key));
  const why = kind === undefined ? formatExportWords.noSuchKey(at, String(out.key))
    : !NODE_TYPES[kind].answer ? formatExportWords.notAsked(at, String(out.key))
      : out.answer !== 'check' && out.answer !== 'cross' ? formatExportWords.answerOneOf(at) : undefined;
  return why ? void dropped.push(gone(at, formatExportWords.refused(why))) : out;
}

/** A card's place in its container. */
function pin(raw: unknown, at: string, keys: Keys, dropped: Drop[]): Rec | undefined {
  const out = known(raw, at, ['key', 'x', 'y'], dropped);
  if (!out) return undefined;
  const bad = ['x', 'y'].find((k) => typeof out[k] !== 'number' || !Number.isFinite(out[k]));
  const why = !keys.cards.has(String(out.key)) ? formatExportWords.noSuchKey(at, String(out.key)) : bad && formatLedgerWords.number(`${at}.${bad}`);
  return why ? void dropped.push(gone(at, formatExportWords.refused(why))) : out;
}

/** A reply's author (point 617): kept when the ledger takes it, else an agent with no name (a refused one named). */
function author(raw: unknown, at: string, dropped: Drop[]): Rec {
  const why = raw === undefined ? undefined : fromProblems(raw, at)[0];
  if (why) dropped.push(less(at, formatExportWords.refused(why)));
  return raw === undefined || why ? { by: 'agent' } : raw as Rec;
}

/** A note on a card or a container (`key`), or on a group of cards (`keys`), with the agents' replies (`thread`). */
function note(raw: unknown, at: string, keys: Keys, dropped: Drop[]): Rec | undefined {
  const out = known(raw, at, ['key', 'keys', 'text', 'thread'], dropped);
  if (!out) return undefined;
  const group = Array.isArray(out.keys) ? out.keys.map(String) : undefined;
  const missing = out.key !== undefined ? [String(out.key)].find((k) => !keys.cards.has(k) && !keys.containers.has(k))
    : group?.find((k) => !keys.cards.has(k));
  const why = (out.key === undefined) === (group === undefined) || (group && (group.length < 2 || new Set(group).size !== group.length))
    ? formatExportWords.keyOrKeys(at) : missing !== undefined ? formatExportWords.noSuchKey(at, missing)
      : textProblem(out.text, `${at}.text`, LIMITS.text);
  if (why) return void dropped.push(gone(at, formatExportWords.refused(why)));
  if (out.thread === undefined) return out;
  const thread = listOf(out.thread, `${at}.thread`, dropped).flatMap(([where, x]) => {
    const reply = known(x, where, ['text', 'from'], dropped);
    const bad = reply && textProblem(reply.text, `${where}.text`, LIMITS.text);
    if (bad) dropped.push(gone(where, formatExportWords.refused(bad)));
    return reply && !bad ? [{ ...reply, from: author(reply.from, `${where}.from`, dropped) }] : [];
  });
  return thread.length ? { ...out, thread } : (({ thread: _t, ...rest }) => rest)(out);
}

/** The file as this build's export format holds it, and each part left out (PLAN decision 6). `raw` is the upgraded
 * file (`upgradeExport`). Parts are judged one by one, then by what they name: an answer on a card left out goes too. */
export function conditionExport(raw: Readonly<Rec>): Conditioned {
  const dropped: Drop[] = [];
  for (const k of Object.keys(raw)) if (!TOP.includes(k)) dropped.push(less('', formatExportWords.unknownField(k)));
  const titleWhy = raw.title === undefined ? undefined : textProblem(raw.title, 'title', LIMITS.title);
  if (titleWhy) dropped.push(less('', formatExportWords.replaced(titleWhy, formatExportWords.untitledBoard)));
  const one = listOf(raw.items, 'items', dropped).flatMap(([at, x]): [string, Rec][] => {
    const made = item(x, at, dropped);
    return made ? [[at, made]] : [];
  });
  const { items, keys } = linked(one, dropped);
  const parts = (name: 'answers' | 'pins' | 'notes', check: typeof answer) =>
    listOf(raw[name], name, dropped).flatMap(([at, x]) => check(x, at, keys, dropped) ?? []);
  const answers = parts('answers', answer);
  const pins = parts('pins', pin);
  const notes = parts('notes', note);
  const file = {
    v: raw.v, title: raw.title === undefined || titleWhy ? formatExportWords.untitledBoard : raw.title, items,
    ...(answers.length > 0 && { answers }), ...(pins.length > 0 && { pins }), ...(notes.length > 0 && { notes }),
  };
  return { file: file as ExportFile, dropped };
}
