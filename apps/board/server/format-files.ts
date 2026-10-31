// The format's files the engine reads: every JSON Schema, openapi.json and the tool table. The one
// module that reads them from disk (`#format/files`, `#chat/files`), so the plugin build can swap it for
// the same three readers over the files' text put in at build time (apps/board/plugin/embedded-files.ts):
// the engine bundle then reads nothing from beside itself. The names and shapes here are the swap's contract.
import fs from 'node:fs';
import path from 'node:path';
import { CHAT_SCHEMA_DIR } from '#chat/files';
import { OPENAPI_FILE, SCHEMA_DIR, TOOLS_FILE } from '#format/files';

export type SchemaDoc = Record<string, unknown> & { $id: string };

/** Every schema file under `dir`, read with `fs`. */
export function schemaFiles(dir = SCHEMA_DIR): { file: string; schema: SchemaDoc }[] {
  const out: { file: string; schema: SchemaDoc }[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...schemaFiles(file));
    else if (entry.name.endsWith('.schema.json')) out.push({ file, schema: JSON.parse(fs.readFileSync(file, 'utf8')) });
  }
  return out.sort((a, b) => a.file.localeCompare(b.file));
}

/** Every schema the server knows: the format's and the chat package's. */
export const allSchemaFiles = (): { file: string; schema: SchemaDoc }[] => [...schemaFiles(), ...schemaFiles(CHAT_SCHEMA_DIR)];

/** openapi.json, parsed. */
export const openapiDoc = (): Record<string, any> => JSON.parse(fs.readFileSync(OPENAPI_FILE, 'utf8'));

/** The tool table's rows (tools.generated.json in `#format`), parsed. */
export const toolRows = (): unknown[] => (JSON.parse(fs.readFileSync(TOOLS_FILE, 'utf8')) as { tools: unknown[] }).tools;
