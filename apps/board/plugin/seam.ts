// The seam version, the one home of the number (docs/specification/plugin.md § The types and the seam version).
// `seam` in manifest.json is `SEAM`. `SEAM_TYPES` is the hash of the seam's types as `plugin.d.ts` holds them
// (bin/plugin-types.ts `typesHash`, which ignores comments and layout): any change to the types moves it, the build and
// `apps/board/tests/plugin-types.test.ts` fail until it is set to the new one, and setting it is where you decide
// whether the change is breaking. Breaking: raise `SEAM` with it, and say so in the change's log entry.

/** The seam a host implements. Raised by one for each breaking change to the types, never lowered. */
export const SEAM = 1;
/** sha256, in hex, of the seam's types (see above). */
export const SEAM_TYPES = '5a81013547712fade60e7c80977ddb3bbd63f8bbf2333bd650c3a1e3aeec9e46';
/** The types' file in the plugin folder. */
export const TYPES_FILE = 'plugin.d.ts';
