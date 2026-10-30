// Which names in an archive could land somewhere other than they read. Ported from KiroCrew
// (`src/kiro_crew/portability_archive.py` `_unsafe_member_name`, `_is_link_entry`; Apache-2.0, see this
// package's NOTICE). Changed: rewritten in TypeScript; a backslash always separates; compatibility forms
// are folded first (a fullwidth `．．／` is `../`); control characters, `:` anywhere and device names are
// refused; the mode check also refuses devices, pipes and sockets, and Windows reparse points.
const DEVICE = /^(?:con|prn|aux|nul|com\d|lpt\d)(?:\..*)?$/i;
// eslint-disable-next-line no-control-regex -- control characters are what this looks for.
const CONTROL = /[\u0000-\u001f\u007f]/;
const ONLY_DOTS = /^[.\s]+$/;
const MODE_TYPE = 0xf000;
const REGULAR = 0x8000;
const FOLDER = 0x4000;
const REPARSE_POINT = 0x400;
const HOST_FAT = 0;
const HOST_NTFS = 10;

/** `name` as a `/`-joined path, or undefined when it could escape or means more than it reads. A folder's trailing `/` is left off. */
export function entryPath(name: string): string | undefined {
  const folded = name.normalize('NFKC').replace(/\\/g, '/').replace(/\/$/, '');
  if (!folded || CONTROL.test(folded) || folded.startsWith('/') || folded.includes(':')) return undefined;
  const parts = folded.split('/');
  return parts.every((p) => p && !ONLY_DOTS.test(p) && !DEVICE.test(p)) ? folded : undefined;
}

/** Whether a central-directory record declares anything but a plain file or folder: a link above all. */
export function isLinkEntry(madeBy: number, externalAttributes: number): boolean {
  const type = (externalAttributes >>> 16) & MODE_TYPE;
  if (type !== 0 && type !== REGULAR && type !== FOLDER) return true;
  const host = madeBy >>> 8;
  return (host === HOST_FAT || host === HOST_NTFS) && (externalAttributes & REPARSE_POINT) !== 0;
}
