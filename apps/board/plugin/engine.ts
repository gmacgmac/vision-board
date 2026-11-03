// The engine bundle's entry (bin/build-plugin.ts): the one name a host imports from `engine/engine.js`. A host gets
// what docs/specification/plugin.md says the engine gives and takes: a ledger already open, `onSend`, and the engine's
// `ledger` and `agents` are the standalone server's, for the parts it runs beside the engine, and are not in the folder.
import type { Engine, EngineOptions } from '../server/engine/index.ts';
import { createEngine as createBoardEngine } from '../server/engine/index.ts';

/** What a host gives. `flags` holds the flags the engine reads itself (svgImages, for `image`; botToolRules, for its tools,
 * reads and keys); each one not given is at its default. Names are strings here, so a new flag is not a change to the seam
 * (D-078): a name the engine does not know is ignored. */
export type PluginEngineOptions = Pick<EngineOptions, 'dir' | 'name' | 'warn'> & {
  flags?: Record<string, boolean> | undefined;
  /** True while the board is open read-only (D-085), asked on every call, so the host flips it in place. Every write, the
   *  person's and the bot's, answers the problem `read-only` and writes nothing in `dir`; every read says `readOnly: true`.
   *  Left out: never read-only, as before. */
  readOnly?: (() => boolean) | undefined;
};
/** What a host holds. */
export type PluginEngine = Pick<Engine, 'route' | 'image' | 'resolve' | 'tools' | 'watch'>;

/** The board's engine on the data folder `dir`. */
export function createEngine({ dir, name, warn, flags, readOnly }: PluginEngineOptions): PluginEngine {
  // `readOnly` is passed as it came: the compiler holds its shape to the engine's own option (`EngineOptions.readOnly`).
  const { route, image, resolve, tools, watch: changes, ledger } = createBoardEngine({ dir, name, warn, flags, readOnly });
  /** Every change, and a ledger file replaced (a sync, a copy dropped in) as one with head 0: the view reads it from the
   * start (`live.ts`), as standalone's page does on its stream's `reset`. */
  const watch: PluginEngine['watch'] = (onChange) => {
    const stop = changes(onChange);
    const off = ledger.onReset(() => onChange({ head: 0 }));
    return () => { off(); stop(); };
  };
  return { route, image, resolve, tools, watch };
}
