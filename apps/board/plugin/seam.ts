// The seam version, the one home of the number (docs/specification/plugin.md § The types and the seam version).
// `seam` in manifest.json is `SEAM`. `SEAM_TYPES` is the hash of the seam's types as `plugin.d.ts` holds them
// (bin/plugin-types.ts `typesHash`, which ignores comments and layout): any change to the types moves it, the build and
// `apps/board/tests/plugin-types.test.ts` fail until it is set to the new one, and setting it is where you decide
// whether the change is breaking. Breaking: raise `SEAM` with it, and say so in the change's log entry.

/** The seam a host implements. Raised by one for each breaking change to the types, never lowered. 2: the host
 *  contract's shapes (plugin.md § The types and the seam version, Seam 2). */
export const SEAM = 2;
/** sha256, in hex, of the seam's types (see above). */
export const SEAM_TYPES = '4937e920c33efec907f929002ae8ca62b15d6c91891de6ada761b4dc4fdefb80';
/** The types' file in the plugin folder. */
export const TYPES_FILE = 'plugin.d.ts';
