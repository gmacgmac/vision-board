// The rest of the API contract that code reads as values, from the one source (api.md 38-40, 114;
// cortex-architecture rule 4): the problem codes with their status and title, and `PROBLEM_BASE`,
// from problem.schema.json; the header that names the caller's folder and the default server, from
// openapi.json, with the prefix every route path starts with; and the words a refusal names each path parameter by. Written into
// operations.generated.ts by scripts/gen-api.mjs, so the server and the client hold no copy. Pure.
import { lookup, resolveParam } from './openapi-refs.mjs';
import { shape } from './schema-shape.mjs';

export const PROBLEM_ID = 'https://vision-board.invalid/schema/api/problem.schema.json';
export const LEDGER_EVENT_ID = 'https://vision-board.invalid/schema/ledger/18/ledger-event.schema.json';
export const WRITE_ITEM_ID = 'https://vision-board.invalid/schema/api/write-item.schema.json';
/** A field that names one card: a card number, or (sent) a number or `{ key }`. */
const ONE_CARD = /#\/\$defs\/(nodeNumber|nodeRef)$/;

/** How a refusal names each path parameter ("The board id in the path ..."): the generator's own
 * vocabulary, so a new path parameter fails `npm run gen` until it has words. */
export const PATH_WORDS = {
  board: 'board id', n: 'node number', region: 'region id', session: 'chat session id', approval: 'approval id', app: 'app id',
};

const unescape = (s) => s.replace(/\\(.)/g, '$1');

/** The problem codes (`$defs/codes`: status as `const`, and `title`) and the base every `type`
 * starts with (from `$defs/code`'s pattern). The pattern must list exactly the table's codes. */
export function problemsOf(schemas) {
  const schema = schemas.get(PROBLEM_ID);
  const table = schema?.$defs?.codes?.properties;
  if (!table) throw new Error('problem.schema.json: no $defs/codes table');
  const m = /^\^(.+)\(([a-z|-]+)\)\$$/.exec(schema.$defs.code?.pattern ?? '');
  if (!m) throw new Error('problem.schema.json: $defs/code pattern is not ^<base>(<codes>)$');
  const listed = m[2].split('|');
  const codes = Object.keys(table);
  if (listed.join() !== codes.join()) throw new Error(`problem.schema.json: $defs/code lists [${listed}], $defs/codes has [${codes}]`);
  const problems = Object.fromEntries(Object.entries(table).map(([code, row]) => {
    if (!Number.isInteger(row.const) || typeof row.title !== 'string') throw new Error(`problem.schema.json: code ${code} needs a status const and a title`);
    return [code, { status: row.const, title: row.title }];
  }));
  return { base: unescape(m[1]), problems };
}

/** The words for every path parameter the document uses; a parameter with none fails. */
export function pathWordsOf(doc) {
  const names = new Set();
  for (const item of Object.values(doc.paths ?? {})) {
    for (const op of Object.values(item)) {
      for (const p of (op?.parameters ?? []).map((x) => resolveParam(doc, x))) if (p.in === 'path') names.add(p.name);
    }
  }
  const missing = [...names].filter((n) => !(n in PATH_WORDS));
  if (missing.length) throw new Error(`path parameters with no words in gen-contract.mjs PATH_WORDS: ${missing.join(', ')}`);
  return Object.fromEntries([...names].map((n) => [n, PATH_WORDS[n]]));
}

/** The folder header's name (the one `in: header` parameter) and the default server (`servers[0]`). */
export function constantsOf(doc) {
  const headers = Object.values(doc.components?.parameters ?? {}).filter((p) => p.in === 'header').map((p) => p.name);
  if (headers.length !== 1) throw new Error(`openapi.json: expected one header parameter, found [${headers}]`);
  const server = doc.servers?.[0]?.url;
  const port = Number(/^http:\/\/127\.0\.0\.1:(\d+)$/.exec(server ?? '')?.[1]);
  if (!port) throw new Error(`openapi.json: servers[0].url must be http://127.0.0.1:<port>, not ${server}`);
  const prefix = '/api/';
  const outside = Object.keys(doc.paths ?? {}).filter((p) => !p.startsWith(prefix));
  if (outside.length) throw new Error(`openapi.json: every path starts with ${prefix}; these do not: ${outside.join(', ')}`);
  return { header: headers[0], server, port, prefix };
}

const q = (s) => JSON.stringify(s).replaceAll('"', "'");

/** The lines operations.generated.ts gains from this module. */
export function renderContract(doc, schemas) {
  const { base, problems } = problemsOf(schemas);
  const words = pathWordsOf(doc);
  const { header, server, port, prefix } = constantsOf(doc);
  return [
    '/** Every problem `type` is this plus its code (problem.schema.json `$defs/code`). */',
    `export const PROBLEM_BASE = ${q(base)};`,
    '',
    '/** Each problem code with its HTTP status and title (problem.schema.json `$defs/codes`). */',
    'export const PROBLEMS = {',
    ...Object.entries(problems).map(([code, p]) => `  ${/^[a-z]+$/.test(code) ? code : q(code)}: { status: ${p.status}, title: ${q(p.title)} },`),
    '} as const;',
    '',
    'export type ProblemCode = keyof typeof PROBLEMS;',
    '',
    '/** How a refusal names each path parameter: "The board id in the path ...". */',
    `export const PATH_WORDS: Readonly<Record<string, string>> = { ${Object.entries(words).map(([k, v]) => `${k}: ${q(v)}`).join(', ')} };`,
    '',
    '/** Every route\'s path starts with this; a client\'s transport takes the rest (a host mounts it elsewhere). */',
    `export const ROUTE_PREFIX = ${q(prefix)};`,
    '',
    '/** The header an agent\'s tools name their folder in (openapi.json, its one `in: header` parameter). */',
    `export const PROJECT_HEADER = ${q(header)};`,
    '',
    '/** The board server an agent\'s tools call when none is named, and its port (openapi.json `servers`). */',
    `export const DEFAULT_SERVER = ${q(server)};`,
    `export const DEFAULT_PORT = ${port};`,
  ];
}

const isObj = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);

/** `one` when `schema` names a card, `list` when it is a list of cards, else undefined. */
function cardKind(schema, doc, schemas, depth = 0) {
  if (!isObj(schema) || depth > 20) return undefined;
  if (typeof schema.$ref === 'string') {
    if (ONE_CARD.test(schema.$ref)) return 'one';
    const { schema: target, doc: there } = lookup(schema.$ref, doc, schemas);
    return cardKind(target, there, schemas, depth + 1);
  }
  if (schema.items !== undefined) return cardKind(schema.items, doc, schemas, depth + 1) === 'one' ? 'list' : undefined;
  return undefined;
}

/** The card fields of one form (a `$defs` entry): its own, and one level down in an object field. */
function fieldsOfForm(form, doc, schemas, out) {
  const add = (row) => { if (!out.some((r) => r.field === row.field && r.in === row.in)) out.push(row); };
  for (const [name, { schema, doc: home }] of Object.entries(shape(form, doc, schemas).properties)) {
    const kind = cardKind(schema, home, schemas);
    if (kind) { add({ field: name, ...(kind === 'list' && { list: true }) }); continue; }
    const inner = shape(schema, home, schemas).properties;
    for (const [sub, { schema: s2, doc: h2 }] of Object.entries(inner ?? {})) {
      const k2 = cardKind(s2, h2, schemas);
      if (k2) add({ field: sub, in: name, ...(k2 === 'list' && { list: true }) });
    }
  }
}

/** A branch of a `oneOf` of forms: the form, the document it is read in, and its `type` const. */
function formOf(branch, root, schemas, what) {
  const { schema, doc } = branch.$ref ? lookup(branch.$ref, root, schemas) : { schema: branch, doc: root };
  const type = shape(schema, doc, schemas).properties.type?.schema?.const;
  if (typeof type !== 'string') throw new Error(`${what}: a form needs a type const`);
  return { schema, doc, type };
}

/** For every ledger event type (ledger-event.schema.json, in its order), then every write item type
 * that is no event of its own (write-item.schema.json: `append`), the fields that name a card, in the
 * stored line and in the forms an agent or the person sends: `list` for a list of cards, `in` for a
 * field inside another (a region's `center`). The one card-reference table (api.md 125). */
export function cardFieldsOf(schemas) {
  const events = schemas.get(LEDGER_EVENT_ID);
  const items = schemas.get(WRITE_ITEM_ID);
  if (!events || !items) throw new Error('no ledger-event.schema.json or write-item.schema.json');
  const table = {};
  for (const branch of events.oneOf ?? []) {
    const { doc: file, type } = formOf(branch, events, schemas, branch.$ref);
    table[type] = [];
    for (const form of ['stored', 'sent']) if (file.$defs?.[form]) fieldsOfForm(file.$defs[form], file, schemas, table[type]);
  }
  for (const [i, branch] of (items.oneOf ?? []).entries()) {
    const { schema, doc, type } = formOf(branch, items, schemas, `write-item.schema.json oneOf/${i}`);
    fieldsOfForm(schema, doc, schemas, (table[type] ??= []));
  }
  return table;
}

/** The card-reference table's lines for operations.generated.ts. */
export function renderCardFields(schemas) {
  const row = (r) => `{ field: ${q(r.field)}${r.in ? `, in: ${q(r.in)}` : ''}${r.list ? ', list: true' : ''} }`;
  return [
    '/** A field of a ledger line, or of what is sent to make one, that names a card: by its number on its',
    ' * board in a request or an answer, by its identity on a stored line. `list`: a list of',
    ' * cards; `in`: the field sits inside that one (a region\'s `center`). */',
    'export interface CardField { readonly field: string; readonly in?: string; readonly list?: true }',
    '',
    '/** Every ledger event type\'s and write item type\'s card fields, from their schemas (stored and sent forms): the one table',
    ' * the server\'s edge, the write refs, the answers\' board numbers and the page read, both ways. */',
    'export const CARD_FIELDS: Readonly<Record<string, readonly CardField[]>> = {',
    ...Object.entries(cardFieldsOf(schemas)).map(([type, rows]) => `  ${/^[a-z]+$/.test(type) ? type : q(type)}: [${rows.map(row).join(', ')}],`),
    '};',
    '',
    '/** The card fields of a line or item of `type`; none for a type the table does not have. */',
    'export const cardFields = (type: unknown): readonly CardField[] =>',
    '  (typeof type === \'string\' && Object.hasOwn(CARD_FIELDS, type) ? CARD_FIELDS[type]! : []);',
  ];
}
