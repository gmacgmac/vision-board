// The engine bundle's entry (bin/build-plugin.ts): the one name a host imports from `engine/engine.js`. A host gets
// what docs/specification/plugin.md says the engine gives and takes: a ledger already open, `onSend`, and the engine's
// `ledger` and `agents` are the standalone server's, for the parts it runs beside the engine, and are not in the folder.
import type { Engine, EngineOptions } from '../server/engine/index.ts';
import { createEngine as createBoardEngine } from '../server/engine/index.ts';

/** What a host gives. */
export type PluginEngineOptions = Pick<EngineOptions, 'dir' | 'name' | 'warn' | 'flags'>;
/** What a host holds. */
export type PluginEngine = Pick<Engine, 'route' | 'image' | 'resolve' | 'tools' | 'watch'>;

/** The board's engine on the data folder `dir`. */
export function createEngine({ dir, name, warn, flags }: PluginEngineOptions): PluginEngine {
  const { route, image, resolve, tools, watch } = createBoardEngine({ dir, name, warn, flags });
  return { route, image, resolve, tools, watch };
}
