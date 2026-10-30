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

export interface OoxmlPackage {
  names(): string[];
  has(part: string): boolean;
  bytes(part: string): Uint8Array;
  /** The part as a text, or undefined when the archive has none. */
  text(part: string): string | undefined;
  /** The part's relationships by id: each target a part name inside the archive. External ones are left out. */
  relationships(part: string): Map<string, { type: string; target: string }>;
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
    const out = new Map<string, { type: string; target: string }>();
    if (xml === undefined) return out;
    for (const r of childrenNamed(xmlTree(xml, limits), 'Relationship')) {
      const target = r.attrs['TargetMode'] === 'External' ? undefined : resolveTarget(part, r.attrs['Target'] ?? '');
      if (target && r.attrs['Id']) out.set(r.attrs['Id'], { type: r.attrs['Type'] ?? '', target });
    }
    return out;
  };
  const main = (fallback: string) => {
    const named = [...relationships('').values()].find((r) => OFFICE_DOCUMENT.test(r.type))?.target;
    const part = named && has(named) ? named : fallback;
    return has(part) ? part : refuse('notDocument');
  };
  return { names: () => [...parts.keys()], has, bytes, text, relationships, main };
}
