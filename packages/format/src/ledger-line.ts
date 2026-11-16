// A ledger line as the file holds it, and the event code reads (D-041 proposed, api.md 125). The file
// names a card by its ledger number in `n`, so the file reads one way for ever; code calls that
// identity `id`, and keeps `n` for the board number the API and the page speak. One format (D-103):
// what an older format named otherwise is renamed by the migration (migrate/), never here.
// Pure and lossless: `toLine(fromLine(line))` is that line.
import type { LedgerEvent } from './ledger.ts';
import { CARD_EVENTS } from './ledger.ts';

/** One stored line, parsed: what `eventProblems` and the stored-line schema check. */
export type LedgerLine = Record<string, unknown>;

/** `o` with key `from` renamed `to`, every key kept in its place. */
const renamed = (o: LedgerLine, from: string, to: string): LedgerLine =>
  Object.fromEntries(Object.entries(o).map(([k, v]) => [k === from ? to : k, v]));

/** The event a well-formed line (eventProblems found nothing) stands for. */
export function fromLine(line: LedgerLine): LedgerEvent {
  return (CARD_EVENTS.has(line.type as never) ? renamed(line, 'n', 'id') : { ...line }) as unknown as LedgerEvent;
}

/** The line the file holds for `e`: the card's identity written as `n`. */
export const toLine = (e: LedgerEvent): LedgerLine =>
  CARD_EVENTS.has(e.type) ? renamed(e as unknown as LedgerLine, 'id', 'n') : { ...(e as unknown as LedgerLine) };
