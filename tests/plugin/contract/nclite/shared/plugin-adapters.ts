/**
 * WHAT NCLITE SUPPLIES THAT A PLUGIN'S MANIFEST LACKS (`docs/plugins.md` § The adapter table): one entry per plugin id,
 * read by the engine's plugin list. Today that is an icon alone. A plugin whose manifest carries everything has no entry.
 */

/** What nclite supplies for a plugin. Every member is optional. */
export interface PluginAdapter {
	/** The icon its manifest lacks: a name from the app's own icon list. */
	icon?: string;
}

/** Every adapter, by plugin id. */
export const ADAPTERS: Readonly<Record<string, PluginAdapter>> = {
	'vision-board': { icon: 'board' },
};

/** The adapter of plugin `id`, or undefined when it has none. */
export function adapterOf(id: string): PluginAdapter | undefined {
	return Object.hasOwn(ADAPTERS, id) ? ADAPTERS[id] : undefined;
}
