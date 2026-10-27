// Worked examples for refusals (api.md 38, 40): a refused item or body comes back with the shape
// that fits. Every example is read from the schema it belongs to (a write item form's `examples`,
// an operation's request `example`), never written here, so the refusal, the tool description and
// the docs show the same thing.
import type { OperationId } from '#format';
import { compileSchema } from './schema.ts';
import { SPECS } from './spec.ts';

type Rec = Record<string, any>;
export const WRITE_ITEM_ID = 'https://vision-board.invalid/schema/api/write-item.schema.json';

/** Every write item form by its `type`, with its schema (a reference's own, or the inline one). */
function forms(): Map<string, Rec> {
  const out = new Map<string, Rec>();
  for (const branch of (compileSchema(WRITE_ITEM_ID).schema as Rec).oneOf as Rec[]) {
    const form: Rec = typeof branch.$ref === 'string' ? (compileSchema(branch.$ref).schema as Rec) : branch;
    out.set(String(form.properties.type.const), form);
  }
  return out;
}

/** The ten item types, in the schema's order. */
export const itemTypes = (): string[] => [...forms().keys()];

/** A write item form's worked example, or undefined for a `type` that names no form. */
export const itemExample = (type: unknown): unknown => (typeof type === 'string' ? forms().get(type)?.examples?.[0] : undefined);

/** The `example` a refusal of this operation's body carries: its request example, when it has one. */
export const bodyExample = (id: OperationId): { example?: unknown } => {
  const example = SPECS[id].example;
  return example === undefined ? {} : { example };
};
