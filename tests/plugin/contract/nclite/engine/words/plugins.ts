/**
 * WHAT A PERSON READS WHEN A BUNDLED PLUGIN IS LEFT OUT (`checkManifest`, `engine/plugins/manifest.ts`;
 * `loadRegistry`, `engine/plugins/registry.ts`) and when the vendoring script stops (`scripts/plugin-vendor.ts`).
 * Each line names the file or field to fix, so the person can act on it.
 *
 * Words only. What is checked, and in what order, stays in the files that check it.
 */

export const PLUGIN_WORDS = {
	manifest: {
		notObject: 'manifest.json is not an object.',
		notJson: 'manifest.json is missing or is not JSON.',
		idForm: 'id must be lowercase letters, digits and hyphens, starting with a letter.',
		idFolder: (id: string, folder: string): string => `id ${id} must match its folder, ${folder}.`,
		wordsKey: (field: string): string => `${field} must be a words key (a non-empty string).`,
		version: 'version must be a non-empty string.',
		seamForm: 'seam must be a whole number from 1.',
		moduleBlock: (field: string): string => `${field} must be { module, export }, with module a file inside the plugin and export a name.`,
		stylesList: 'view.styles must be a list of files inside the plugin.',
		notList: (field: string): string => `${field} must be a list.`,
		notAnObject: (at: string): string => `${at} is not an object.`,
		chipShape: (at: string): string => `${at} must be { kind, words }.`,
		duplicate: (at: string, name: string): string => `${at} repeats ${name}.`,
		toolName: (at: string): string => `${at}.name must be lowercase letters, digits and single underscores, starting with a letter.`,
		toolWords: (at: string): string => `${at}.words must be a words key.`,
		toolWrites: (at: string): string => `${at}.writes must be true or false.`,
		toolInput: (at: string): string => `${at}.input must be a JSON Schema object with a type.`,
		fileInside: (field: string): string => `${field} must be a file inside the plugin.`,
		fileMissing: (field: string, path: string): string => `${field} names ${path}, which is not in the folder.`,
		icon: 'icon must be a non-empty string.',
		scopeForm: 'scope must be 2 to 16 lowercase letters and digits, starting with a letter.',
		/** The plugin's scope (its manifest's `scope`, else its id) is one of the app's own, or sits under one. */
		scopeReserved: (scope: string, reserved: string): string =>
			`The stylesheet scope ${scope} is the app’s own (${reserved}). Give the manifest a scope of its own.`,
		settingKey: (at: string): string => `${at}.key must be lowercase letters, digits and hyphens.`,
		settingWords: (at: string): string => `${at}.words must be a words key.`,
		settingOptions: (at: string): string => `${at}.options must list two or more.`,
		settingDefault: (at: string): string => `${at}.default must be one of its options.`,
		settingSwitch: (at: string): string => `${at}.default must be true or false.`,
		settingType: (at: string): string => `${at}.type must be choice or switch.`,
		changeWords: (at: string, id: string): string => `${at} must be a words key of this plugin, starting ${id}.`,
	},
	registry: {
		/** A folder whose id has no row in nclite's plugin table (`PLUGIN_POLICIES`). */
		noRow: (id: string): string =>
			`${id} is not a plugin this nclite knows, so it is left out. A new plugin needs its own row in nclite’s plugin table, added in a reviewed change.`,
		/** `theirs` is the plugin's seam, `ours` the one this nclite is built for. */
		seam: (theirs: number, ours: number): string =>
			`This plugin is built for seam ${theirs}; this nclite is built for seam ${ours}. Vendor a build of the plugin for seam ${ours}, or update nclite to a version built for seam ${theirs}.`,
		provenanceMissing: 'provenance.json is missing or is not JSON, so the build cannot be traced to its source.',
		provenanceShape: 'provenance.json must hold id, repo, commit, seam, builtAt and files, the sha256 of every file in the folder.',
		/** A record from before every file was hashed: five named hashes, no `files`. */
		provenanceOld: (id: string): string =>
			`provenance.json is in the older shape, which does not name every file. Upgrade it with node scripts/plugin-vendor.ts --upgrade-record ${id}.`,
		provenanceId: (id: string, folder: string): string => `provenance.json names ${id}, not its folder, ${folder}.`,
		provenanceSeam: (theirs: number, ours: number): string => `provenance.json records seam ${theirs}, but manifest.json says seam ${ours}.`,
		/** The record's sha256 is not the one the plugin's row pins (`provenanceSha256`): a folder edited and its record made again. */
		provenancePin: (id: string): string =>
			`provenance.json is not the record nclite’s plugin table pins for ${id}, so the folder is not the reviewed build. Vendor it again with scripts/plugin-vendor.ts, then pin the record it prints in a reviewed change.`,
		/** Two plugins whose stylesheet scopes overlap: the later folder, by name, is left out. */
		scopeTaken: (scope: string, other: string, otherScope: string): string =>
			`The stylesheet scope ${scope} overlaps ${other}’s (${otherScope}), so one could restyle the other. Give one manifest a scope of its own.`,
		fileUnreadable: (path: string): string => `${path} could not be read.`,
		shaDiffers: (path: string): string => `${path} differs from the build recorded in provenance.json. Vendor it again with scripts/plugin-vendor.ts.`,
		fileNotRecorded: (path: string): string => `${path} is in the folder but not in provenance.json, so it is not part of the recorded build. Vendor it again with scripts/plugin-vendor.ts.`,
		fileGone: (path: string): string => `${path} is recorded in provenance.json but is not in the folder. Vendor it again with scripts/plugin-vendor.ts.`,
		notPlain: (path: string): string => `${path} is not a plain file or folder (a link, for example), so the folder is left out.`,
		/** `bytes` is the skill's size, `budget` the most its row allows. */
		skillOverBudget: (path: string, bytes: number, budget: number): string =>
			`${path} is ${bytes} bytes, over this plugin’s budget of ${budget}. The bot reads it every turn, so the plugin must ship a shorter one.`,
		/** One stylesheet's problem: `problem` is one of {@link PLUGIN_WORDS.stylesheet}. */
		stylesheet: (path: string, problem: string): string => `${path}: ${problem}`,
	},
	/** What the stylesheet check finds (`checkStylesheet`, `engine/plugins/stylesheet.ts`), each naming the rule and what broke it. */
	stylesheet: {
		selector: (selector: string, scope: string): string =>
			`the selector ${selector} must begin with .${scope}, a class starting .${scope}- or an element starting ${scope}-, with no :is, :where, :not or :has before its first space.`,
		root: (property: string, scope: string): string => `:root may declare only --${scope}-* properties, not ${property}.`,
		atRule: (name: string): string => `@${name} is not allowed; only @media, @supports, @container, @property and @keyframes are.`,
		named: (atRule: string, name: string, scope: string): string => `@${atRule} ${name} must be named with the plugin’s own prefix, --${scope}- or ${scope}-.`,
		importRule: '@import is not allowed: a plugin’s styles are the files its manifest names.',
		url: (address: string): string => `url(${address}) must be a data: address; a plugin’s stylesheet loads nothing from elsewhere.`,
		variable: (property: string, scope: string): string =>
			`var(${property}) reads a property that is not a --host-* one, not --${scope}-* and not declared in the sheet, so it would read the app’s own.`,
		unbalanced: 'its braces do not balance, so it cannot be checked.',
		more: (count: number): string => `and ${count} more like these.`,
	},
	vendor: {
		usage: 'Usage: node --experimental-strip-types scripts/plugin-vendor.ts <source-repo> <commit>',
		commitForm: (commit: string): string => `${commit} is not a full commit hash (40 hex digits). Name the exact commit to vendor.`,
		manifestRefused: (problems: string): string => `The built folder’s manifest is refused: ${problems}`,
		notPlain: (path: string): string => `${path} in the build is not a plain file or folder (a link, for example), so it is not vendored.`,
		differs: (id: string, commit: string): string =>
			`plugins/${id}/ is already vendored from ${commit}, but this build’s bytes differ. Nothing was changed. Find out why the build is not repeatable before vendoring.`,
		done: (id: string, commit: string): string => `Vendored plugins/${id}/ from ${commit}.`,
		same: (id: string, commit: string): string => `plugins/${id}/ already holds the build of ${commit}. The bytes are unchanged.`,
		upgraded: (id: string): string => `The record in plugins/${id}/provenance.json now names every file. No other file changed.`,
		/** After a vendor or an upgrade: the pin its row of the plugin table must carry before the registry loads the folder. */
		pin: (id: string, sha: string): string => `Pin plugins/${id}/provenance.json in its row of PLUGIN_POLICIES (engine/plugins/policies.ts): provenanceSha256: '${sha}'.`,
		upgradeUsage: 'Usage: node --experimental-strip-types scripts/plugin-vendor.ts --upgrade-record <plugin-id>',
		upgradeCurrent: (id: string): string => `plugins/${id}/provenance.json already names every file. Nothing was changed.`,
		upgradeDiffers: (id: string, path: string): string =>
			`plugins/${id}/${path} is not the bytes its older record names, so the record cannot be upgraded in place. Nothing was changed. Vendor the plugin again from its commit.`,
		/** `problems` are the registry's sentences for the built folder. */
		buildRefused: (problems: string): string => `The build is refused, and nothing was changed: ${problems}`,
	},
};
