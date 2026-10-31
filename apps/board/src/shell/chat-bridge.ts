// The bridge between the chat panel and the board (chat-panel FE_02 ruling 3, D-037; D-074): the
// standalone chat as the board's host sees it (`host`, board/host.ts `BoardChat`), and the board as the
// chat sees it (`board`, only its `BoardView.reveal`). It goes through nothing else, so what works here
// works in any host. Board to chat: the board attaches its live chips, the selected cards and the
// person's answers since its last Send, and the composer shows them as one chip, "3 answers · 2
// selected" (composer-one-chip ruling 1), opening a preview of exactly that text, the chips' own
// (packages/actions `selectionChip`, `answersChip`), the writer the server's prompt uses (ruling 2).
// There is no chip per card: to leave one out, deselect it; the selection a message carried is spent
// until its `ref` changes. Notes are among the answers, so they are no chips: a note goes once, as its
// answer (chat-no-double-note ruling 2). Chat to board: a change chip zooms to its cards and selects
// nothing, so nothing goes with the next message, opening their board first when it is another one; a
// changed card's stepper links to the board write in the chat that last changed it (`host.reveal`); a
// chat in the folder's first board opens when drawn (`open`, panel-send ruling 2). The board side
// attaches from the page, the chat side from the sidebar (chat-panel.ts); each detaches on its own.
// It also holds the files attached to the next message (D-068 ruling 6: the composer takes them, the host
// uploads): each goes up as it comes, its chip saying so, then ready with its path or refused with why;
// the limits are checked here first and by the server again. Once ready, a PDF's pages and a big picture's fitted
// copy are made (`ChatSide.copies`, pdf-pages.ts, D-071), which never holds Send. The pure parts are unit-tested under Node.
import type { Chip as BoardChip } from '#actions';
import type {
  ChangeEntry, ChatChangeDetail, ChatComposerElement, ChatFileRemoveDetail, ChatFilesDetail, ChatState, Chip, ComposerContext, ComposerFile,
} from '#chat';
import { CHAT_CHANGE_EVENT, CHAT_FILE_REMOVE_EVENT, CHAT_FILES_EVENT } from '#chat';
import type { OperationInput, OperationOutput, PointerError } from '#format';
import type { BoardChat, BoardView, ChatStatus } from '../board/host.ts';
import { FILE_BYTES, FILE_COUNT, attachedName, fileData, fileLabel } from './attached-file.ts';
import type { MakeCopies } from './pdf-pages.ts';
import * as chatWords from './words/chat.ts';

/** One file the next message may carry: its body's item. */
export type MessageFile = NonNullable<OperationInput<'send_chat'>['body']['files']>[number];
export type AttachFileBody = OperationInput<'attach_chat_file'>['body'];

/** The composer's one chip for what the board attached: "3 answers · 2 selected" (either part alone),
 *  opening to exactly what the next message carries from the board: the selected cards, then the
 *  answers, a blank line apart as `boardBlocks` writes them. None when there is nothing. */
export function composerContext(chips: readonly BoardChip[]): ComposerContext | null {
  if (!chips.length) return null;
  const answers = chips.filter((c) => c.kind === 'answers');
  const rest = chips.filter((c) => c.kind !== 'answers');
  return { label: [...answers, ...rest].map((c) => c.label).join(' · '), text: [...rest, ...answers].map((c) => c.preview ?? '').filter(Boolean).join('\n\n') };
}

/** The selection a message carries, as its chips: the body's `cards`. */
export const cardChips = (cards: readonly number[]): Chip[] => cards.map((n) => ({ kind: 'card', ref: n, label: chatWords.card(n) }));

/** The board write in the chat that last changed card `n` on `board`. */
export const lastChange = (s: ChatState, board: string, n: number): ChangeEntry | undefined =>
  s.entries.findLast((e): e is ChangeEntry => e.type === 'change' && e.board === board && e.cards.includes(n));

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
  /** What the board reads of the chat (`BoardChat.status`). */
  status(): Pick<ChatStatus, 'now' | 'agent' | 'held' | 'staged'>;
  /** The board's Send: with the board's session and something attached, the message with no words; else `record`. */
  send(record: () => Promise<string | null>): Promise<string | null>;
  /** What is attached changed. */
  changed(): void;
  /** Open the sidebar at feed entry `key`. */
  reveal(key: string): void | Promise<void>;
}

export interface ChatBridge {
  /** The standalone chat as the board's host gives it (`BoardHost.chat`). */
  readonly host: BoardChat;
  /** The board as the chat reaches it: its view's `reveal`, and nothing else. */
  board(view: Pick<BoardView, 'reveal'>): () => void;
  chat(side: ChatSide): () => void;
  /** The board was drawn: the panel draws again. */
  refresh(): void;
  /** The chat's side changed what `status` reads: the board hears when it differs. */
  statusChanged(): void;
  /** The selected cards the next message carries, as its chips. */
  chips(): Chip[];
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
  let v: Pick<BoardView, 'reveal'> | null = null;
  let c: ChatSide | null = null;
  /** What the board attached, by key. */
  const attached = new Map<string, BoardChip>();
  /** The `ref` of the selection a message already took, as text: spent until the selection's `ref` differs. */
  let spent: string | null = null;
  const refText = (chip: BoardChip | undefined) => JSON.stringify(chip?.ref ?? null);
  const selection = () => [...attached.values()].find((x) => x.kind === 'selection');
  /** What the next message carries from the board. */
  const staged = () => [...attached.values()].filter((x) => x.kind !== 'selection' || refText(x) !== spent);
  /** Who hears the status, and what it last said as text. */
  const hearing = new Set<() => void>();
  let said = '';
  const statusNow = () => c?.status() ?? { now: 'idle' as const, staged: false };
  function statusChanged() {
    const text = JSON.stringify(statusNow());
    if (text === said) return;
    said = text;
    for (const l of hearing) l();
  }
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

  function attach() {
    if (!c) return;
    const context = composerContext(staged());
    const key = JSON.stringify(context);
    if (key !== shown) { shown = key; c.composer.setContext(context); }
    c.changed();
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
    v?.reveal({ board, cards });
  };

  const host: BoardChat = {
    attach(key, chip) {
      if (chip) attached.set(key, chip); else attached.delete(key);
      if (spent !== null && refText(selection()) !== spent) spent = null;
      attach();
    },
    send: (record) => (c ? c.send(record) : record()),
    status: {
      get now() { return statusNow().now; },
      get agent() { return statusNow().agent; },
      get held() { return statusNow().held; },
      get staged() { return statusNow().staged; },
      on(listener) {
        hearing.add(listener);
        return () => { hearing.delete(listener); };
      },
    },
    reveal({ board, n }) {
      const entry = c && lastChange(c.state(), board, n);
      if (entry) void c!.reveal(entry.key);
    },
    hasLine: ({ board, n }) => !!c && !!lastChange(c.state(), board, n),
  };

  return {
    host,
    board(view) {
      v = view;
      return () => { v = null; };
    },
    chat(side) {
      c = side;
      shown = 'null';
      side.panel.addEventListener(CHAT_CHANGE_EVENT, onChange);
      side.panel.addEventListener(CHAT_FILES_EVENT, onFiles);
      side.panel.addEventListener(CHAT_FILE_REMOVE_EVENT, onFileRemove);
      attach();
      statusChanged();
      return () => {
        side.panel.removeEventListener(CHAT_CHANGE_EVENT, onChange);
        side.panel.removeEventListener(CHAT_FILES_EVENT, onFiles);
        side.panel.removeEventListener(CHAT_FILE_REMOVE_EVENT, onFileRemove);
        stopMaking();
        c = null;
        statusChanged();
      };
    },
    refresh: attach,
    statusChanged,
    chips() {
      const chip = selection();
      return chip?.kind === 'selection' && refText(chip) !== spent ? cardChips(chip.ref.cards) : [];
    },
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
      if (took.some((chip) => chip.kind === 'card')) spent = refText(selection());
      // A refused file went with that message's chance: only one still uploading, or ready after it left, stays.
      const went = new Set(files.map((f) => f.path));
      held = held.filter((f) => f.state === 'uploading' || (f.saved && !went.has(f.saved.path)));
      stopMaking((id) => held.some((f) => f.id === id));
      drawFiles();
      attach();
    },
    open: (board) => v?.reveal({ board }),
  };
}
