// Checks the export and import scenarios share (export-import-print T_03, D-107, D-108): an agent exports through
// `get_board`/`show_container` with `export: true` and imports through `write_board`'s `import` mode, passing the file as
// it is; its import carries the notes and replies (each keeping its author) and leaves the person's ✓, ✗ and places
// behind, and the chat says so in one plain line.
import { callsTo, check, resultsOf } from '../checks.ts';
import type { Call, Check, RunRecord } from '../types.ts';

/** `value` as JSON with every object's keys sorted: two files that differ only in key order read the same. */
export const canonical = (value: unknown): string => JSON.stringify(value, (_, v) =>
  (v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b))) : v));

/** The export files the bot read (`export: true`, answered), each with its call. */
export const exportsOf = (r: RunRecord, board: string) => [...callsTo(r, 'get_board'), ...callsTo(r, 'show_container')]
  .filter((c) => c.input.export === true && c.input.board === board && !c.isError)
  .map((c) => { try { return { call: c, file: JSON.parse(c.text) }; } catch { return undefined; } })
  .filter((x): x is { call: Call; file: any } => !!x?.file?.items);

/** The bot's `write_board` imports, in order. */
export const importsOf = (r: RunRecord, turn?: number) =>
  callsTo(r, 'write_board').filter((c) => c.input.import !== undefined && (turn === undefined || c.turn === turn));

/** An import was written whole: the call answered, and every item in it did. */
export const written = (c: Call) => !c.isError && resultsOf(c).length > 0 && resultsOf(c).every((x) => x.ok);

export const exported = (board: string): Check => check('exported', `\`get_board\` or \`show_container\` with \`export: true\` on \`${board}\` answered with a file`, (r) => {
  const got = exportsOf(r, board);
  return [got.length > 0, got.map((x) => `${x.call.name} (${x.file.items.length} items)`).join(', ') || 'no export read'];
});

/** Exactly one import, `into` as wanted, on the board `where` accepts, written whole. */
export const importedInto = (into: 'new' | 'current', where: (board: string, r: RunRecord) => boolean, says: string, turn?: number): Check =>
  check(`imported-${into}`, `one \`write_board\` import \`into: "${into}"\` ${says}, every item written`, (r) => {
    const calls = importsOf(r, turn);
    const c = calls[0];
    const ok = calls.length === 1 && c!.input.import?.into === into && where(String(c!.input.board), r) && written(c!);
    return [ok, calls.map((x) => `into ${x.input.import?.into} on ${x.input.board}: ${x.isError ? 'refused' : `${resultsOf(x).filter((y) => y.ok).length} of ${resultsOf(x).length} written`}`).join('; ') || 'no import'];
  });

/** The import's file carries the items as given (`want`), unchanged: no item edited, added or left out. */
export const fileAsGiven = (id: string, want: (r: RunRecord) => unknown[] | undefined, says: string): Check => check(id, says, (r) => {
  const items = want(r);
  const sent = importsOf(r)[0]?.input.import?.file?.items;
  if (!items) return [false, 'nothing to compare: no file'];
  if (!Array.isArray(sent)) return [false, 'no import with a file of items'];
  return [canonical(sent) === canonical(items), `${sent.length} items sent, ${items.length} given${canonical(sent) === canonical(items) ? ', the same' : ', not the same'}`];
});

/** No `write_board` call with `items` (in `turn`, or anywhere): the cards come through the import, not drawn by hand. */
export const noHandDrawn = (turn?: number): Check => check('no-hand-drawn', `no \`write_board\` with \`items\`${turn === undefined ? '' : ` in turn ${turn + 1}`}: the import draws the cards`, (r) => {
  const drew = callsTo(r, 'write_board').filter((c) => Array.isArray(c.input.items) && (turn === undefined || c.turn === turn));
  return [drew.length === 0, drew.length ? `${drew.length} call(s) with items` : 'none'];
});

/** No `propose` item anywhere: the person's marks are theirs to make again. */
export const noMarksSent = (): Check => check('no-marks-sent', 'no `propose` item: the ✓ and ✗ that stayed behind are the person\'s to press', (r) => {
  const sent = callsTo(r, 'write_board').flatMap((c) => (Array.isArray(c.input.items) ? c.input.items : [])).filter((i: any) => i?.type === 'propose');
  return [sent.length === 0, sent.length ? `${sent.length} propose item(s)` : 'none'];
});

/** The turn's chat names what stayed behind: each pattern matches it. */
export const dropsRelayed = (turn: number, named: readonly (readonly [string, RegExp])[]): Check => check(
  'drops-relayed', `turn ${turn + 1}'s chat says what stayed behind: ${named.map(([n]) => n).join(', ')}`, (r) => {
    const text = r.turns[turn]?.text ?? '';
    const missing = named.filter(([, says]) => !says.test(text)).map(([n]) => n);
    return [!!text && missing.length === 0, `${missing.length ? `missing ${missing.join(', ')}; ` : ''}chat: ${text || '(none)'}`];
  },
);

/** ✓ and ✗, however the chat names them. */
export const MARKS = ['the ✓ and ✗', /✓|✗|\b(answers?|marks?|ticks?|crosses|checks?)\b/i] as const;

/** The notes come across: the import's file carries the notes (`want`, with their replies) as given, and the chat never says they stayed behind. */
export const notesKept = (want: (r: RunRecord) => unknown[] | undefined, turn = 0): Check => check(
  'notes-kept', 'the import carries the notes as given, and the chat does not say they stayed behind', (r) => {
    const notes = want(r), sent = importsOf(r)[0]?.input.import?.file?.notes;
    const text = r.turns[turn]?.text ?? '';
    const said = /\bnotes?\b[^.]*\b(stayed|left|dropped|behind|lost)\b|\b(stayed|left|dropped)\b[^.]*\bnotes?\b/i.test(text);
    const same = !!notes?.length && canonical(sent) === canonical(notes);
    return [same && !said, `${same ? 'notes sent as given' : `notes ${notes?.length ? 'not as given' : 'none to give'}`}${said ? '; the chat says they stayed behind' : ''}`];
  },
);
