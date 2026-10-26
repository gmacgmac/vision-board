// The open folder as a name and a path (current-folder task): pure, so the toolbar chip, the "⋯"
// menu line and the folder dialog read it from one place, and a unit test can load it (folder.ts
// pulls in the page's state).
import type { FolderInfo } from './io.ts';

/** The folder's own name: the last part of its path. */
export const folderName = (f: Pick<FolderInfo, 'path' | 'name'>): string => f.path.split('/').filter(Boolean).at(-1) ?? f.name;

/** The folder's whole path as a person reads it: the server's `name`, the home folder as `~`
 * (`displayName`, server/folders.ts), or the absolute path outside it. */
export const folderPath = (f: Pick<FolderInfo, 'path' | 'name'>): string => f.name;

/** `path` shortened to its first and last parts joined by "…" when it is longer than `max`
 * characters and the elision makes it shorter; else whole. `~/Library/Work/atlas` → `~/…/atlas`. */
export function elidePath(path: string, max: number): string {
  if (path.length <= max) return path;
  const parts = path.split('/');
  const first = parts[0] === '' ? `/${parts[1] ?? ''}` : parts[0]!;
  const last = parts.at(-1)!;
  const eliding = parts.length > (parts[0] === '' ? 3 : 2);
  const short = `${first}/…/${last}`;
  return eliding && short.length < path.length ? short : path;
}
