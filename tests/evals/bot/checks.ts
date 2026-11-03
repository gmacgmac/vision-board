// The checks: plain functions over what one run recorded, the same way every time. Board tool calls are read from the
// host's log (what the engine was asked, by the bot, before any clamp), other tool uses from the CLI's stream, the
// chat from every text block of the turn, the board from the ledger. No model grades a model.
import type { Call, Check, RunRecord, Verdict } from './types.ts';

const MAX_EVIDENCE = 300;
export const brief = (v: unknown) => { const s = typeof v === 'string' ? v : JSON.stringify(v); return s.length > MAX_EVIDENCE ? `${s.slice(0, MAX_EVIDENCE)}…` : s; };
const ok = (evidence: string): Verdict => ({ pass: true, evidence });
const no = (evidence: string): Verdict => ({ pass: false, evidence });
const turnsOf = (r: RunRecord, turn?: number) => (turn === undefined ? r.turns : r.turns.slice(turn, turn + 1));

export const callsTo = (r: RunRecord, name: string) => r.calls.filter((c) => c.name === name);
/** Every item the bot sent in `write_board`, with its call. */
export const itemsOf = (r: RunRecord, turn?: number) =>
  callsTo(r, 'write_board').filter((c) => turn === undefined || c.turn === turn)
    .flatMap((c) => (Array.isArray(c.input.items) ? c.input.items : []).map((item: any, index: number) => ({ item, index, call: c })));
/** Each item's answer in a `write_board` call. */
export const resultsOf = (c: Call): any[] => { try { return JSON.parse(c.text).results ?? []; } catch { return []; } };
/** A note's answers that the engine took: replies `to` it and appends on its card. */
export const answersTo = (r: RunRecord, n: number, seq: number) =>
  itemsOf(r).filter(({ item, index, call }) => resultsOf(call)[index]?.ok
    && ((item.type === 'reply' && item.to === seq) || (item.type === 'append' && item.n === n)));

const CHAT_LIST = /^\s*([-*•]|\d+[.)]|#{1,6}\s)/m;

/** The chat says "Done." and at most one short line more; never a list, heading or summary. */
export const doneOnly = (turn?: number): Check => ({
  id: turn === undefined ? 'done-only' : `done-only-t${turn + 1}`,
  says: 'the chat is "Done." and at most one short line more, no list or heading',
  run(r) {
    if (!turnsOf(r, turn).length) return no('the turn did not run');
    const bad = turnsOf(r, turn).find((t) => {
      const lines = t.text.split('\n').filter((l) => l.trim());
      return !t.text.trim().startsWith('Done.') || lines.length > 2 || t.text.trim().length > 200 || CHAT_LIST.test(t.text);
    });
    return bad ? no(`chat: ${brief(bad.text || '(none)')}`) : ok(`chat: ${brief(turnsOf(r, turn).map((t) => t.text).join(' | '))}`);
  },
});

/** A short chat line: at most two lines, 300 characters, no list or heading. */
export const shortChat = (): Check => ({
  id: 'short-chat', says: 'the chat is at most two short lines, no list or heading',
  run(r) {
    const bad = r.turns.find((t) => t.text.split('\n').filter((l) => l.trim()).length > 2 || t.text.trim().length > 300 || CHAT_LIST.test(t.text));
    return bad ? no(`chat: ${brief(bad.text)}`) : ok(`chat: ${brief(r.turns.map((t) => t.text).join(' | '))}`);
  },
});

export const everyItemKeyed = (): Check => ({
  id: 'every-item-keyed', says: 'every write_board item has a key',
  run(r) {
    const items = itemsOf(r);
    const bare = items.filter(({ item }) => typeof item.key !== 'string' || !item.key);
    if (!items.length) return no('no write_board items');
    return bare.length ? no(`${bare.length} of ${items.length} unkeyed: ${brief(bare[0]!.item)}`) : ok(`${items.length} items, all keyed`);
  },
});

const COORDINATES = ['x', 'y', 'pos', 'position', 'left', 'top', 'size', 'w', 'h', 'width', 'height'];
export const noCoordinates = (): Check => ({
  id: 'no-coordinates', says: 'no item sets a place or a size (the engine places cards)',
  run(r) {
    const placed = itemsOf(r).find(({ item }) => [item, item.node, item.region].some((o) => o && COORDINATES.some((k) => k in o)));
    return placed ? no(brief(placed.item)) : ok(`${itemsOf(r).length} items, none placed or sized`);
  },
});

export const noKeyConflict = (): Check => ({
  id: 'no-key-conflict', says: 'no write_board item answered conflict',
  run(r) {
    const hit = callsTo(r, 'write_board').flatMap((c) => resultsOf(c).filter((x) => /conflict/.test(x.problem?.type ?? '')).map((x) => `t${c.turn + 1} key ${x.key}`));
    return hit.length ? no(hit.join(', ')) : ok(`${callsTo(r, 'write_board').length} write_board calls, no conflict`);
  },
});

/** No board tool call named `name`, and no attempt at one (a tool it was never given shows only in the stream). */
export const noTool = (name: string): Check => ({
  id: `no-${name.replace(/_/g, '-')}`, says: `no ${name} call or attempt`,
  run(r) {
    const tried = r.turns.flatMap((t) => t.uses).filter((u) => u.name === name || u.name.endsWith(`__${name}`));
    const called = callsTo(r, name);
    return tried.length || called.length ? no(brief(tried[0] ?? called[0])) : ok(`no ${name}`);
  },
});

export const noWait = (): Check => ({
  id: 'no-wait', says: 'no check_responses with wait > 0 (as asked, before the clamp)',
  run(r) {
    const waits = callsTo(r, 'check_responses').filter((c) => typeof c.input.wait === 'number' && c.input.wait > 0);
    return waits.length ? no(`${waits.length} wait(s): ${waits.map((c) => `wait ${c.input.wait}${c.clamped ? ` clamped to ${c.clamped.to}` : ''}, ${c.ms} ms`).join('; ')}`)
      : ok(`${callsTo(r, 'check_responses').length} check_responses, none waits`);
  },
});

/** Every turn ended with the CLI's own `success`, within its caps and before our kill. Added to every scenario. */
export const bounded = (): Check => ({
  id: 'bounded', says: 'every turn ended on its own (no kill, no cap reached)',
  run(r) {
    const ends = r.turns.map((t) => t.end);
    if (r.exit.killed) return no(`killed at ${r.exit.seconds} s`);
    if (r.problem) return no(`harness: ${r.problem}`);
    if (!ends.length) return no('no turn ran');
    const bad = ends.find((e) => !e || e.subtype !== 'success');
    return bad !== undefined ? no(`turn end: ${brief(bad ?? 'none')}`) : ok(`${ends.length} turn(s), ${ends.map((e) => e!.numTurns).join('+')} CLI turns, ${r.exit.seconds} s`);
  },
});

/** A check from a predicate with its evidence. */
export const check = (id: string, says: string, run: (r: RunRecord) => [boolean, string]): Check =>
  ({ id, says, run: (r) => { const [pass, evidence] = run(r); return { pass, evidence: brief(evidence) }; } });

/** A new card was drawn (a write_board item answered with a new card's number at version 1). */
export const cardAdded = (): Check => check('card-added', 'a new card was drawn', (r) => {
  const added = callsTo(r, 'write_board').flatMap(resultsOf).filter((x) => x.ok && typeof x.n === 'number' && x.ver === 1);
  return [added.length > 0, added.map((x) => `card ${x.n} "${x.title}"`).join(', ') || 'none'];
});

const LOOKS = ['Read', 'Glob', 'Grep', 'LS', 'Bash'];
/** No look around the folder (standalone, where the bot has read tools): what it needs comes from the board's tools. */
export const noFolderRead = (): Check => ({
  id: 'no-folder-read', says: 'no Read, Glob, Grep, LS or Bash use: where things go comes from the board\'s tools',
  run(r) {
    const used = r.turns.flatMap((t) => t.uses).filter((u) => LOOKS.includes(u.name));
    return used.length ? no(used.map((u) => `${u.name} ${brief(u.input)}`).join('; ')) : ok('no look around the folder');
  },
});
