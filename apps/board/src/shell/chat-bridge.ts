// The bridge between the chat panel and the board (chat-panel FE_02 ruling 3, D-037): the only file
// that knows both sides. Board to chat: the composer shows one chip for everything a message carries
// from the board, "3 answers · 2 selected" (composer-one-chip ruling 1): the selected cards, in the
// order selected, and the person's answers since the board's last Send. It opens a preview of
// exactly that text, built by packages/actions `boardBlocks` and `roundOf`, the writer the server's
// prompt uses (ruling 2). There is no chip per card: to leave one out, deselect it; the cards a
// message carried are spent until the selection changes. Notes are among the answers, so they are
// no chips: a note goes once, as its answer (chat-no-double-note ruling 2). Chat to board: a change
// chip zooms to its cards and selects nothing, so nothing goes with the next message, opening their
// board first when it is another one; a changed card's stepper links to the board write in the chat that last changed it; a
// chat in the folder's first board opens when drawn (`open`, panel-send ruling 2). The board side
// attaches from the controller, the chat side from the sidebar (chat-panel.ts); each detaches on its own.
// It also holds the files attached to the next message (D-068 ruling 6: the composer takes them, the host
// uploads): each goes up as it comes, its chip saying so, then ready with its path or refused with why;
// the limits are checked here first and by the server again. Once ready, a PDF's pages and a big picture's fitted
// copy are made (`ChatSide.copies`, pdf-pages.ts, D-071), which never holds Send. The pure parts are unit-tested under Node.
import type { LedgerState, SelectedCard } from '#actions';
import { boardBlocks, boardLocked, roundOf } from '#actions';
import type {
  ChangeEntry, ChatChangeDetail, ChatComposerElement, ChatFileRemoveDetail, ChatFilesDetail, ChatState, Chip, ComposerContext, ComposerFile,
} from '#chat';
import { CHAT_CHANGE_EVENT, CHAT_FILE_REMOVE_EVENT, CHAT_FILES_EVENT } from '#chat';
import type { BoardData } from '#actions';
import type { OperationInput, OperationOutput, PointerError } from '#format';
import { clip } from '#format';
import type { BoardSide } from '../board/chat-side.ts';
import { FILE_BYTES, FILE_COUNT, attachedName, fileData, fileLabel } from './attached-file.ts';
import type { MakeCopies } from './pdf-pages.ts';
import * as chatWords from './words/chat.ts';

/** The words of the stepper's link to the chat (packages/ui `CardUpdates.source`). */
export const SOURCE_LABEL = chatWords.showInTheChat;

const LABEL_MAX = 80;

/** One file the next message may carry: its body's item. */
export type MessageFile = NonNullable<OperationInput<'send_chat'>['body']['files']>[number];
export type AttachFileBody = OperationInput<'attach_chat_file'>['body'];

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
export const cardChip = (c: SelectedCard): Chip => ({ kind: 'card', ref: c.n, label: clip(c.title, LABEL_MAX) || chatWords.card(c.n) });

const count = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** The composer's one chip on `board`: "3 answers · 2 selected" (either part alone), opening to exactly
 *  what the next message carries from the board: `cards`, then the answers since the board's last
 *  Send as `agent` is told them (the session's agent: only what it may answer, as the server builds
 *  it; every answer with none); on a locked board no answers, which wait for the unlock as the server's
 *  do (api.md 140). None when there is nothing. */
export function boardContext(s: LedgerState, board: string, cards: readonly SelectedCard[], agent?: string): ComposerContext | null {
  const round = boardLocked(s, board) ? undefined : roundOf(s, board, s.lastSend.get(board) ?? 0, agent);
  const parts = [round && count(round.count, 'answer'), cards.length > 0 && chatWords.selected(cards.length)].filter(Boolean);
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
  /** Where each attached file stands, for the composer (it is drawn, or a file could not have come). */
  setFiles(files: readonly ComposerFile[]): void;
  /** Save one attached file (`attach_chat_file`). */
  upload(body: AttachFileBody): Promise<OperationOutput<'attach_chat_file'>>;
  /** Pictures of what is attached, with the `readAttachment` flag on (pdf-pages.ts). */
  copies?: MakeCopies | undefined;
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
  /** Files the person attached (`chat-files`, heard on the panel): each is checked, then uploaded, and its chip says where it stands. */
  attachFiles(files: readonly File[], pasted: boolean): void;
  /** A file's chip was taken off (`chat-file-remove`): its file stays saved (D-068 ruling 4), an answer still on its way is dropped. */
  removeFile(id: string): void;
  /** The ready files, for the next message. */
  files(): MessageFile[];
  /** Whether a file is still uploading, or having a copy made that it needs: no message goes until it is settled. */
  uploading(): boolean;
  /** The server refused the message that named `files`: mark each file a problem points to (`/files/<i>`) refused, with why. */
  refuseSent(files: readonly MessageFile[], pointers: readonly PointerError[]): void;
  /** A message went with `chips` and `files`: those cards are spent until the selection changes, those files and any refused one gone from the composer. */
  sent(chips: readonly Chip[], files?: readonly MessageFile[]): void;
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
  /** The files attached to the next message, with what the server answered for those it saved. */
  let held: (ComposerFile & { saved?: MessageFile })[] = [];
  let filesMade = 0;
  /** Stopping each file's pictures, while they are being made. */
  const making = new Map<string, () => void>();
  const stopMaking = (keep: (id: string) => boolean = () => false) => {
    for (const [id, stop] of making) if (!keep(id)) { stop(); making.delete(id); }
  };

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
    if (!ids.length) return b.toast(chatWords.thoseCardsAreNoLonger);
    b.zoom(ids);
  }

  const drawFiles = () => c?.setFiles(held.map(({ saved: _, ...file }) => file));
  const showFiles = () => {
    drawFiles();
    c?.changed();
  };
  const settle = (id: string, change: Partial<(typeof held)[number]>) => {
    held = held.map((f) => (f.id === id ? { ...f, ...change } : f));
    showFiles();
  };
  /** Each file that fits gets a chip and uploads, one too big a chip saying so; what is left over gets one chip between them (F9). */
  function attachFiles(files: readonly File[], pasted: boolean) {
    const now = new Date();
    const start: (() => void)[] = [];
    const over: File[] = [];
    let drawn = 0;
    for (const file of files) {
      const tooBig = file.size > FILE_BYTES;
      if (drawn >= FILE_COUNT || (!tooBig && held.filter((f) => f.state !== 'refused').length >= FILE_COUNT)) { over.push(file); continue; }
      drawn++;
      const name = attachedName(file, pasted, now);
      const id = `file-${++filesMade}`;
      const reason = tooBig ? chatWords.fileIsTooBig(file.size) : undefined;
      held.push({ id, name: fileLabel(name) ?? chatWords.aFile, state: reason ? 'refused' : 'uploading', ...(reason && { reason }) });
      if (!reason) start.push(() => void upload(id, file, name));
    }
    const [only] = over;
    if (over.length === 1 && only) held.push({ id: `file-${++filesMade}`, name: fileLabel(attachedName(only, pasted, now)) ?? chatWords.aFile, state: 'refused', reason: chatWords.tooManyFiles });
    if (over.length > 1) held.push({ id: `file-${++filesMade}`, name: chatWords.moreFiles(over.length), count: over.length, state: 'refused', reason: chatWords.tooManyFilesAtOnce });
    showFiles();
    start.forEach((go) => go());
  }
  function removeFile(id: string) {
    making.get(id)?.();
    making.delete(id);
    held = held.filter((f) => f.id !== id);
    showFiles();
  }
  const onFiles = (e: Event) => {
    const { files, pasted } = (e as CustomEvent<ChatFilesDetail>).detail;
    attachFiles(files, pasted);
  };
  const onFileRemove = (e: Event) => removeFile((e as CustomEvent<ChatFileRemoveDetail>).detail.id);
  /** Read and save one file; what the person's file is called goes with its path, for the sent message's chip. */
  async function upload(id: string, file: File, name: string) {
    const refused = (reason: string) => settle(id, { state: 'refused', reason });
    const data = await fileData(file).catch(() => null); // a folder dropped: its `File` can't be read
    if (data === null) return refused(chatWords.fileCouldNotBeRead);
    try {
      const { file: saved } = await c!.upload({ name, type: file.type, data });
      const label = fileLabel(name);
      settle(id, { state: 'ready', saved: { path: saved.path, ...(label && { label }) } });
      const stop = c?.copies?.(file, saved.path, { save: (body) => c!.upload(body), progress: ({ doing, note, holds }) => settle(id, { doing, note, holds }) });
      if (stop) making.set(id, stop);
    } catch (err) { refused(chatWords.fileRefused((err as Error).message)); }
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
      side.panel.addEventListener(CHAT_FILES_EVENT, onFiles);
      side.panel.addEventListener(CHAT_FILE_REMOVE_EVENT, onFileRemove);
      attach();
      return () => {
        side.panel.removeEventListener(CHAT_CHANGE_EVENT, onChange);
        side.panel.removeEventListener(CHAT_FILES_EVENT, onFiles);
        side.panel.removeEventListener(CHAT_FILE_REMOVE_EVENT, onFileRemove);
        stopMaking();
        c = null;
      };
    },
    refresh: attach,
    chips: () => cards().map(cardChip),
    source,
    attachFiles,
    removeFile,
    files: () => held.flatMap((f) => (f.state === 'ready' && f.saved ? [f.saved] : [])),
    uploading: () => held.some((f) => f.state === 'uploading' || f.holds !== undefined),
    refuseSent(files, pointers) {
      const why = new Map(pointers.flatMap(({ pointer, detail }) => {
        const file = files[Number(/^\/files\/(\d+)$/.exec(pointer)?.[1] ?? -1)];
        return file ? [[file.path, detail] as const] : [];
      }));
      held = held.map(({ saved, ...f }) => {
        const reason = saved && why.get(saved.path);
        return reason ? { ...f, state: 'refused' as const, reason: chatWords.fileRefused(reason) } : { ...f, ...(saved && { saved }) };
      });
      showFiles();
    },
    sent(took, files = []) {
      for (const chip of took) if (chip.kind === 'card') spent.add(chip.ref);
      // A refused file went with that message's chance: only one still uploading, or ready after it left, stays.
      const went = new Set(files.map((f) => f.path));
      held = held.filter((f) => f.state === 'uploading' || (f.saved && !went.has(f.saved.path)));
      stopMaking((id) => held.some((f) => f.id === id));
      drawFiles();
      attach();
    },
    open: (board) => b?.jump(board),
  };
}
