// The bridge between the chat panel and the board (chat-panel FE_02 ruling 3, D-037): the only file
// that knows both sides. Board to chat: the selected cards become the composer's chips; a chip the
// person takes off stays off until the selection changes, and the chips a message carried go with
// it; the person's answers since the board's last Send are the composer's context, "3 answers since
// your last Send", opening to the lines the next message carries (chat-board-context ruling 1:
// packages/actions `replyLines`, the Send message's writer). Their notes are among those lines, so
// they are no chips: a note goes once, as its answer (chat-no-double-note ruling 2). Chat to board:
// a change chip selects its cards and zooms to them (Zoom to selection), opening their board first
// when it is another one; a changed card's stepper links to the board write in the chat that last
// changed it; a chat in the folder's first board opens when drawn (`open`, panel-send ruling 2). The
// board side attaches from the controller, the chat side from the sidebar (chat-panel.ts); each
// detaches on its own.
// The pure parts are unit-tested under Node.
import type { LedgerState } from '../../../../packages/actions/src/index.ts';
import { boardState, replyLines, replyScope } from '../../../../packages/actions/src/index.ts';
import type {
  ChangeEntry, ChatChangeDetail, ChatChipRemoveDetail, ChatComposerElement, ChatState, Chip, ComposerContext,
} from '../../../../packages/chat/src/index.ts';
import { CHAT_CHANGE_EVENT, CHAT_CHIP_REMOVE_EVENT, chipKey } from '../../../../packages/chat/src/index.ts';
import { boardView } from '../../../../packages/format/src/index.ts';
import type { BoardData } from './io.ts';
import type { Selection } from './selection.ts';

/** The words of the stepper's link to the chat (packages/ui `CardUpdates.source`). */
export const SOURCE_LABEL = 'Show in the chat';

const LABEL_MAX = 80;
const clip = (text: string): string => {
  const flat = text.replace(/\s+/g, ' ').trim();
  return flat.length <= LABEL_MAX ? flat : `${flat.slice(0, LABEL_MAX - 1)}…`;
};

/** The selected cards, in the order they were selected; a node with no number is no card. */
export function selectedCards(d: BoardData, ids: readonly string[]): Chip[] {
  return ids.flatMap((id): Chip[] => {
    const n = d.view.nodes.find((x) => x.id === id);
    return n?.n === undefined ? [] : [{ kind: 'card', ref: n.n, label: clip(n.title) || `Card ${n.n}` }];
  });
}

/** The composer's chips: the selected cards, but those taken off (`off`, by `chipKey`). */
export const boardChips = (d: BoardData, selected: readonly string[], off: ReadonlySet<string>): Chip[] =>
  selectedCards(d, selected).filter((c) => !off.has(chipKey(c)));

/** The person's answers on `board` since its last Send, as the lines the next message hands `agent`
 *  (the session's agent: only what it may answer, as the server builds it; every answer with none). */
export function answerLines(s: LedgerState, board: string, agent?: string): string[] {
  const scope = replyScope(s, board, s.lastSend.get(board) ?? 0, agent);
  if (scope.cards.size === 0 && scope.regions.size === 0) return [];
  return replyLines(boardView(s, board), boardState(s, board), scope).lines;
}

/** The composer's context for those lines; none when there are none. */
export const answersContext = (lines: readonly string[]): ComposerContext | null =>
  lines.length ? { label: `${lines.length} ${lines.length === 1 ? 'answer' : 'answers'} since your last Send`, lines } : null;

/** The board write in the chat that last changed card `n` on `board`. */
export const lastChange = (s: ChatState, board: string, n: number): ChangeEntry | undefined =>
  s.entries.findLast((e): e is ChangeEntry => e.type === 'change' && e.board === board && e.cards.includes(n));

/** A change chip's cards that are on the board, as card ids. */
export function cardIds(d: BoardData, cards: readonly number[]): string[] {
  const on = new Set(d.view.nodes.map((n) => n.id));
  return cards.map(String).filter((id) => on.has(id));
}

const same = (a: readonly Chip[], b: readonly Chip[]) =>
  a.length === b.length && a.every((c, i) => chipKey(c) === chipKey(b[i]!) && c.label === b[i]!.label);

/** What the bridge needs of the board (controller.ts). */
export interface BoardSide {
  stage: HTMLElement;
  /** The open board as drawn; null before one opens. */
  data(): BoardData | null;
  /** The ledger as folded now (not a past version's); null before it is read. */
  ledger(): LedgerState | null;
  id(): string;
  selection: Selection;
  /** A past version shows: no chips (no message can go). */
  readOnly(): boolean;
  /** Zoom to the selection (the selection bar's Zoom to selection). */
  zoom(): void;
  /** Open another board; it is drawn before this returns (boards.ts). */
  switchTo(board: string): void;
  /** Open a board now when it is held, else once its line arrives (boards.ts `jump`). */
  jump(board: string): void;
  toast(text: string): void;
}

/** What the bridge needs of the chat (chat-panel.ts). */
export interface ChatSide {
  /** The panel: the chat's events bubble up to it. */
  panel: HTMLElement;
  composer: ChatComposerElement;
  state(): ChatState;
  /** The agent id of the session on the open board, whose answers the context shows; undefined with none. */
  agent(): string | undefined;
  /** The chips or the context changed. */
  changed(): void;
  /** Open the sidebar at feed entry `key`. */
  reveal(key: string): void | Promise<void>;
}

export interface ChatBridge {
  board(side: BoardSide): () => void;
  chat(side: ChatSide): () => void;
  /** The board was drawn, or the chat's session changed: the chips and the answers may have. */
  refresh(): void;
  /** The stepper link's words for card `n`, when a board write in the chat changed it. */
  source(n: number): string | undefined;
  /** A message went with `chips`: they are spent. */
  sent(chips: readonly Chip[]): void;
  /** The chat's agent drew `board`, its session's first: open it. */
  open(board: string): void;
}

export function createChatBridge(): ChatBridge {
  let b: BoardSide | null = null;
  let c: ChatSide | null = null;
  const off = new Set<string>();
  /** The context last given to the composer, as text. */
  let shown = 'null';

  function chips() {
    const d = b?.data();
    if (!b || !c || !d) return;
    const next = b.readOnly() ? [] : boardChips(d, b.selection.selected(), off);
    if (!same(next, c.composer.chips)) c.composer.setChips(next);
    const s = b.ledger();
    const context = b.readOnly() || !s ? null : answersContext(answerLines(s, b.id(), c.agent()));
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
  const onRemove = (e: Event) => { off.add(chipKey((e as CustomEvent<ChatChipRemoveDetail>).detail.chip)); };
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
      side.stage.addEventListener('click', onStage);
      const unlisten = side.selection.onChange(() => {
        for (const k of off) if (k.startsWith('card-')) off.delete(k);
        chips();
      });
      chips();
      return () => { side.stage.removeEventListener('click', onStage); unlisten(); b = null; };
    },
    chat(side) {
      c = side;
      shown = 'null';
      side.panel.addEventListener(CHAT_CHANGE_EVENT, onChange);
      side.panel.addEventListener(CHAT_CHIP_REMOVE_EVENT, onRemove);
      chips();
      return () => {
        side.panel.removeEventListener(CHAT_CHANGE_EVENT, onChange);
        side.panel.removeEventListener(CHAT_CHIP_REMOVE_EVENT, onRemove);
        c = null;
      };
    },
    refresh: chips,
    source: (n) => (b && c && lastChange(c.state(), b.id(), n) ? SOURCE_LABEL : undefined),
    sent(spent) {
      for (const chip of spent) off.add(chipKey(chip));
      chips();
    },
    open: (board) => b?.jump(board),
  };
}
