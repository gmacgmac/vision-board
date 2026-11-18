// Types for build.mjs, which the plugin build and the tests import from TypeScript.
export type Build = 'standalone' | 'plugin';
export declare const SOURCE: string;
export declare const BUILDS: readonly Build[];
export declare const SKILL_FILE: Readonly<Record<Build, string>>;
export declare const STANDALONE_DIR: string;
/** Every slot's text per build, from differences.md. */
export declare function differences(text: string): Record<string, Record<Build, string>>;
/** `text` with each slot filled for `build`, and the slots it filled. */
export declare function fill(text: string, slots: Record<string, Record<Build, string>>, build: Build, file: string): { text: string; seen: Set<string> };
/** One build: its files by path in the build's folder (the skill, then each reference its text names). */
export declare function buildSkill(build: Build, source?: string): Record<string, string>;
/** Slots no file fills and references no build ships. */
export declare function unused(source?: string): string[];
/** Files of the standalone build that differ from what is on disk. */
export declare function stale(dir?: string): string[];
/** Write the standalone build into its folder. */
export declare function writeStandalone(dir?: string): string[];
