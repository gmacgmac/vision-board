// What the selection bar's extra commands do (nodeEdges flag, D-099 9, FE_06): Bookmark all, Save for later and Width,
// each on every selected node, one act per node through the one sender (`run`: the acts side by side, drawn once). The
// commands themselves, their words and keys are rows of the board's command table (input/commands.ts); this only acts.
// Width opens the same list as Move to (move-menu.ts), under the bar. A node with no number takes none (an agent's
// drawing without one), and an app card takes no width (its panel has its own size).
import type { ActSize, View } from '#format';
import { ACT_SIZES } from '#format';
import type { BoardState } from '#actions';
import type { StageBox } from '#ui';
import type { ActFields } from '../io.ts';
import { bookmarkAct, sizeAct } from '../cards/index.ts';
import type { MoveMenu } from './move-menu.ts';
import { createMoveMenu } from './move-menu.ts';
import type { Moves } from './moves.ts';
import * as commandsWords from '../words/commands.ts';

export interface BarActsDeps {
  stage: HTMLElement;
  view(): View;
  state(): BoardState;
  /** Send the steps as one batch, drawn once (sender.ts). */
  run(steps: ActFields[][]): Promise<boolean>;
  moves: Pick<Moves, 'saveLater'>;
  toast(text: string): void;
}

export interface BarActs {
  /** Whether every numbered node among `ids` is bookmarked (Bookmark all then removes them). */
  allBookmarked(ids: readonly string[]): boolean;
  bookmarkAll(ids: readonly string[]): Promise<void>;
  saveForLater(ids: readonly string[]): Promise<void>;
  /** The width list for `ids`, under `anchor` (stage pixels). */
  width(ids: readonly string[], anchor: StageBox): void;
  readonly menu: MoveMenu;
}

export function createBarActs(d: BarActsDeps): BarActs {
  const numbered = (ids: readonly string[]) => d.view().nodes.filter((n) => ids.includes(n.id) && n.n !== undefined);
  const allBookmarked = (ids: readonly string[]) => {
    const on = numbered(ids);
    return on.length > 0 && on.every((n) => d.state().bookmarks.has(n.id));
  };
  let widthOf: readonly string[] = [];
  const menu = createMoveMenu({
    stage: d.stage,
    pick(size) {
      const ids = numbered(widthOf).filter((n) => n.kind !== 'app').map((n) => n.id);
      if (!ids.length) return;
      void d.run([ids.map((id) => sizeAct(id, size as ActSize))]).then((ok) => { if (ok) d.toast(commandsWords.widthSet(ids.length, commandsWords.widthRow(size))); });
    },
  });
  return {
    menu,
    allBookmarked,
    async bookmarkAll(ids) {
      const remove = allBookmarked(ids);
      // Adding takes only the nodes without one, so a press never undoes a bookmark the person already made.
      const on = numbered(ids).filter((n) => d.state().bookmarks.has(n.id) === remove);
      if (!on.length) return;
      if (await d.run([on.map((n) => bookmarkAct(n.id, remove))])) d.toast(remove ? commandsWords.bookmarksRemoved(on.length) : commandsWords.nodesBookmarked(on.length));
    },
    async saveForLater(ids) {
      const saved = await d.moves.saveLater(numbered(ids).map((n) => n.id));
      d.toast(saved ? commandsWords.nodesSavedForLater(saved) : commandsWords.noneCanBeSavedForLater);
    },
    width(ids, anchor) {
      widthOf = ids;
      menu.show(ids.length, ACT_SIZES.map((s) => ({ id: s, title: commandsWords.widthRow(s), name: commandsWords.widthName(s) })), anchor, commandsWords.widthOf(ids.length));
    },
  };
}
