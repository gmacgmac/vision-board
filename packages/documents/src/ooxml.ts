// An Office file as what it is, an archive of parts: read by name, so no entry's name reaches a path,
// each part through the guard and the count. Part names and relationship targets are checked as the
// file's own words: a target that climbs out of the archive, or an external one, is never followed.
import type { Limits } from './limits.ts';
import { refuse } from './refused.ts';
import { childrenNamed, decodeXml, xmlTree } from './xml.ts';
import type { ZipEntry } from './zip-guard.ts';
import { zipGuard } from './zip-guard.ts';
import { readEntry } from './zip-read.ts';

const OFFICE_DOCUMENT = /\/officeDocument$/;
/** The old compound-file format: what a password-protected Office file, a `.doc` or an `.xls` is. */
const OLE_SIGNATURE = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];

export interface OoxmlRelationship { type: string; target: string; external?: boolean }

export interface OoxmlPackage {
  names(): string[];
  has(part: string): boolean;
  bytes(part: string): Uint8Array;
  /** The part as a text, or undefined when the archive has none. */
  text(part: string): string | undefined;
  /** The part's relationships by id: each target a part name inside the archive, or, marked `external`, the file's own words for somewhere else, never followed. */
  relationships(part: string): Map<string, OoxmlRelationship>;
  /** The real size the archive declares for the part; 0 when it has none. */
  sizeOf(part: string): number;
  /** The main part the package itself names, else `fallback`, which must be there. */
  main(fallback: string): string;
}

/** `target` from `part`'s folder as a part name, or undefined when it climbs out of the archive. */
function resolveTarget(part: string, target: string): string | undefined {
  const parts = target.startsWith('/') ? [] : part.split('/').slice(0, -1);
  for (const p of target.split('/')) {
    if (p === '..') { if (parts.length === 0) return undefined; parts.pop(); }
    else if (p && p !== '.') parts.push(p);
  }
  return parts.join('/');
}

export function openPackage(file: Uint8Array, limits: Limits): OoxmlPackage {
  if (OLE_SIGNATURE.every((b, i) => file[i] === b)) refuse('protected');
  const parts = new Map<string, ZipEntry>(zipGuard(file, limits).map((e) => [e.name.toLowerCase(), e]));
  const bytes = (part: string) => {
    const entry = parts.get(part.toLowerCase());
    return entry ? readEntry(file, entry) : refuse('notDocument');
  };
  const has = (part: string) => parts.has(part.toLowerCase());
  const text = (part: string) => (has(part) ? decodeXml(bytes(part)) : undefined);
  const relationships = (part: string) => {
    const at = part.lastIndexOf('/');
    const xml = text(`${part.slice(0, at + 1)}_rels/${part.slice(at + 1)}.rels`);
    const out = new Map<string, OoxmlRelationship>();
    if (xml === undefined) return out;
    for (const r of childrenNamed(xmlTree(xml, limits), 'Relationship')) {
      const external = r.attrs['TargetMode'] === 'External';
      const target = external ? r.attrs['Target'] : resolveTarget(part, r.attrs['Target'] ?? '');
      if (target && r.attrs['Id']) out.set(r.attrs['Id'], { type: r.attrs['Type'] ?? '', target, ...(external && { external }) });
    }
    return out;
  };
  const main = (fallback: string) => {
    const named = [...relationships('').values()].find((r) => OFFICE_DOCUMENT.test(r.type))?.target;
    const part = named && has(named) ? named : fallback;
    return has(part) ? part : refuse('notDocument');
  };
  return { names: () => [...parts.keys()], has, bytes, text, relationships, main, sizeOf: (part) => parts.get(part.toLowerCase())?.declaredBytes ?? 0 };
}
