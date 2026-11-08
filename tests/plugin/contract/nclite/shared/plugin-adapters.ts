// NOT A COPY: the one stand-in in this fixture (README.md). nclite's `shared/plugin-adapters.ts` holds what it supplies
// for a plugin; with the board built to the contract, all that is left of the board's entry is its icon (a name in
// nclite's own list) and its stylesheet's scope, `vb` (the contract's manifest has no field for a scope that is not the
// plugin's id). The handover asks nclite to keep
// exactly this entry when it deletes the rest. Only `stylesheet.ts` `checkPluginStylesheet` reads it.
export interface PluginAdapter { icon?: string; css?: { scope: string; reviewedSha256?: string; reads?: readonly string[] } }
const ADAPTERS: Readonly<Record<string, PluginAdapter>> = { board: { icon: 'board', css: { scope: 'vb' } } };
export const adapterOf = (id: string): PluginAdapter | undefined => (Object.hasOwn(ADAPTERS, id) ? ADAPTERS[id] : undefined);
