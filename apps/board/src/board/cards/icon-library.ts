// The project's icon library on the page (decision 24, planner's call 11): read with `list_icons` and
// `paths` when a ledger opens and again when an `icon` line arrives, and passed to the node, which draws a library
// icon only from these paths and checks each again as it draws (packages/ui icon.ts `icon`). A missing or failing
// icon draws the plain tile; nothing on the board waits for the read, and a read that fails keeps what was there.
import type { OperationOutput } from '#format';
import type { IconLibrary } from '#ui';
import { iconLibrary } from '#ui';

export interface IconLibraryDeps {
  load(): Promise<OperationOutput<'list_icons'>>;
  /** The library changed: the nodes that name a library icon draw again. */
  changed(library: IconLibrary): void;
}

export interface IconLibraryFlow {
  /** The library as last read (empty before the first read). */
  get(): IconLibrary;
  /** Read it again (a ledger opened, an `icon` line arrived). */
  refresh(): Promise<void>;
}

/** Whether two libraries hold the same drawings. */
const same = (a: IconLibrary, b: IconLibrary): boolean =>
  a.size === b.size && [...a].every(([name, paths]) => JSON.stringify(b.get(name)) === JSON.stringify(paths));

export function createIconLibrary(d: IconLibraryDeps): IconLibraryFlow {
  let library: IconLibrary = new Map();
  /** Reads overlap when lines come fast: only the latest one's answer counts. */
  let asked = 0;
  return {
    get: () => library,
    async refresh() {
      const ask = ++asked;
      const read = await d.load().catch(() => null);
      if (!read || ask !== asked) return;
      const next = iconLibrary(read.library);
      if (same(next, library)) return;
      library = next;
      d.changed(library);
    },
  };
}
