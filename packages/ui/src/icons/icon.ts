// One way to draw an icon by name (D-100 3, decision 24): a built-in or a mark from the icon set (icon-set.ts), or a
// name from the project's library (`x-…`), whose checked path data the page passes in from `list_icons` with `paths`
// (FE_02 loads it). A library drawing is checked again here with BE_04's `iconPathProblem`, and drawn as `path`
// elements this code builds, with the built-in set's stroke: never a file's text. A library name that is missing, or
// a drawing with a path that fails, draws nothing, so its tile is the plain tile. Pure: the server and the element
// build the same markup.
import type { OperationOutput } from '#format';
import { ICON_BOX, ICON_LIMITS, iconPathProblem, isLibraryIcon } from '#format';
import { esc } from '../markdown/inline.ts';
import { svgIcon } from '../node/node-icons.ts';
import type { MarkIcon } from './icon-set.ts';
import { ICONS } from './icon-set.ts';

/** One icon of the project's library as `list_icons` gives it (`paths` only when asked). */
export type LibraryIcon = OperationOutput<'list_icons'>['library'][number];

/** The library's drawings the page holds: a name to its `d` strings. */
export type IconLibrary = ReadonlyMap<string, readonly string[]>;

/** The page's library from a `list_icons` reply's `library`: each icon with paths. Checked again when drawn. */
export const iconLibrary = (list: readonly LibraryIcon[]): IconLibrary =>
  new Map(list.flatMap((i) => (i.paths ? [[i.name, i.paths] as const] : [])));

/** The path data `name` draws with, or undefined: an unknown name, a library name the library lacks, or a library
 *  drawing that fails the check (too many paths, or one path outside the grammar). */
export function iconPaths(name: string, library?: IconLibrary): readonly string[] | undefined {
  if (isLibraryIcon(name)) {
    const paths = library?.get(name);
    const ok = paths && paths.length > 0 && paths.length <= ICON_LIMITS.paths && paths.every((d) => iconPathProblem(d) === undefined);
    return ok ? paths : undefined;
  }
  return Object.hasOwn(ICONS, name) ? ICONS[name as MarkIcon] : undefined;
}

/** Icon `name` as an inline SVG of class `vb-icon` and `cls`, hidden from assistive tech (what holds it carries the
 *  name); empty when it has no drawing (`iconPaths`). */
export function icon(name: string, cls: string, library?: IconLibrary): string {
  const paths = iconPaths(name, library);
  return paths ? svgIcon(paths.map((d) => `<path d="${esc(d)}"/>`).join(''), ICON_BOX, `vb-icon ${cls}`) : '';
}
