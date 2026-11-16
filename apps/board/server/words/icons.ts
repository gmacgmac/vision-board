// Words: icons. The project's icon library: why add_icon refuses a drawing or a name, why a library icon can't be used
// (list_icons' problems, a node naming it), and why the person's accept of a changed drawing is refused.
// Keys: vision-board.icons.<name>. Plain code: no imports but other words files and types.

// ---- icons.ts (add_icon: reducing the svg to paths)
const PATHS_ONLY = 'An icon is paths only: an svg holding title and path elements, each path straight in the svg.';
export const svgMarkup = (found: string): string => `The svg holds ${found}. ${PATHS_ONLY} Leave out comments, CDATA, DOCTYPEs and entities.`;
export const svgTag = (found: string): string => `The svg holds a tag the board can't read: ${found}. ${PATHS_ONLY}`;
export const svgElement = (name: string): string =>
  `The svg holds a ${name} element. ${PATHS_ONLY} Draw text, shapes, pictures, gradients and groups as paths, or leave them out.`;
export const svgPlace = (name: string, parent: string): string => `The svg holds a ${name} element inside ${parent}. ${PATHS_ONLY}`;
export const svgAttribute = (attr: string, on: string): string =>
  `The ${on} element has ${attr}. On svg only xmlns, viewBox, width, height, fill and the stroke attributes are taken; on a path only d and those; transforms, styles, links and events are refused.`;
export const svgTwice = (attr: string, on: string): string => `The ${on} element names ${attr} twice.`;
export const svgNamespace = (found: string): string => `The svg's xmlns is ${found}; it must be http://www.w3.org/2000/svg.`;
export const svgBox = (found: string, box: number): string => `The svg's viewBox is ${found}; draw on the built-in set's box, 0 0 ${box} ${box}.`;
export const svgNoBox = (box: number): string => `The svg has no viewBox; draw on the built-in set's box, viewBox="0 0 ${box} ${box}".`;
export const svgText = (found: string): string => `The svg holds text outside a title: ${found}. ${PATHS_ONLY} Draw words as paths, or leave them out.`;
export const svgEntity = (found: string): string => `The title holds ${found}; write the character itself.`;
export const svgRoot = 'The drawing must be one svg element, with its paths inside it.';
export const svgUnclosed = (name: string): string => `The svg's ${name} element is never closed.`;
export const svgNoD = 'A path has no d.';
export const svgNoPath = 'The svg has no path.';
export const svgTooManyPaths = (count: number, max: number): string => `The svg has ${count} paths; an icon has at most ${max}. Join paths that share a stroke into one d.`;
export const svgPath = (n: number, why: string): string => `Path ${n}: ${why}.`;
export const titleRefused = (why: string): string => `The title can't be used: ${why}.`;
export const notTheFixedForm = (why: string): string => `The drawing could not be written in the icon form: ${why}.`;

// ---- icons.ts (add_icon: the name and the key)
export const nameTaken = (name: string): string =>
  `${name} already names another drawing in the project's icon library. Reuse it (list_icons lists it), or pick a more specific name.`;
export const keyUsedBefore = (key: string): string => `The key "${key}" was used before for another icon or another write. Use a new key.`;
export const keyHolds = 'This key was used for other content';

// ---- icons.ts (reading a library file: list_icons' problems, a node's first use)
export const fileMissing = 'its file is not in the icon library';
export const fileNotPlain = 'its file is not a plain file';
export const fileUnreadable = 'its file could not be read';
export const fileTooBig = (bytes: number, max: number): string => `its file is ${bytes} bytes; at most ${max}`;
export const fileNotUtf8 = 'its file is not UTF-8 text';
export const fileRefused = (why: string): string => `its file is refused: ${why}`;
export const fileChanged = 'its file changed since the ledger took it: put the file back, or the person accepts the new drawing';

// ---- write-board.ts (a node's first use of a library icon)
export const nodeIconRefused = (name: string, why: string): string =>
  `node.icon: "${name}" is not in the icon library as the board can draw it (${why}). Add it with add_icon, or use one list_icons names.`;

// ---- icons.ts (the person accepts a changed drawing)
export const cannotAccept = (name: string, why: string): string => `${name} can't be accepted: ${why}.`;
