// The board's host interface (principles § The board is a plugin; nclite's plugin contract, draft
// v0.1, `docs/plugins.md` § The view and its host). The board mounts in any host as
// `mount(root, host)` (mount.ts): everything it does outside its own root goes through `BoardHost`,
// in the contract's shape, and what a host shows of the board (counts, versions, the open lists)
// comes out through the view's status (status.ts), never in through the host. Plain TypeScript: no
// Svelte type crosses it. The standalone app is one host (shell/page-host.ts); a test's fake host
// is another (tests/pages/board-host.spec.ts). Each difference from nclite's draft is listed in
// docs/specification/components.md § The board's host interface.
import type { Chip } from '#actions';
import type { Transport } from '#client';
import type { FlagName } from '#format';
import { flagOn } from '#format';
import type { Align } from '#layout';

/** One line of a confirm step's list: a card's number and what is done to it. */
export interface ConfirmItem { ref: string; text: string }

/** What a confirm step lists (Accept all, proposals FE_01): what it does, and what it leaves out. */
export interface ConfirmList { items: readonly ConfirmItem[]; skipped?: readonly ConfirmItem[] }

/** A confirmation asked before a decision that takes something away (rule 8), or one that makes
 * several at once (Accept all): removing cards or a container, Accept all, removing an agent's
 * access, discarding a note's words. `confirm` is the confirming button's text. */
export interface ConfirmAsk { heading: string; body: string; confirm: string; list?: ConfirmList }

/** A change to the board's data, from anyone: `ref` carries the board and the ledger's head when
 * the host knows them. A ref with no head says "you may have missed changes": the board catches up
 * (the standalone page sends one each time its change stream opens). */
export interface BoardEvent { plugin: string; ref: { board?: string; head?: number } }

/** The board's settings, as the host keeps them: each feature flag by name (`#format` FLAGS; a
 * value the host does not give reads as the flag's default) and the viewer's `align`. */
export interface BoardSettings {
  get(key: string): unknown;
  /** Called when any setting changes; returns the unsubscribe. The board reads its flags once, at
   * mount, and lays out again when `align` changes. */
  on(listener: () => void): () => void;
}

/** What only a page that is the board's own does (the standalone app): its address names the open
 * board, it remembers the board last looked at, it starts again by reloading, and it holds the
 * person's cookie. A host leaves it out: the board then opens its first board and, with no board
 * left, starts again in place. */
export interface BoardPage {
  /** The boards to open first, in order: the address's, then the ones last looked at. */
  wanted(): readonly string[] | Promise<readonly string[]>;
  /** Board `id` is open now: the address names it, and it is remembered. */
  opened(id: string): void;
  /** Start the page again with no board named (the open board was archived and none is left). */
  restart(): void;
  /** Runs a person's call: the standalone page reloads once for a fresh cookie when one is refused
   * as `forbidden` (shell/page-io.ts `asPerson`). */
  person?<T>(run: () => Promise<T>): Promise<T>;
}

/** What the board needs of whoever hosts it. */
export interface BoardHost {
  /** Calls the board's own routes: `path` is relative to its route prefix (the typed client's
   * transport, `#client` `Transport`). */
  api: Transport;
  /** Every change to the board's data, from anyone; returns the unsubscribe. */
  events(listener: (e: BoardEvent) => void): () => void;
  /** Puts a chip in the chat's composer (Send to agent hands the selected cards). */
  addToChat(chip: Chip): void;
  settings: BoardSettings;
  /** A short notice outside the board; `error` for a refusal or a failure. */
  notify(text: string, tone?: 'info' | 'error'): void;
  /** Asks the person first, the host's own dialog; resolves true when confirmed. */
  confirm(ask: ConfirmAsk): Promise<boolean>;
  /** The standalone page's own part; a host leaves it out. */
  page?: BoardPage;
}

/** Whether flag `f` is on: the host's setting when it gives one, else the flag's default. */
export const flagOf = (host: Pick<BoardHost, 'settings'>, f: FlagName): boolean => {
  const v = host.settings.get(f);
  return flagOn(f, typeof v === 'boolean' ? { [f]: v } : {});
};

/** The viewer's alignment (alignSetting flag): `center` when the host says so, else `start`. */
export const alignOf = (host: Pick<BoardHost, 'settings'>): Align => (host.settings.get('align') === 'center' ? 'center' : 'start');

/** What `mount` gives back: nclite's `PluginView`. */
export interface BoardView {
  /** Removes every listener the board added and empties `root`. */
  unmount(): void;
  /** The chip for the board on show (what a pane header's Add to chat sends); null when no board is shown (or the one shown is archived). */
  pageChip(): Chip | null;
  /** Brings into view what a chip or a change names: a board, a card (`n`) or a note (`seq`). */
  reveal(ref: { board?: string; n?: number; seq?: number }): void;
}
