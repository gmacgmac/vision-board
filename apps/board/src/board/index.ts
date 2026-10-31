// The board's one name for a host (`#board`; the plugin's view bundle is built from it, apps/board/plugin/view.ts):
// `mount(root, host)` and the types its contract names (host.ts). A host never imports a path under apps/board.
// `mount` defines the board's custom elements first, once per page, so the one call is all a host makes.
import { defineBoardElements } from '#ui';
import type { MountedBoard } from './mount.ts';
import { mount as mountBoard } from './mount.ts';
import type { BoardHost } from './host.ts';

export type {
  BoardChat, BoardEvent, BoardHost, BoardPage, BoardPageParts, BoardSettings, BoardStore, BoardView, ChatStatus, ChatWork, ConfirmAsk,
} from './host.ts';
export type { MountedBoard } from './mount.ts';

/** The board inside `root`, in `host` (mount.ts). */
export function mount(root: HTMLElement, host: BoardHost): MountedBoard {
  defineBoardElements();
  return mountBoard(root, host);
}
