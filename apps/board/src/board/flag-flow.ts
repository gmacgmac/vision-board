// The person's flag on the page (cardFlag flag; field report batch 2 ruling 3, assumption A, api.md
// 128): the flag button beside Later and Shift+F on a focused card set or clear it, and the toolbar's
// "N flagged" chip steps through the flagged cards, one card after another in number order, from the
// focused one (or, since pressing the chip takes focus off the card, from the one it went to last),
// wrapping. A flag is the person's private mark: one act, `flag` or `unflag`, naming
// the card by its board number and no version, so it stays through a redraw; nothing here reaches an
// agent (the server keeps it out of every agent read, and the Send message reads no flag). Which
// cards are flagged is `BoardState.flags`, as the page reads the board. Nothing acts while a past
// version shows (versions.ts `guard`, sender.ts).
import type { View } from '../../../../packages/format/src/index.ts';
import type { BoardState } from '../../../../packages/actions/src/index.ts';
import type { ActFields } from './io.ts';

/** The act that turns card `id`'s flag over: `flag` when it has none, `unflag` when it has one. */
export const flagAct = (id: string, flagged: boolean): ActFields => ({ action: flagged ? 'unflag' : 'flag', n: Number(id) });

/** The flagged cards on the board, in number order (reading order for cards with a number). */
export const flaggedIds = (view: View, flags: ReadonlySet<string>): string[] =>
  view.nodes.filter((n) => n.n !== undefined && flags.has(n.id)).sort((a, b) => a.n! - b.n!).map((n) => n.id);

/** The flagged card after `from` (a card id, or none), wrapping; undefined with none flagged. When
 * `from` is not flagged, the first flagged card numbered after it. */
export function nextFlagged(ids: readonly string[], from: string | null): string | undefined {
  if (!ids.length) return undefined;
  const at = from === null ? -1 : ids.indexOf(from);
  if (at >= 0) return ids[(at + 1) % ids.length];
  return ids.find((id) => from !== null && Number(id) > Number(from)) ?? ids[0];
}

/** The chip's words: "3 flagged", and what a press does. */
export const flaggedWords = (k: number) => ({ count: String(k), word: 'flagged', title: `${k} flagged · go to the next one` });

export interface FlagDeps {
  /** The cardFlag flag: off, no button, no key, no chip. */
  on: boolean;
  view(): View | null;
  state(): BoardState | null;
  record(fields: ActFields): Promise<boolean>;
  /** The card that has focus, if any (focus.ts). */
  focused(): string | null;
  /** Whether card `id` is drawn now ("Hide decided" can hide a flagged card). */
  drawn(id: string): boolean;
  /** Focus card `id`; focus.ts pans it into view. */
  focusCard(id: string): void;
  toast(text: string): void;
}

export interface FlagFlow {
  /** The button or Shift+F on card `id`: flag it, or take its flag off. */
  toggle(id: string): Promise<void>;
  /** The flagged cards on the board as drawn, in number order (the chip counts them). */
  ids(): string[];
  /** The chip: focus the next flagged card that is drawn. */
  next(): void;
}

export function createFlagFlow(d: FlagDeps): FlagFlow {
  /** The card the chip went to last: a press on the chip moves focus off it. */
  let last: string | null = null;
  const ids = (): string[] => {
    const [view, state] = [d.view(), d.state()];
    return d.on && view && state ? flaggedIds(view, state.flags) : [];
  };
  return {
    async toggle(id) {
      const state = d.state();
      if (!d.on || !state || !d.view()?.nodes.some((n) => n.id === id && n.n !== undefined)) return;
      const flagged = state.flags.has(id);
      if (await d.record(flagAct(id, flagged))) d.toast(`${id} ${flagged ? 'flag removed' : 'flagged'}`);
    },
    ids,
    next() {
      const shown = ids().filter((id) => d.drawn(id));
      const to = nextFlagged(shown, d.focused() ?? last);
      last = to ?? null;
      if (to) d.focusCard(to);
      else if (ids().length) d.toast('The flagged cards are hidden: turn off Hide decided to see them.');
    },
  };
}
