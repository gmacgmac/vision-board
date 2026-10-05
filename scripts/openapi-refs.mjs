// Shared by the generators (scripts/gen-api.mjs, scripts/gen-mcp.mjs): the HTTP methods an
// OpenAPI path item can hold, and how a `$ref` is followed, to a component parameter or to a
// schema by its `$id` (api.md 5).
export const METHODS = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace', 'query'];

/** A parameter, or the component parameter its `$ref` names. */
export function resolveParam(doc, p) {
  if (!p.$ref) return p;
  const name = p.$ref.replace('#/components/parameters/', '');
  if (!p.$ref.startsWith('#/components/parameters/') || !doc.components?.parameters?.[name]) throw new Error(`unresolved parameter ${p.$ref}`);
  return doc.components.parameters[name];
}

/** The schema a `$ref` names, with the document it lives in (for refs relative to it). */
export function lookup(ref, doc, schemas) {
  const [base, pointer = ''] = ref.split('#');
  const target = base ? schemas.get(base) : doc;
  if (!target) throw new Error(`unresolved schema ${ref}`);
  let node = target;
  for (const part of pointer.split('/').filter(Boolean)) node = node?.[part.replace(/~1/g, '/').replace(/~0/g, '~')];
  if (node === undefined) throw new Error(`unresolved schema ${ref}`);
  return { schema: node, doc: target };
}
