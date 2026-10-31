// The board's side of its host's chat (host.ts `BoardChat`; D-074): what it tells the chat and what it
// hears. It keeps two live chips attached, the selected cards and the person's answers since the last
// Send (`#actions` `selectionChip`, `answersChip`), each replaced as it changes, none on a past version;
// it mirrors the chat's status into the board's own, for the working mark and Send; and a changed card's
// stepper links to the chat's line that last changed it. Everything here goes through `BoardChat`, so
// the standalone chat and any other host's are told the same. No DOM but the stage's click.
import type { BoardData, Chip, LedgerState, SelectedCard } from '#actions';
import { answersChip, selectionChip } from '#actions';
import type { BoardChat } from './host.ts';
import type { Selection } from './selection/index.ts';
import type { Status } from './status.ts';
import * as boardWords from './words/board.ts';

/** The keys the board's live chips go under. */
export const SELECTION_KEY = 'selection';
export const ANSWERS_KEY = 'answers';

/** The selected cards, in the order they were selected, by number and title; a node with no number is no card. */
export function selectedCards(d: BoardData, ids: readonly string[]): SelectedCard[] {
  return ids.flatMap((id): SelectedCard[] => {
    const n = d.view.nodes.find((x) => x.id === id);
    return n?.n === undefined ? [] : [{ n: n.n, title: n.title }];
  });
}

/** Those of `cards` that are on the board, as card ids. */
export function cardIds(d: BoardData, cards: readonly number[]): string[] {
  const on = new Set(d.view.nodes.map((n) => n.id));
  return cards.map(String).filter((id) => on.has(id));
}

/** The words of card `n`'s stepper link, when the chat has the line that changed it. */
export function chatSource(chat: BoardChat, board: string, n: number): string | undefined {
  if (!chat.reveal) return undefined;
  return !chat.hasLine || chat.hasLine({ board, n }) ? boardWords.showInTheChat : undefined;
}

export interface ChatSideDeps {
  chat: BoardChat;
  stage: HTMLElement;
  selection: Selection;
  status: Status;
  /** The open board as drawn; null before one opens. */
  data(): BoardData | null;
  /** The ledger as folded now (not a past version's); null before it is read. */
  ledger(): LedgerState | null;
  id(): string;
  /** A past version shows: nothing attached (no message can go). */
  readOnly(): boolean;
}

/** Joins the board to its host's chat; returns the function that parts them, taking its chips back. */
export function bindChat(d: ChatSideDeps): () => void {
  const { chat, stage, selection, status } = d;
  /** Each key's chip as last attached, as text: the same chip is not attached twice. */
  const shown = new Map<string, string>();
  const put = (key: string, chip: Chip | null) => {
    const text = JSON.stringify(chip);
    if ((shown.get(key) ?? 'null') === text) return;
    shown.set(key, text);
    chat.attach(key, chip);
  };

  function attach() {
    const data = d.data();
    if (!data) return;
    const s = d.readOnly() ? null : d.ledger();
    put(SELECTION_KEY, s && selectionChip(d.id(), selectedCards(data, selection.selected())));
    put(ANSWERS_KEY, s && answersChip(s, d.id(), chat.status.agent));
  }

  function hear() {
    status.set({ chatWork: chat.status.now, sendWaiting: chat.status.held === true, chatAttached: chat.status.staged === true });
    attach();
  }

  /** The stepper's link on a changed card (packages/ui `stepMarkup`). */
  const onStage = (e: MouseEvent) => {
    const link = (e.target as Element).closest<HTMLElement>('vb-node [data-source]');
    if (link) chat.reveal?.({ board: d.id(), n: Number(link.closest<HTMLElement>('vb-node')?.dataset.id) });
  };

  stage.addEventListener('click', onStage);
  const stops = [selection.onChange(attach), status.on((patch) => { if ('drawn' in patch) attach(); }), chat.status.on(hear)];
  hear();
  return () => {
    for (const stop of stops) stop();
    stage.removeEventListener('click', onStage);
    put(SELECTION_KEY, null);
    put(ANSWERS_KEY, null);
  };
}
