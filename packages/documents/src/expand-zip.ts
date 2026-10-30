// A zip expanded in memory: every name checked before a byte is inflated, every byte counted, and all of
// it or none of it. It writes nothing, so a hostile archive that is refused leaves nothing anywhere.
import type { Limits } from './limits.ts';
import { LIMITS } from './limits.ts';
import { refuse } from './refused.ts';
import { zipGuard } from './zip-guard.ts';
import { entryPath } from './zip-names.ts';
import { readEntry } from './zip-read.ts';

/** One file of an expanded archive. `path` has passed `entryPath`; the host still makes it its own. */
export interface ExpandedFile { path: string; bytes: Uint8Array }
export interface ExpandedZip { files: ExpandedFile[]; skipped: number }

/** What a Mac adds to an archive, of no use to a reader. */
const MAC_LITTER = /^(?:__MACOSX\/|(?:.*\/)?\.DS_Store$)/;

export function expandZip(bytes: Uint8Array, limits: Limits = LIMITS): ExpandedZip {
  const entries = zipGuard(bytes, limits);
  const named = entries.map((entry) => {
    const path = entryPath(entry.name);
    if (path === undefined || path.length > limits.pathChars || path.split('/').length > limits.depth) refuse('badName');
    return { entry, path: path! };
  });
  const kept = named.filter(({ entry, path }) => !entry.folder && !MAC_LITTER.test(path));
  const files = kept.map(({ entry, path }) => ({ path, bytes: readEntry(bytes, entry) }));
  return { files, skipped: named.filter(({ entry }) => !entry.folder).length - kept.length };
}
