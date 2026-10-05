// Finds the inputs an agent would meet with no explanation (api.md 1, 55): every schema property
// reachable from an operation's parameters or JSON body that has no `description` of its own, on
// its `$ref` target, or on an `allOf` part. gen-api.test.mjs fails on any, so `vb` help, MCP tool
// schemas and the API reference explain every field.
import { METHODS, lookup, resolveParam } from './openapi-refs.mjs';

const isObj = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);

/** True when a schema explains itself: its own description, its `$ref` target's, or an `allOf` part's. */
function described(schema, doc, schemas, depth = 0) {
  if (!isObj(schema) || depth > 20) return false;
  if (typeof schema.description === 'string' && schema.description.trim()) return true;
  if (schema.$ref && described(...Object.values(lookup(schema.$ref, doc, schemas)), schemas, depth + 1)) return true;
  return (schema.allOf ?? []).some((part) => described(part, doc, schemas, depth + 1));
}

/** Where a schema is declared, for a message: `<$id or spec>#<pointer>`. */
const where = (doc, pointer) => `${doc.$id ?? 'openapi.json'}#${pointer}`;

/** Every property reachable from `schema` that has no description, as `<schema>#<pointer>` strings.
 * It follows `$ref`, `allOf`, `oneOf`, `anyOf`, `items` and `properties`, not `if`/`then`/`else`
 * (those only restate a property its base schema already declares). */
export function undescribedIn(schema, doc, schemas, pointer = '', seen = new Set(), out = new Set()) {
  if (!isObj(schema)) return out;
  const key = `${doc.$id ?? ''}|${pointer}|${JSON.stringify(schema).length}`;
  if (seen.has(key)) return out;
  seen.add(key);
  if (schema.$ref) {
    const target = lookup(schema.$ref, doc, schemas);
    const fragment = schema.$ref.includes('#') ? schema.$ref.slice(schema.$ref.indexOf('#') + 1) : '';
    undescribedIn(target.schema, target.doc, schemas, fragment, seen, out);
  }
  (schema.allOf ?? []).forEach((part, i) => undescribedIn(part, doc, schemas, `${pointer}/allOf/${i}`, seen, out));
  for (const k of ['oneOf', 'anyOf']) (schema[k] ?? []).forEach((part, i) => undescribedIn(part, doc, schemas, `${pointer}/${k}/${i}`, seen, out));
  if (isObj(schema.items)) undescribedIn(schema.items, doc, schemas, `${pointer}/items`, seen, out);
  for (const [name, prop] of Object.entries(schema.properties ?? {})) {
    if (name === 'type' && isObj(prop) && 'const' in prop) continue;
    if (!described(prop, doc, schemas)) out.add(where(doc, `${pointer}/properties/${name}`));
    undescribedIn(prop, doc, schemas, `${pointer}/properties/${name}`, seen, out);
  }
  return out;
}

/** The inputs of every operation (parameters and the JSON body) that lack a description. */
export function undescribedInputs(doc, schemas) {
  const out = new Set();
  for (const [route, item] of Object.entries(doc.paths ?? {})) {
    for (const method of METHODS.filter((m) => item[m])) {
      const op = item[method];
      for (const p of (op.parameters ?? []).map((x) => resolveParam(doc, x))) {
        if (!p.description && !described(p.schema ?? {}, doc, schemas)) out.add(`${op.operationId} parameter ${p.name} (${route})`);
      }
      const body = op.requestBody?.content?.['application/json']?.schema;
      if (body) undescribedIn(body, doc, schemas).forEach((w) => out.add(w));
    }
  }
  return [...out];
}

/** The fields of every success answer that lack a description (the top of each answer and all it holds). */
export function undescribedOutputs(doc, schemas) {
  const out = new Set();
  for (const item of Object.values(doc.paths ?? {})) {
    for (const op of METHODS.filter((m) => item[m]).map((m) => item[m])) {
      for (const [, r] of Object.entries(op.responses ?? {}).filter(([s]) => s.startsWith('2'))) {
        if (r.$ref) continue;
        for (const media of Object.values(r.content ?? {})) {
          const schema = media.schema ?? media.itemSchema;
          if (schema) undescribedIn(schema, doc, schemas).forEach((w) => out.add(w));
        }
      }
    }
  }
  return [...out];
}
