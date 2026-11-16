// Words: format-icons. Why a drawing of the project's icon library is refused: what was found in its path data or
// its file, so whoever made it can fix it.
// Keys: vision-board.format-icons.<name>. Plain code: no imports but other words files and types.

// ---- icon-file.ts (iconPathProblem: one path's `d`)
export const pathEmpty = 'the path data is empty';
export const pathTooLong = (chars: number, max: number): string => `the path data is ${chars} characters long; at most ${max}`;
export const pathChar = (found: string, at: number): string =>
  `the path data holds ${found} at character ${at + 1}; only the path letters MLHVCSQTAZ (either case), digits, ".", ",", "-", "e" and spaces may be used`;
export const pathStart = 'the path data must start with M or m (a move)';
export const pathToken = (found: string, at: number): string => `the path data holds "${found}" at character ${at + 1}, which is not a number or a path letter`;
export const pathNumber = (found: string, max: number): string => `the path data holds the number ${found}; a number in a drawing is at most ${max} either way`;

// ---- icon-file.ts (iconFileProblem: a whole file)
export const fileTooLong = (chars: number, max: number): string => `the file is ${chars} characters long; an icon file is at most ${max}`;
export const fileBom = 'the file starts with a byte-order mark, which the board never writes';
export const fileCr = 'the file holds a carriage return (Windows line ends), which the board never writes';
export const foundElement = (name: string): string => `the element ${name}`;
export const foundAttribute = (name: string, on: string): string => `the attribute ${name} on ${on}`;
export const fileHolds = (found: string): string => `the file holds ${found}; an icon file holds only an svg, an optional title and paths, as the board writes them`;
export const fileForm = 'the file is not in the form the board writes: an svg with the 24 by 24 box, an optional title and paths with only a d';
export const titleEmpty = 'the title is empty';
export const titleChar = (found: string): string => `the title holds ${found}, a control character or an invisible mark`;
export const titleTooLong = (chars: number, max: number): string => `the title is ${chars} characters long; at most ${max}`;
export const tooManyPaths = (count: number, max: number): string => `the drawing has ${count} paths; at most ${max}`;
export const pathAt = (n: number, why: string): string => `path ${n}: ${why}`;
