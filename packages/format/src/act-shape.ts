// The hand-written twin of act.schema.json's `rules` for the person's acts of ledger v20 (api.md 183, 188, 189):
// `skin` names its board and the skin; `ask` its board, the lines it carried and the context the agent was given;
// `direction` its board, one container or none, and the direction. Each field is theirs alone. ledger-shape.ts
// `actRules` calls `v20ActRules`, as it calls app-shape.ts `appActRules`.
import * as formatLedgerWords from './words/format-ledger.ts';

type Rec = Record<string, unknown>;

/** Each act's own fields, and the fields it may name besides them and `board`. */
const OWN: ReadonlyMap<string, { needs: readonly string[]; also: readonly string[]; what: string; missing: string }> = new Map([
  ['skin', { needs: ['board', 'skin'], also: [], what: formatLedgerWords.theSkin, missing: formatLedgerWords.skinBoardAndSkinRequired }],
  ['ask', { needs: ['board', 'lines', 'context'], also: [], what: formatLedgerWords.theLinesItCarriedAndItsContext, missing: formatLedgerWords.askBoardLinesAndContextRequired }],
  ['direction', {
    needs: ['board', 'direction'], also: ['region'], what: formatLedgerWords.oneContainerOrNoneAndTheDirection,
    missing: formatLedgerWords.directionBoardAndDirectionRequired,
  }],
]);

/** Fields an act may carry beside its own: the stamp and `type`, `action`. */
const ALWAYS = new Set(['v', 'seq', 'at', 'by', 'agent', 'person', 'type', 'action']);

/** The rules of `skin`, `ask` and `direction`, and that no other act names their fields. Runs on every act line, so
 * it reads only the four fields for an act that is none of them. */
export function v20ActRules(e: Rec, p: string[]): void {
  const a = e.action as string;
  if (e.skin !== undefined && a !== 'skin') p.push(formatLedgerWords.onlyANames('skin', 'skin'));
  if (e.lines !== undefined && a !== 'ask') p.push(formatLedgerWords.onlyANames('lines', 'ask'));
  if (e.context !== undefined && a !== 'ask') p.push(formatLedgerWords.onlyANames('context', 'ask'));
  if (e.direction !== undefined && a !== 'direction') p.push(formatLedgerWords.onlyANames('direction', 'direction'));
  const own = OWN.get(a);
  if (!own) return;
  if (own.needs.some((f) => e[f] === undefined)) p.push(own.missing);
  for (const f of Object.keys(e)) {
    if (!ALWAYS.has(f) && !own.needs.includes(f) && !own.also.includes(f)) p.push(formatLedgerWords.namesItsBoardAnd(f, a, own.what));
  }
  if (a === 'ask' && Array.isArray(e.lines)) {
    if (!e.lines.length) p.push(formatLedgerWords.linesAtLeast1('lines'));
    if (new Set(e.lines).size !== e.lines.length) p.push(formatLedgerWords.linesEachOnce('lines'));
  }
}
