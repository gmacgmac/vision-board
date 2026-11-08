// NOT A COPY: the one stand-in in this fixture (README.md). nclite's `shared/plugin-adapters.ts` holds what it supplies
// for a plugin; with the board built to the contract, all that is left of its entry is its icon, a name in nclite's own
// list (its stylesheet's scope is the manifest's `scope`). The handover asks nclite to keep exactly this entry when it
// deletes the rest. Only `stylesheet.ts` `checkPluginStylesheet` reads it, for `reads` and a waiver the board has neither of.
export interface PluginAdapter { icon?: string; css?: { scope?: string; reviewedSha256?: string; reads?: readonly string[] } }
const ADAPTERS: Readonly<Record<string, PluginAdapter>> = { 'vision-board': { icon: 'board' } };
export const adapterOf = (id: string): PluginAdapter | undefined => (Object.hasOwn(ADAPTERS, id) ? ADAPTERS[id] : undefined);
