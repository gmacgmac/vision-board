// Go to a card by typing its number (cortex-tasks/board/2026-10-15_board-app_go-to-card-number.md,
// goToCard flag). A digit typed on the board, outside a text field, opens the "Go to card" box
// (board/chrome/GoToCard.svelte) holding it (the `go-to-card` command, commands.ts, keys.ts); Enter goes,
// Backspace edits, Esc closes. Nothing goes by itself; with the goAfterPause flag (off) a pause of
// GO_PAUSE after the last digit goes (ruling 2). Going selects and focuses the card; the board
// pans only by `revealPan`'s rule (the controller's `arrive`, ruling 3). A number the board never
// gave says "No card 99"; a retired card says it was removed and offers the version where it last
// appeared, as the container's retired marker does (`lastShown`, ruling 4). What a number names is
// packages/actions' `goTarget`; `createGoTo` keeps the box's state and its timer. The toolbar's open
// list goes to a card through the same path (`to`, open-list FE_01), and so do the "N new" list and
// the chat's change chips: `to` is the one finding path, and finding never marks a card seen (the
// controller's `arrive` selects it by `find`, ruling 322, findKeepsMarks flag).
// With the cardSearch flag (SEARCH_02, tracker M7, ruling 317) the box takes words too: `/` opens it
// empty; words ring the matching cards (`data-found`) and dim the rest (the world's `data-search`),
// best first (`#search`); the box says "1 of 3" and which part of the current match matched; ↓/↑
// step through the matches, wrapping, each brought into view; Enter goes to the current one by `to`'s
// path (`arrive`, so it keeps its marks); Esc or an empty box clears. Digits alone still go by number.
import type { GoTarget } from '#actions';
import type { SearchDoc, SearchHit, SearchIndex } from '#search';
import { search, searchIndex } from '#search';
import * as goToCardWords from '../words/go-to-card.ts';

/** The most digits the box holds. */
export const GO_DIGITS = 6;
/** The pause after the last digit that goes by itself, with the goAfterPause flag (ruling 2). */
export const GO_PAUSE = 1000;

/** The box as the page shows it: the digits, what the last go found when it did not arrive, and a
 *  retired card's version to open (`label` is the button's accessible name). */
export interface GoBox {
  text: string;
  said?: string;
  past?: { version: number; until?: number; label: string };
  /** Words typed that match (cardSearch flag): the status's one sentence, "1 of 3 · card 12, in a note",
   *  and its first words, "1 of 3" (`count`), which the box draws bold. */
  found?: { count: string; text: string };
}

/** What a search needs of the board (cardSearch flag); absent, the box takes digits only. */
export interface GoSearch {
  /** Changes whenever the board's state does: the index is built again only then. */
  key(): unknown;
  /** The cards drawn now, as search documents (`#actions` boardSearchDocs on the view shown). */
  docs(): readonly SearchDoc[];
  /** Pan card `id` into view by `revealPan`'s rule; it selects and focuses nothing. */
  reveal(id: string): void;
  /** The board's world: `data-search` while matches show, so the rest dim. */
  world: Pick<Element, 'toggleAttribute'>;
  /** Card `id`'s element, which takes `data-found` ("match", or "current"). */
  card(id: string): Pick<Element, 'setAttribute' | 'removeAttribute'> | undefined;
}

/** The digits of what was typed, at most GO_DIGITS. */
export const goDigits = (text: string): string => text.replace(/\D/g, '').slice(0, GO_DIGITS);

/** What the box says for a go that did not arrive. */
const SAYS: Record<Exclude<GoTarget['to'], 'card'>, (n: number) => string> = {
  none: (n) => goToCardWords.noCard(n),
  hidden: (n) => goToCardWords.cardIsHiddenWithThe(n),
  retired: (n) => goToCardWords.cardWasRemoved(n),
};

export interface GoDeps {
  /** Card `n` on the board as drawn now (`goTarget`). */
  find(n: number): GoTarget;
  /** Select and focus card `id`, panning only when it is off screen (ruling 3). Every go is a find:
   *  the selection says so, and a find marks no card seen (findKeepsMarks, ruling 322). */
  arrive(id: string): void;
  /** Open board version `version`, read-only, with the answers as at line `until` (versions.ts). */
  past(version: number, until?: number): Promise<void>;
  /** The box changed; null closes it. */
  show(box: GoBox | null): void;
  /** The goAfterPause flag: the pause that goes by itself, in ms; absent, nothing goes by itself. */
  pause?: number;
  timer?: { set(f: () => void, ms: number): unknown; clear(handle: unknown): void };
  /** The cardSearch flag: the box searches words (`GoSearch`). */
  search?: GoSearch;
}

export interface GoTo {
  readonly box: GoBox | null;
  /** The box searches words (the cardSearch flag gave it `search`): the page draws it so. */
  readonly words: boolean;
  /** A digit typed on the board: open the box holding it; `/` with search, open it empty; false for any other key. */
  open(key: string): boolean;
  /** The field's text changed (typing, Backspace): its digits, or with search its words. */
  edit(text: string): void;
  /** Enter: go to the number or the current match, or say why not and stay open. */
  enter(): void;
  /** ↓ (1) or ↑ (-1): the next or previous match, wrapping, brought into view. */
  step(dir: 1 | -1): void;
  /** The board was drawn again: search the words again, staying on the current match if it still matches. */
  refresh(): void;
  /** Go to card `n` chosen elsewhere (the toolbar's open list, open-list FE_01) as Enter would for
   *  the box holding it: an open box closes; not there, the box opens saying why. */
  to(n: number): void;
  /** Esc, or focus leaving the box: close it without going. */
  close(): void;
  /** The retired card's offer: open its version, and go to it there. */
  openPast(): Promise<void>;
}

/** Text with something but digits and spaces in it: words to search (cardSearch flag). */
const isWords = (text: string): boolean => /[^\d\s]/.test(text);

/** The matches of a search showing: the index (built once per `key`), the hits best first, the
 *  current one, and the marks on the cards and the world. */
function createMatches(s: GoSearch) {
  let built: { key: unknown; index: SearchIndex } | null = null;
  let hits: SearchHit[] = [];
  let at = 0;
  const marked = new Map<string, string>();

  /** Mark the hits on the board, touching only the cards whose mark changed. */
  function mark() {
    const want = new Map(hits.map((h, i) => [h.id, i === at ? 'current' : 'match']));
    for (const id of marked.keys()) if (!want.has(id)) s.card(id)?.removeAttribute('data-found');
    for (const [id, v] of want) if (marked.get(id) !== v) s.card(id)?.setAttribute('data-found', v);
    marked.clear();
    for (const [id, v] of want) marked.set(id, v);
    s.world.toggleAttribute('data-search', hits.length > 0);
  }
  const index = () => {
    const key = s.key();
    if (!built || built.key !== key) built = { key, index: searchIndex([...s.docs()]) };
    return built.index;
  };

  return {
    /** Search `text`; the current match is `keep` if it still matches, else the best. `redrawn`: the
     *  cards may be new elements, so every mark is written again. */
    run(text: string, keep?: string, redrawn = false) {
      if (redrawn) {
        for (const id of marked.keys()) s.card(id)?.removeAttribute('data-found');
        marked.clear();
      }
      hits = search(index(), text);
      at = Math.max(0, hits.findIndex((h) => h.id === keep));
      mark();
    },
    step(dir: 1 | -1): string | undefined {
      if (!hits.length) return undefined;
      at = (at + dir + hits.length) % hits.length;
      mark();
      return hits[at]!.id;
    },
    current: (): string | undefined => hits[at]?.id,
    clear() {
      hits = [];
      at = 0;
      mark();
    },
    /** What the box says of the matches: "1 of 3" and the current one's parts, or "No matches". */
    said(text: string): GoBox {
      const hit = hits[at];
      if (!hit) return { text, said: goToCardWords.noMatches };
      const parts = [...new Set(hit.fields.map((f) => goToCardWords.PART[f.name] ?? f.name))];
      return { text, found: { count: goToCardWords.matchOf(at + 1, hits.length), text: goToCardWords.matchAt(at + 1, hits.length, hit.id, parts) } };
    },
  };
}

export function createGoTo(d: GoDeps): GoTo {
  const timer = d.timer ?? { set: (f: () => void, ms: number) => setTimeout(f, ms), clear: (h: unknown) => clearTimeout(h as number) };
  const matches = d.search && createMatches(d.search);
  let box: GoBox | null = null;
  let waiting: unknown = null;

  const stop = () => { if (waiting !== null) timer.clear(waiting); waiting = null; };
  const show = (b: GoBox | null) => { box = b; d.show(b); };
  function typed(text: string) {
    stop();
    if (matches && isWords(text)) {
      matches.run(text);
      return show(matches.said(text));
    }
    matches?.clear();
    show({ text: matches ? text : goDigits(text) });
    if (d.pause !== undefined && goDigits(box!.text)) waiting = timer.set(() => { waiting = null; enter(); }, d.pause);
  }
  function close() {
    stop();
    matches?.clear();
    if (box) show(null);
  }
  function enter() {
    stop();
    if (matches && box && isWords(box.text)) {
      const id = matches.current();
      if (id === undefined) return;
      close();
      return d.arrive(id);
    }
    if (!box || !goDigits(box.text)) return;
    const n = Number(goDigits(box.text));
    const t = d.find(n);
    if (t.to === 'card') {
      close();
      return d.arrive(t.id);
    }
    const past = t.to === 'retired' && t.version !== undefined
      ? { version: t.version, ...(t.until !== undefined && { until: t.until }), label: goToCardWords.showVWhereItLast(t.version) } : undefined;
    show({ text: box.text, said: SAYS[t.to](n), ...(past && { past }) });
  }

  return {
    get box() { return box; },
    words: !!matches,
    open(key) {
      if (!/^\d$/.test(key) && !(matches && key === '/')) return false;
      typed(key === '/' ? '' : key);
      return true;
    },
    edit: typed,
    enter,
    step(dir) {
      const id = box && isWords(box.text) ? matches?.step(dir) : undefined;
      if (id === undefined) return;
      show(matches!.said(box!.text));
      d.search!.reveal(id);
    },
    refresh() {
      if (!matches || !box || !isWords(box.text)) return;
      matches.run(box.text, matches.current(), true);
      show(matches.said(box.text));
    },
    to(n) {
      stop();
      matches?.clear();
      box = { text: String(n) };
      enter();
    },
    close,
    async openPast() {
      const past = box?.past;
      if (!past || !box) return;
      const n = Number(goDigits(box.text));
      close();
      await d.past(past.version, past.until);
      const t = d.find(n);
      if (t.to === 'card') d.arrive(t.id);
    },
  };
}
