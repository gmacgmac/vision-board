// The board's host interface (principles § The board is a plugin; docs/specification/plugin.md, One shape everywhere:
// seam 2 is a host plugin contract's shapes, `Ref`, `SendRecord`, `PluginEvent`). The board mounts in any host as
// `mount(root, host)` (mount.ts): everything it does outside its own root goes through `BoardHost`,
// in the contract's shape, and what a host shows of the board (counts, versions, the open lists)
// comes out through the view's status (status.ts), never in through the host. Plain TypeScript: no
// Svelte type crosses it (the board's own controls are Svelte, compiled inside it: chrome/, PLAN Decisions). The standalone app is one host (shell/page-host.ts); a test's fake host
// is another (tests/pages/board-host.spec.ts). Where it differs from the contract's `PluginHost` (no `chat.add`; `store`,
// `imageRoute`, `chat.reveal`, `chat.hasLine` optional) a contract host still fits it: apps/board/tests/plugin-types.test.ts.
import type { Chip, Ref } from '#actions';
import type { Transport } from '#client';
import type { FlagName } from '#format';
import { flagOn } from '#format';
import type { Align } from '#layout';
import type { MarkdownOptions } from '#ui';

/** One line of a confirm step's list: a card's number and what is done to it. */
export interface ConfirmItem { ref: string; text: string }

/** What a confirm step lists (Accept all, proposals FE_01): what it does, and what it leaves out. */
export interface ConfirmList { items: readonly ConfirmItem[]; skipped?: readonly ConfirmItem[] }

/** A confirmation asked before a decision that takes something away (rule 8), or one that makes
 * several at once (Accept all): removing cards or a container, Accept all, removing an agent's
 * access, discarding a note's words. `confirm` is the confirming button's text. */
export interface ConfirmAsk { heading: string; body: string; confirm: string; list?: ConfirmList }

/** A change to the board's data, from anyone. `ref` is any `Ref`, as the engine's `watch` gave it: of it the board reads
 * `head`, the ledger line it changed through (0: the ledger was replaced, read it from the start). A ref with no `head`,
 * or one that is not a whole number from 0, says "you may have missed changes": the board catches up (the standalone
 * page sends `{}` each time its change stream opens). Other keys are ignored. */
export interface PluginEvent { plugin: string; ref: Ref }

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
  /** The page's own controls in the board's header. A host has none, and the header reflows. */
  parts?: BoardPageParts;
  /** Help a person on this page can act on: its commands. A host's person has none, and the board's words say only what is general. */
  help?: { waiting: string; unreachable: string; reply: { lead: string; command: string } };
  /** Runs a person's call: the standalone page reloads once for a fresh cookie when one is refused
   * as `forbidden` (shell/page-io.ts `asPerson`). */
  person?<T>(run: () => Promise<T>): Promise<T>;
}

/** What the header gives a part: its id and, on a gallery's sample, a state to draw; in the "⋯" menu, how
 *  to close the menu and then act. */
export interface PagePartArgs {
  id?: string | undefined;
  look?: 'hover' | 'focus' | 'pressed' | undefined;
  choose?: ((run: () => void) => void) | undefined;
}

/** A control the page draws into `target`, an element of the header's that takes no room; it gives back
 *  what undoes it. It may draw nothing for now (a folder not read yet). */
export type PagePart = (target: HTMLElement, args: PagePartArgs) => () => void;

/** What only the standalone page has in the board's header: its theme and alignment in "⋯", its folder
 *  (a chip in the path, a row of "⋯" once the bar is narrow, Open folder… last in "⋯"), its ledger the same way
 *  (D-084 7: a chip after the folder in the path, a row of "⋯" under the folder's, New ledger… in "⋯" after Open
 *  folder…), its ledger's read-only state with Edit and Stop editing (readOnlyStart flag, D-085) and its Chat button.
 *  A part may come and go while the board is mounted: the ledger's three are there only while the page's server names
 *  a ledger (M51), so the header reads each where it draws it (Svelte tracks a getter that reads the page's state). */
export interface BoardPageParts {
  /** A row of "⋯" given `choose`, else a button (toolbarMenu flag off). */
  theme?: PagePart;
  alignRow?: PagePart;
  folderChip?: PagePart;
  folderField?: PagePart;
  folderRow?: PagePart;
  /** The open ledger and its list, in the path (header-tier.ts `ledger`). */
  ledgerChip?: PagePart;
  /** The same, as a row of "⋯" (a third of the width). */
  ledgerField?: PagePart;
  /** New ledger…, a row of "⋯"'s own, given `choose`. */
  ledgerRow?: PagePart;
  /** The open ledger's state, Read-only or Editing (readOnlyStart flag, D-085 5): after the path at every width
   *  (header-tier.ts `editing`), a chip whose menu holds Edit or Stop editing; with the readOnlyToggle flag one toggle
   *  that flips the state on a press, and the header draws no `editButton`. */
  editChip?: PagePart;
  /** Edit or Stop editing as a button at full (header-tier.ts `edit`); given `choose`, a row of "⋯" at half and a third.
   *  Not drawn with the readOnlyToggle flag (`editChip` is the one control). */
  editButton?: PagePart;
  chat?: PagePart;
}

/** What the chat's agent is doing: nothing, its turn running, or waiting for the person's OK. */
export type ChatWork = 'idle' | 'working' | 'asking';

/** What the board may read of the host's chat. Read only; `on` says when any of it changes. `now` is
 * all a host need give: the rest is optional, and a board with none of it works, with Send enabled
 * by an answer no Send has carried or by a chip of the board's own that hasn't gone. */
export interface ChatStatus {
  /** Drives the board's working mark (the status's `chatWork`). A host with no agent to speak of says `idle`. */
  readonly now: ChatWork;
  /** The id, on this board's ledger, of the agent the chat talks to on the open board. With it the answers
   *  chip holds only what that agent may read, and only those light Send (point 384); without it, every answer
   *  (a host with one bot). */
  readonly agent?: string | undefined;
  /** The Send the person pressed waits for the agent's turn to end (the status's `sendWaiting`). */
  readonly held?: boolean | undefined;
  /** The chat holds what Send would carry, a file of its own say: Send is enabled for it (the status's `chatAttached`).
   *  Given at all, it has the full say, the board's own chips included: false leaves Send to the answers alone. */
  readonly staged?: boolean | undefined;
  on(listener: () => void): () => void;
}

/** A card on a board, as the chat's line that changed it is asked for: a plain `Ref`, which a change line matches when
 * its `reveal` has the same `board` and a `cards` list holding `cards`. */
export type ChatLine = { board: string; cards: number };

/** The board's own record of a Send (the `send` act), which a host calls once the message went. `acks`: every `ack` the
 * engine's `resolve` answered for the board's chips that went, in the order staged (`[]` when none did, or nothing
 * went); null only from a host with no chat. Resolves null when recorded, else the problem's words. */
export type SendRecord = (acks: readonly Ref[] | null) => Promise<string | null>;

/** The host's chat, as the board reaches it: the only way it does. */
export interface BoardChat {
  /** Adds, replaces or removes (null) the chip under `key`, for the next message. The board keeps two
   *  live, `selection` and `answers`, one chip each, replaced as they change and removed at `unmount`;
   *  a host may draw them apart or as one. A chip's `kind` and `ref` go back to the engine's `resolve`
   *  as its message goes, and a host may pass the rest through unread, whatever the kind.
   *  A chip that went with a message is spent until its key's `ref` changes: the same `ref` may come
   *  again with new words (a card's title changed), and it stays spent. An answers chip's `ref` changes
   *  once a Send carries the answers. */
  attach(key: string, chip: Chip | null): void;
  /** Send to agent: sends what is staged, with no words, and has the Send recorded. `record` is the
   *  board's own record of it (the `send` act, which marks the answers handed over): null when recorded,
   *  else the problem's words. A host calls it once per Send, only after the message has gone (one that
   *  failed records nothing), and answers with what it answered. It passes `record` the `ack`s that `resolve`
   *  answered for the chips that went (the answers chip's `{ board, head }`: only the answers read count as sent),
   *  `[]` when none went; `record(null)` only when no chat carried the answers (with no chat at all,
   *  `send: (record) => record(null)`, the bot reads the board itself). It leaves `record`
   *  out only when its own server recorded that Send with the message (the standalone server does, for a
   *  message on the board's session), and it still calls it when nothing was staged, or the chat has no
   *  session to send through. Resolves null once done or held for the agent's turn to end, else the problem's words. */
  send(record: SendRecord): Promise<string | null>;
  readonly status: ChatStatus;
  /** Shows the chat's line that last changed this card (a changed card's stepper links to it). */
  reveal?(ref: ChatLine): void;
  /** Whether there is such a line: the stepper shows its link only then. Left out, with `reveal` given, it always shows. */
  hasLine?(ref: ChatLine): boolean;
}

/** The viewer's small conveniences the board keeps: each board's zoom and position (`view.<board>`) and
 * whether the proposals notice is hidden (`proposals-hidden`), as strings under keys the board names.
 * The board's own keys say only what is on its board, so a host gives each folder or bot its own store
 * and two boards named "plans" never clash. A store may lose anything, whenever it likes. */
export interface BoardStore {
  get(key: string): string | null;
  set(key: string, value: string): void;
}

/** What the board needs of whoever hosts it. */
export interface BoardHost {
  /** Calls the board's own routes: `path` is relative to its route prefix (the typed client's
   * transport, `#client` `Transport`). */
  api: Transport;
  /** Every change to the board's data, from anyone; returns the unsubscribe. */
  events(listener: (e: PluginEvent) => void): () => void;
  /** The host's chat: the selection and the answers go to it as chips, Send through it. */
  chat: BoardChat;
  settings: BoardSettings;
  /** A short notice outside the board; `error` for a refusal or a failure. */
  notify(text: string, tone?: 'info' | 'error'): void;
  /** Asks the person first, the host's own dialog; resolves true when confirmed. */
  confirm(ask: ConfirmAsk): Promise<boolean>;
  /** Where the board keeps the viewer's conveniences. Left out, it keeps them for as long as this mount. */
  store?: BoardStore;
  /** The address a picture's path goes after: what `<img src>` loads and the version is asked at, on the
   *  browser's own cookies (a picture can't go through `api`). A host answers it with the engine's `image`.
   *  Left out, `IMAGE_ROUTE` on the page's origin. */
  imageRoute?: string;
  /** Says that what `pageChip()` answers may have changed (another board on show, none, or the shown one archived, back
   *  or renamed): the board calls it once its first draw settles, then on each such change. The host asks `pageChip()`
   *  again and reads nothing from the call. Left out, the board tells no one. */
  pageChanged?(): void;
  /** The standalone page's own part; a host leaves it out. */
  page?: BoardPage;
}

/** Whether flag `f` is on: the host's setting when it gives one, else the flag's default. */
export const flagOf = (host: Pick<BoardHost, 'settings'>, f: FlagName): boolean => {
  const v = host.settings.get(f);
  return flagOn(f, typeof v === 'boolean' ? { [f]: v } : {});
};

/** How the board's Markdown renders under this host, for every surface that draws it. */
export const markdownOf = (host: Pick<BoardHost, 'settings' | 'imageRoute'>): MarkdownOptions =>
  ({ images: flagOf(host, 'cardImages'), svg: flagOf(host, 'svgImages'), imageRoute: host.imageRoute, more: flagOf(host, 'markdownMore') });

/** The host's chat status as the board reads it: while the engine takes every agent as its folder's one agent
 *  (`oneAgent`, from the engine's reads: its `singleAgent` flag, set once, on the engine), `agent` is ignored, so the
 *  answers chip holds every answer and every answer lights Send (plugin.md § What the host gives); else the host's own.
 *  Each member reads the host's, and `oneAgent`, at the time. */
export function chatStatusOf(host: Pick<BoardHost, 'chat'>, oneAgent: () => boolean): ChatStatus {
  const { chat } = host;
  return {
    get now() { return chat.status.now; },
    get held() { return chat.status.held; },
    get staged() { return chat.status.staged; },
    get agent() { return oneAgent() ? undefined : chat.status.agent; },
    on: (listener) => chat.status.on(listener),
  };
}

/** A store for one mount, for a host that gives none. */
export function memoryStore(): BoardStore {
  const held = new Map<string, string>();
  return { get: (key) => held.get(key) ?? null, set(key, value) { held.set(key, value); } };
}

/** The viewer's alignment (alignSetting flag): `center` when the host says so, else `start`. */
export const alignOf = (host: Pick<BoardHost, 'settings'>): Align => (host.settings.get('align') === 'center' ? 'center' : 'start');

/** What `mount` gives back, the view a host holds (`PluginView`, apps/board/plugin/view.ts). */
export interface BoardView {
  /** Removes every listener the board added and empties `root`. It never asks: words a note holds
   *  go with it, so a host calls `leave()` first. */
  unmount(): void;
  /** Whether a note holds changed words not yet saved. Synchronous, so a host can read it in a
   *  `beforeunload` handler or to word its own question; the board's status (`unsaved`) says each
   *  time it turns. */
  unsaved(): boolean;
  /** Asks the person before unsaved words are lost: true at once when nothing is unsaved, else the
   *  answer to the board's discard question, asked through `confirm`. True: the words are discarded
   *  (the note closes, `unsaved()` is false) and the host unmounts.
   *  False (Cancel): the board stays, focus back in the words. A call while one is asking gets the
   *  same answer, not a second question. */
  leave(): Promise<boolean>;
  /** The chip for the board on show (what a pane header's Add to chat sends); null when no board is shown (or the one shown
   *  is archived). Each time it would change, the board calls the host's `pageChanged`. */
  pageChip(): Chip | null;
  /** Brings into view what a chip or a change names: a board, a card (`n`), a note (`seq`), or several
   *  cards by number (`cards`), which it zooms to and selects nothing, so nothing goes with the next
   *  message; none of them on the board, it says so through `notify`. Another board may ask first,
   *  through `confirm`, while a note holds unsaved words (as `leave()` does): what `ref` names shows once
   *  that board has opened, and Cancel leaves everything as it was. A board not yet in the ledger opens
   *  once its first line arrives (an agent's first board). Any `Ref`: other keys, and a value of the wrong
   *  kind, are ignored. */
  reveal(ref: Ref): void;
}
