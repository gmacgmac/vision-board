// The view bundle's entry (bin/build-plugin.ts): the one name a host imports from `view/board.js`, and the
// one stylesheet it loads (`view/board.css`): the tokens, the board's sheets, then the theme map. The bundle
// carries its own Svelte; a host's is not touched. A host gets what docs/specification/plugin.md says the view
// gives: `MountedBoard.board`, the standalone page's test door, is not in the folder.
import '#tokens/styles.css';
import '../src/styles/sheets.css';
import './theme.css';
import type { BoardHost, BoardView, MountedBoard } from '../src/board/index.ts';
import { mount as mountBoard } from '../src/board/index.ts';

/** The view a host holds. */
export type PluginView = BoardView & Pick<MountedBoard, 'status' | 'send'>;

/** The board inside `root`, in `host`. */
export function mount(root: HTMLElement, host: BoardHost): PluginView {
  const { unmount, unsaved, leave, pageChip, reveal, status, send } = mountBoard(root, host);
  return { unmount, unsaved, leave, pageChip, reveal, status, send };
}
