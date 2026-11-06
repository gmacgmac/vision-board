// The types of palettes.js, the fake host's looks, for the specs that read them.
export declare const PALETTE_NAMES: string[];
/** Every property of palette `name` in `mode`, by its name less `--host-`. */
export declare function palette(name: string, mode: 'light' | 'dark'): Record<string, string>;
/** Dress `root` in palette `name` (none: the board's own) and force `mode` (none: the system's). */
export declare function dress(root: HTMLElement, name?: string | null, mode?: 'light' | 'dark' | null): void;
/** The palette page's two selects in `bar`; `set` chooses both and dresses every board root. */
export declare function paletteSwitcher(bar: HTMLElement): { set(name?: string | null, mode?: 'light' | 'dark' | null): void };
