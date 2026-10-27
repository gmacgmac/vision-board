// The files of packages/chat that Node code reads (`#chat/files`, D-059). Kept out of the front
// door (`#chat`), which the page loads, so `node:url` never reaches the page bundle.
import { fileURLToPath } from 'node:url';

/** The chat's own schemas (D-037), which openapi.json references by `$id`. */
export const CHAT_SCHEMA_DIR = fileURLToPath(new URL('../schema/', import.meta.url));
