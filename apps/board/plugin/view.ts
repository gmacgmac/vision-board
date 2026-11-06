// The view bundle's entry (bin/build-plugin.ts): the one name a host imports from `view/board.js`, and the
// one stylesheet it loads (`view/board.css`): the tokens, the board's sheets, then the theme map. The bundle
// carries its own Svelte; a host's is not touched. A host gets what docs/specification/plugin.md says the view
// gives: `MountedBoard.board`, the standalone page's test door, is not in the folder.
import '#tokens/styles.css';
import '../src/styles/sheets.css';
import './theme.css';
import './color-scheme.css';
import type { BoardHost, BoardStatus, BoardView, MountedBoard } from '../src/board/index.ts';
import { mount as mountBoard } from '../src/board/index.ts';
import { flagOf } from '../src/board/host.ts';

/** What a host gives: `BoardHost` without `page`, which is the standalone page's own. */
export type PluginHost = Omit<BoardHost, 'page'>;

/** The fields of the board's status a host may rely on. The status holds more, which a host may read but is not promised. */
export type PluginStatus = Pick<BoardStatus, 'boardId' | 'title' | 'counts' | 'unsaved' | 'chatWork'>;

/** What a host shows of the board: read `now`, hear each change with `on`. */
export interface PluginViewStatus {
  readonly now: Readonly<PluginStatus>;
  /** Hear every change, with what changed; returns the unsubscribe. */
  on(listener: (patch: Partial<PluginStatus>) => void): () => void;
}

/** The view a host holds. */
export type PluginView = BoardView & { readonly status: PluginViewStatus } & Pick<MountedBoard, 'send'>;

/** The root's mark while `hostStyling` is on (read at mount): theme.css lets a host's colours and mode through only
 *  under it. Held equal to theme.css by apps/board/tests/plugin-theme.test.ts. */
const HOST_STYLING = 'data-vb-host-styling';

/** The board inside `root`, in `host`. */
export function mount(root: HTMLElement, host: PluginHost): PluginView {
  const { unmount, unsaved, leave, pageChip, reveal, status, send } = mountBoard(root, host);
  const marked = flagOf(host, 'hostStyling') && !root.hasAttribute(HOST_STYLING);
  if (marked) root.setAttribute(HOST_STYLING, '');
  const off = () => { unmount(); if (marked) root.removeAttribute(HOST_STYLING); };
  return { unmount: off, unsaved, leave, pageChip, reveal, status, send };
}
