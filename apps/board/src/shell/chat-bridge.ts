// The bridge between the chat panel and the board (chat-panel FE_02 ruling 3, D-037): the only file
// that knows both sides. Board to chat: the composer shows one chip for everything a message carries
// from the board, "3 answers · 2 selected" (composer-one-chip ruling 1): the selected cards, in the
// order selected, and the person's answers since the board's last Send. It opens a preview of
// exactly that text, built by packages/actions `boardBlocks` and `roundOf`, the writer the server's
// prompt uses (ruling 2). There is no chip per card: to leave one out, deselect it; the cards a
// message carried are spent until the selection changes. Notes are among the answers, so they are
// no chips: a note goes once, as its answer (chat-no-double-note ruling 2). Chat to board: a change
// chip selects its cards and zooms to them (Zoom to selection), opening their board first when it is
// another one; a changed card's stepper links to the board write in the chat that last changed it; a
// chat in the folder's first board opens when drawn (`open`, panel-send ruling 2). The board side
// attaches from the controller, the chat side from the sidebar (chat-panel.ts); each detaches on its own.
// The pure parts are unit-tested under Node.
import type { LedgerState, SelectedCard } from '#actions';
import { boardBlocks, boardLocked, roundOf } from '#actions';
import type {
  ChangeEntry, ChatChangeDetail, ChatComposerElement, ChatState, Chip, ComposerContext,
} from '#chat';
import { CHAT_CHANGE_EVENT } from '#chat';
import type { BoardData } from '#actions';
import { clip } from '#format';
import type { BoardSide } from '../board/chat-side.ts';

/** The words of the stepper's link to the chat (packages/ui `CardUpdates.source`). */
export const SOURCE_LABEL = 'Show in the chat';

const LABEL_MAX = 80;

/** The selected cards, in the order they were selected, by number and title; a node with no number is no card. */
export function selectedCards(d: BoardData, ids: readonly string[]): SelectedCard[] {
  return ids.flatMap((id): SelectedCard[] => {
    const n = d.view.nodes.find((x) => x.id === id);
    return n?.n === undefined ? [] : [{ n: n.n, title: n.title }];
  });
}

/** The cards the next message carries: the selected ones, but those a message already took (`spent`). */
export const boardCards = (d: BoardData, selected: readonly string[], spent: ReadonlySet<number>): SelectedCard[] =>
  selectedCards(d, selected).filter((c) => !spent.has(c.n));

/** A card as the message's chip: its body's `cards`, the label the feed shows. */
export const cardChip = (c: SelectedCard): Chip => ({ kind: 'card', ref: c.n, label: clip(c.title, LABEL_MAX) || `Card ${c.n}` });

const count = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** The composer's one chip on `board`: "3 answers · 2 selected" (either part alone), opening to exactly
 *  what the next message carries from the board: `cards`, then the answers since the board's last
 *  Send as `agent` is told them (the session's agent: only what it may answer, as the server builds
 *  it; every answer with none); on a locked board no answers, which wait for the unlock as the server's
 *  do (api.md 140). None when there is nothing. */
export function boardContext(s: LedgerState, board: string, cards: readonly SelectedCard[], agent?: string): ComposerContext | null {
  const round = boardLocked(s, board) ? undefined : roundOf(s, board, s.lastSend.get(board) ?? 0, agent);
  const parts = [round && count(round.count, 'answer'), cards.length > 0 && `${cards.length} selected`].filter(Boolean);
  return parts.length ? { label: parts.join(' · '), text: boardBlocks(cards, round) } : null;
}

/** The board write in the chat that last changed card `n` on `board`. */
export const lastChange = (s: ChatState, board: string, n: number): ChangeEntry | undefined =>
  s.entries.findLast((e): e is ChangeEntry => e.type === 'change' && e.board === board && e.cards.includes(n));

/** A change chip's cards that are on the board, as card ids. */
export function cardIds(d: BoardData, cards: readonly number[]): string[] {
  const on = new Set(d.view.nodes.map((n) => n.id));
  return cards.map(String).filter((id) => on.has(id));
}

/** What the bridge needs of the board: the board's chat side (board/chat-side.ts). */
export type { BoardSide } from '../board/chat-side.ts';

/** What the bridge needs of the chat (chat-panel.ts). */
export interface ChatSide {
  /** The panel: the chat's events bubble up to it. */
  panel: HTMLElement;
  /** The composer, which may not be drawn yet: it takes the context whenever it is (chat-panel.ts `composerSide`). */
  composer: Pick<ChatComposerElement, 'setContext'>;
  state(): ChatState;
  /** The agent id of the session on the open board, whose answers the context shows; undefined with none. */
  agent(): string | undefined;
  /** What is attached changed. */
  changed(): void;
  /** Open the sidebar at feed entry `key`. */
  reveal(key: string): void | Promise<void>;
}

export interface ChatBridge {
  board(side: BoardSide): () => void;
  chat(side: ChatSide): () => void;
  /** The board was drawn, or the chat's session changed: the cards and the answers may have. */
  refresh(): void;
  /** The selected cards the next message carries, as its chips. */
  chips(): Chip[];
  /** The stepper link's words for card `n`, when a board write in the chat changed it. */
  source(n: number): string | undefined;
  /** A message went with `chips`: those cards are spent until the selection changes. */
  sent(chips: readonly Chip[]): void;
  /** The chat's agent drew `board`, its session's first: open it. */
  open(board: string): void;
}

export function createChatBridge(): ChatBridge {
  let b: BoardSide | null = null;
  let c: ChatSide | null = null;
  /** The cards a message already took, by number. */
  const spent = new Set<number>();
  /** The context last given to the composer, as text. */
  let shown = 'null';

  const cards = (): SelectedCard[] => {
    const d = b?.data();
    return !b || !d || b.readOnly() ? [] : boardCards(d, b.selection.selected(), spent);
  };

  function attach() {
    if (!b || !c || !b.data()) return;
    const s = b.ledger();
    const context = b.readOnly() || !s ? null : boardContext(s, b.id(), cards(), c.agent());
    const key = JSON.stringify(context);
    if (key !== shown) { shown = key; c.composer.setContext(context); }
    c.changed();
  }

  function zoomTo(cards: readonly number[]) {
    const d = b?.data();
    if (!b || !d) return;
    const ids = cardIds(d, cards);
    if (!ids.length) return b.toast('Those cards are no longer on the board.');
    b.selection.select(ids, 'only');
    b.zoom();
  }

  const onChange = (e: Event) => {
    const { board, cards } = (e as CustomEvent<ChatChangeDetail>).detail;
    if (!b) return;
    if (board !== b.id()) b.switchTo(board);
    if (board === b.id()) zoomTo(cards);
  };
  const source = (n: number) => (b && c && lastChange(c.state(), b.id(), n) ? SOURCE_LABEL : undefined);
  /** The stepper's link on a changed card (packages/ui `stepMarkup`). */
  const onStage = (e: MouseEvent) => {
    const link = (e.target as Element).closest<HTMLElement>('vb-node [data-source]');
    const n = Number(link?.closest<HTMLElement>('vb-node')?.dataset.id);
    const entry = b && c && link ? lastChange(c.state(), b.id(), n) : undefined;
    if (entry) void c!.reveal(entry.key);
  };

  return {
    board(side) {
      b = side;
      side.source(source);
      side.stage.addEventListener('click', onStage);
      const unlisten = side.selection.onChange(() => {
        spent.clear();
        attach();
      });
      attach();
      return () => { side.source(null); side.stage.removeEventListener('click', onStage); unlisten(); b = null; };
    },
    chat(side) {
      c = side;
      shown = 'null';
      side.panel.addEventListener(CHAT_CHANGE_EVENT, onChange);
      attach();
      return () => {
        side.panel.removeEventListener(CHAT_CHANGE_EVENT, onChange);
        c = null;
      };
    },
    refresh: attach,
    chips: () => cards().map(cardChip),
    source,
    sent(took) {
      for (const chip of took) if (chip.kind === 'card') spent.add(chip.ref);
      attach();
    },
    open: (board) => b?.jump(board),
  };
}
