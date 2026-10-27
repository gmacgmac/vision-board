// The files of packages/format that Node code reads (`#format/files`, D-059): the schemas, the
// OpenAPI spec, the tool table and the fixture ledgers. Kept out of the front door (`#format`),
// which the page loads, so `node:url` never reaches the page bundle.
import { fileURLToPath } from 'node:url';

const here = (rel: string): string => fileURLToPath(new URL(rel, import.meta.url));

/** Every JSON Schema of the format (api.md 12), one folder. */
export const SCHEMA_DIR = here('../schema/');
/** The board API's OpenAPI spec: the one source of the routes (D-029). */
export const OPENAPI_FILE = here('../schema/openapi.json');
/** The agent tools' table, generated from the OpenAPI spec (`npm run gen`): the code that serves the tools reads it. */
export const TOOLS_FILE = here('./tools.generated.json');
/** The fixture ledgers (`<name>.ledger.jsonl`). */
export const FIXTURES_DIR = here('../fixtures/');
