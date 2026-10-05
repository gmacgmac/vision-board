# Vendored schemas

`oas-3.2-schema-2026-08-30.json`: the official JSON Schema for OpenAPI 3.2 documents (without Schema
Object validation). Source: https://spec.openapis.org/oas/3.2/schema/2026-08-30, fetched 2026-10-05 and
left as published. Licence: Apache-2.0 (OpenAPI Initiative). Used only by `apps/board/tests/openapi.test.ts`.
The name does not end in `.schema.json`, so the schema loader (`apps/board/server/schema.ts`) skips it.
