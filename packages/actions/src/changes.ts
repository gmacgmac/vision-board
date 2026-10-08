// What changed between two versions of a card (proposals-seen-parking FE_02 ruling 4): per field,
// added, changed or removed, in a fixed order. A body that starts with the previous one is `added`,
// with the added text (an agent's `append`, api.md 95); any other new body is `changed`. The title's
// change carries what it now reads. The card's change chips read this. Pure.
import type { NodeBody } from '../../format/src/index.ts';

export type ChangeField = 'title' | 'body' | 'tags' | 'kind' | 'item' | 'size' | 'container';
export type Change = 'added' | 'changed' | 'removed';

/** One field's change; `text`: a body's added text, or the title as it now reads. */
export interface FieldChange { field: ChangeField; change: Change; text?: string }

/** A field's value as compared: absent when the version has none (an empty tag list, `item` false). */
const VALUE: Record<ChangeField, (b: NodeBody) => string | undefined> = {
  title: (b) => b.title,
  body: (b) => b.body || undefined,
  tags: (b) => (b.tags?.length ? JSON.stringify(b.tags) : undefined),
  kind: (b) => b.kind,
  item: (b) => (b.item ? 'item' : undefined),
  size: (b) => b.size,
  container: (b) => b.region,
};

/** The changes from `prev` (none: a new card) to `next`. */
export function versionChanges(prev: NodeBody | undefined, next: NodeBody): FieldChange[] {
  return (Object.keys(VALUE) as ChangeField[]).flatMap((field): FieldChange[] => {
    const [a, b] = [prev && VALUE[field](prev), VALUE[field](next)];
    if (a === b) return [];
    if (b === undefined) return [{ field, change: 'removed' }];
    const text = field === 'title' ? b : field === 'body' && (a === undefined || b.startsWith(a)) ? b.slice(a?.length ?? 0).trim() : undefined;
    const change: Change = a === undefined || (field === 'body' && text !== undefined) ? 'added' : 'changed';
    return [{ field, change, ...(text !== undefined && { text }) }];
  });
}
